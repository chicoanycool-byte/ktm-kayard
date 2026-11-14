import { NextResponse } from "next/server";
import { consultarRuta, mejorNodo, nodosDeEstado, partirPoblacion } from "@/lib/sict";

export const maxDuration = 60;

// GET /api/ruta?estado=14  → puntos de la red federal de ese estado
export async function GET(req: Request) {
  const estado = Number(new URL(req.url).searchParams.get("estado"));
  if (!estado) return NextResponse.json({ ok: false, error: "Falta el estado" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, nodos: await nodosDeEstado(estado) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 502 });
  }
}

// POST /api/ruta → km y casetas oficiales
// { origen: "El Salto, Jalisco", destino: "Tepatitlán, Jalisco", vehiculo: "12", nodoOrigen?, nodoDestino? }
export async function POST(req: Request) {
  try {
    const { origen, destino, vehiculo, nodoOrigen, nodoDestino } = await req.json();
    const o = partirPoblacion(String(origen || "")), d = partirPoblacion(String(destino || ""));
    if (!o.estado || !d.estado) return NextResponse.json({ ok: false, error: "No reconocí el estado del origen o del destino" }, { status: 400 });

    const [no, nd] = await Promise.all([nodosDeEstado(o.estado), nodosDeEstado(d.estado)]);
    const po = nodoOrigen ? no.find((n) => n.codigo === nodoOrigen) : mejorNodo(o.municipio, no);
    const pd = nodoDestino ? nd.find((n) => n.codigo === nodoDestino) : mejorNodo(d.municipio, nd);
    if (!po || !pd) {
      return NextResponse.json({
        ok: false, requiere_punto: true,
        error: `La red federal de la SICT no tiene ${!po ? o.municipio : d.municipio}. Elige el punto más cercano.`,
        estadoOrigen: o.estado, estadoDestino: d.estado, nodosOrigen: no, nodosDestino: nd,
        sugerenciaOrigen: po?.codigo || null, sugerenciaDestino: pd?.codigo || null,
      }, { status: 200 });
    }

    const ruta = await consultarRuta({ edoOrigen: o.estado, ciudadOrigen: po.codigo, edoDestino: d.estado, ciudadDestino: pd.codigo, vehiculo: String(vehiculo || "12") });
    const exacto = { origen: po.nombre, destino: pd.nombre };
    return NextResponse.json({
      ok: true, ...ruta, punto: exacto,
      aproximado: !(no.length && mejorNodoExacto(o.municipio, po.nombre) && mejorNodoExacto(d.municipio, pd.nombre)),
      fuente: "SICT · Rutas punto a punto (Traza tu ruta)",
      estadoOrigen: o.estado, estadoDestino: d.estado, nodosOrigen: no, nodosDestino: nd,
      nodoOrigen: po.codigo, nodoDestino: pd.codigo,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error al consultar la SICT" }, { status: 502 });
  }
}

// ¿el punto usado es realmente el municipio pedido?
function mejorNodoExacto(municipio: string, nodo: string) {
  const n = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/^t\s+/, "").replace(/[^a-z0-9]/g, "");
  return n(municipio) === n(nodo);
}
