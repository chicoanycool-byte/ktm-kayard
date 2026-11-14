import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS_SICT, VEHICULO_SICT, estadoSict, mejorPunto, municipio, puntosDeEstado, rutaSict, type PuntoSict } from "@/lib/sict";

export const maxDuration = 60;

type Pob = { id: string; nombre: string; lat: number | null; lon: number | null; sict_estado: number | null; sict_id: string | null; sict_nombre: string | null };

// Coordenadas de la población con OpenStreetMap (se guardan para no volver a consultarlas)
async function coordenadas(p: Pob) {
  if (p.lat != null && p.lon != null) return { lat: Number(p.lat), lon: Number(p.lon) };
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(p.nombre + ", México")}&format=jsonv2&limit=1`;
  const r = await fetch(url, { headers: { "user-agent": "KTM-Kayard/1.0 (cotizador de transporte)" }, next: { revalidate: 2592000 } });
  if (!r.ok) return null;
  const j = await r.json();
  if (!j?.[0]) return null;
  return { lat: Number(j[0].lat), lon: Number(j[0].lon) };
}

// Kilómetros reales por carretera (OSRM, datos de OpenStreetMap)
async function kmCarretera(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`, { next: { revalidate: 604800 } });
  if (!r.ok) return null;
  const j = await r.json();
  const ruta = j?.routes?.[0];
  if (!ruta) return null;
  return { km: Math.round((ruta.distance / 1000) * 10) / 10, horas: Math.round((ruta.duration / 3600) * 10) / 10 };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sin sesión" }, { status: 401 });

  const { origenId, destinoId, unidad } = await req.json();
  if (!origenId || !destinoId) return NextResponse.json({ ok: false, error: "Falta origen o destino" }, { status: 400 });

  const { data: pobs } = await supabase.from("poblaciones").select("id, nombre, lat, lon, sict_estado, sict_id, sict_nombre").in("id", [origenId, destinoId]);
  const origen = (pobs || []).find((p) => p.id === origenId) as Pob | undefined;
  const destino = (pobs || []).find((p) => p.id === destinoId) as Pob | undefined;
  if (!origen || !destino) return NextResponse.json({ ok: false, error: "No encontré las poblaciones" }, { status: 404 });

  const resultado: {
    ok: boolean; km: number | null; horas: number | null; casetas: number | null;
    fuente_km: string; fuente_casetas: string; vehiculo?: string; tramos?: unknown[]; km_sict?: number;
    puntos?: { extremo: "origen" | "destino"; poblacion: string; estado: number; estado_nombre: string; sugerido: PuntoSict | null; opciones: PuntoSict[] }[];
    aviso?: string;
  } = { ok: true, km: null, horas: null, casetas: null, fuente_km: "", fuente_casetas: "" };

  // 1) Kilómetros exactos entre las dos poblaciones
  try {
    const [a, b] = await Promise.all([coordenadas(origen), coordenadas(destino)]);
    if (a && b) {
      if (origen.lat == null) await supabase.from("poblaciones").update({ lat: a.lat, lon: a.lon }).eq("id", origen.id);
      if (destino.lat == null) await supabase.from("poblaciones").update({ lat: b.lat, lon: b.lon }).eq("id", destino.id);
      const ruta = await kmCarretera(a, b);
      if (ruta) { resultado.km = ruta.km; resultado.horas = ruta.horas; resultado.fuente_km = "Ruta por carretera (OpenStreetMap), de población a población"; }
    }
  } catch { /* si falla, quedan los km a mano */ }

  // 2) Casetas con la SICT, usando el punto del catálogo que corresponde a cada población
  const faltantes: NonNullable<typeof resultado.puntos> = [];
  const resolver = async (p: Pob, extremo: "origen" | "destino") => {
    const edo = p.sict_estado ?? estadoSict(p.nombre);
    if (!edo) return null;
    if (p.sict_id) return { edo, id: p.sict_id, nombre: p.sict_nombre || "" };
    const opciones = await puntosDeEstado(edo);
    const sugerido = mejorPunto(municipio(p.nombre), opciones);
    if (sugerido) {
      await supabase.from("poblaciones").update({ sict_estado: edo, sict_id: sugerido.id, sict_nombre: sugerido.nombre }).eq("id", p.id);
      return { edo, id: sugerido.id, nombre: sugerido.nombre };
    }
    faltantes.push({ extremo, poblacion: p.nombre, estado: edo, estado_nombre: ESTADOS_SICT[edo], sugerido: null, opciones });
    return null;
  };

  try {
    const [a, b] = await Promise.all([resolver(origen, "origen"), resolver(destino, "destino")]);
    if (a && b) {
      const veh = VEHICULO_SICT[unidad as string] || VEHICULO_SICT.trailer;
      const r = await rutaSict(a.edo, a.id, b.edo, b.id, veh.codigo);
      resultado.casetas = r.casetas;
      resultado.km_sict = r.km;
      resultado.vehiculo = r.vehiculo || veh.etiqueta;
      resultado.tramos = r.tramos;
      resultado.fuente_casetas = `SICT · ${r.vehiculo || veh.etiqueta} · ${a.nombre} → ${b.nombre}`;
      if (resultado.km == null) { resultado.km = r.km; resultado.fuente_km = `SICT · ${a.nombre} → ${b.nombre}`; }
      const distintos = (a.nombre && municipio(origen.nombre) !== a.nombre) || (b.nombre && municipio(destino.nombre) !== b.nombre);
      if (distintos) resultado.aviso = `Las casetas se calcularon de ${a.nombre} a ${b.nombre}, que son los puntos de la SICT más parecidos a tu ruta.`;
    } else if (faltantes.length) {
      resultado.puntos = faltantes;
      resultado.aviso = "Elige el punto de la SICT más cercano para calcular las casetas.";
    }
  } catch (e) {
    resultado.aviso = `No se pudieron calcular las casetas: ${e instanceof Error ? e.message : "error"}`;
  }

  if (resultado.km == null && resultado.casetas == null) {
    return NextResponse.json({ ok: false, error: resultado.aviso || "No se pudo consultar la ruta" }, { status: 502 });
  }
  return NextResponse.json(resultado);
}

// Guarda el punto de la SICT que el usuario eligió para una población
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sin sesión" }, { status: 401 });
  const { poblacionId, estado, sictId, sictNombre } = await req.json();
  const { error } = await supabase.from("poblaciones").update({ sict_estado: estado, sict_id: sictId, sict_nombre: sictNombre }).eq("id", poblacionId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
