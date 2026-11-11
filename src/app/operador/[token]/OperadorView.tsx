"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fecha, fechaHora, hora } from "@/lib/format";
import { urlEvidencia } from "@/components/ServicioDetalle";
import { C, EstatusBadge } from "@/components/ui";

type Info = Record<string, any> & { evidencias: { path: string; fecha: string; tipo?: string }[] };

const PASOS = [
  { estatus: "llegada_carga", label: "Llegué a cargar", color: "#FB923C" },
  { estatus: "en_transito", label: "Salí en tránsito", color: "#5BA3D9" },
  { estatus: "llegada_descarga", label: "Llegué a descargar", color: "#A78BFA" },
  { estatus: "entrega_documentos", label: "Entrega de documentos", color: "#FACC15" },
  { estatus: "finalizado", label: "Finalizar viaje", color: "#22C55E" },
];
const ORDEN = ["programado", "asignado", "llegada_carga", "en_transito", "llegada_descarga", "entrega_documentos", "finalizado"];

function ubicacion(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res(null), { enableHighAccuracy: true, timeout: 10000 });
  });
}

export default function OperadorView({ token }: { token: string }) {
  const supabase = createClient();
  const [info, setInfo] = useState<Info | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.rpc("operador_servicio", { p_token: token });
    setInfo(data as Info | null);
    setCargando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { cargar(); }, [cargar]);

  async function avanzar(estatus: string) {
    if (estatus === "finalizado" && !confirm("¿Confirmas que ya entregaste la mercancía?")) return;
    setOcupado(true);
    setMsg("Obteniendo ubicación…");
    const u = await ubicacion();
    const { error } = await supabase.rpc("operador_actualizar", { p_token: token, p_estatus: estatus, p_lat: u?.lat ?? null, p_lng: u?.lng ?? null });
    setOcupado(false);
    setMsg(error ? `No se pudo actualizar: ${error.message}` : "Estatus actualizado ✔");
    cargar();
  }

  async function subirFotos(files: FileList | null, tipo: "evidencia" | "documentos" = "evidencia") {
    if (!files?.length) return;
    setOcupado(true);
    let ok = 0;
    for (const f of Array.from(files)) {
      setMsg(`Subiendo foto ${ok + 1} de ${files.length}…`);
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${token}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const up = await supabase.storage.from("evidencias").upload(path, f, { contentType: f.type || "image/jpeg" });
      if (up.error) { setMsg(`Error al subir: ${up.error.message}`); continue; }
      const r = await supabase.rpc("operador_evidencia", { p_token: token, p_path: path, p_tipo: tipo });
      if (!r.error) ok++;
    }
    setOcupado(false);
    setMsg(`${ok} foto(s) subida(s) ✔`);
    cargar();
  }

  const caja = { background: C.card, borderRadius: 12, padding: "1rem", marginBottom: 12 } as const;
  const fila = (l: string, v: any) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
      <span style={{ color: C.muted, fontSize: 13 }}>{l}</span>
      <span style={{ color: "white", fontSize: 13, textAlign: "right" }}>{v || "—"}</span>
    </div>
  );

  if (cargando) return <div style={{ minHeight: "100vh", background: C.bg, color: C.muted, padding: 24, fontFamily: "system-ui" }}>Cargando…</div>;
  if (!info) return <div style={{ minHeight: "100vh", background: C.bg, color: "white", padding: 24, fontFamily: "system-ui" }}>Este link no es válido o el servicio ya no está disponible.</div>;

  const idx = ORDEN.indexOf(info.estatus);
  const cerrado = ["finalizado", "cancelado"].includes(info.estatus);
  const fotosDocs = info.evidencias.filter((e) => e.tipo === "documentos");
  const esperandoDocs = info.estatus === "entrega_documentos";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "system-ui, sans-serif", padding: "1rem", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ background: "#E8F0F7", borderRadius: 8, padding: "4px 8px" }}><img src="/logo-kayard.png" alt="Kayard" style={{ height: 32 }} /></div>
        <EstatusBadge estatus={info.estatus} />
      </div>
      <h1 style={{ color: "white", fontSize: 20, margin: "0 0 4px" }}>Tu servicio asignado</h1>
      <p style={{ color: C.amber, fontSize: 24, fontWeight: 800, margin: "0 0 12px" }}>{info.id_track}</p>

      {!cerrado && (
        <div style={caja}>
          <p style={{ color: "white", fontWeight: 700, marginTop: 0 }}>Actualiza tu estatus</p>
          <div style={{ display: "grid", gap: 8 }}>
            {PASOS.map((p) => {
              const hecho = ORDEN.indexOf(p.estatus) <= idx;
              return (
                <button key={p.estatus} disabled={ocupado || hecho || info.estatus === "programado" || (p.estatus === "finalizado" && fotosDocs.length === 0)} onClick={() => avanzar(p.estatus)}
                  style={{ padding: "0.9rem", borderRadius: 10, border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer",
                    background: hecho ? "rgba(255,255,255,.08)" : p.color, color: hecho ? C.muted : "#0A1628", opacity: ocupado ? 0.6 : 1 }}>
                  {hecho ? "✔ " : ""}{p.label}
                </button>
              );
            })}
          </div>
          {esperandoDocs && (
            <div style={{ marginTop: 12, padding: "0.9rem", borderRadius: 10, background: "rgba(250,204,21,0.1)", border: "1px solid #FACC15" }}>
              <p style={{ color: "#FACC15", fontWeight: 700, margin: "0 0 6px" }}>Fotos de los documentos ({fotosDocs.length})</p>
              <p style={{ color: C.text, fontSize: 13, margin: "0 0 10px" }}>Toma foto de cada documento de entrega (sellados/firmados). Se abre la cámara; puedes repetir para agregar más. Necesitas al menos una para finalizar el viaje.</p>
              <label style={{ display: "block", padding: "0.9rem", borderRadius: 10, background: "#FACC15", color: "#0A1628", textAlign: "center", fontWeight: 800, cursor: "pointer" }}>
                📷 Tomar foto de documento
                <input type="file" accept="image/*" capture="environment" hidden disabled={ocupado}
                  onChange={(e) => { subirFotos(e.target.files, "documentos"); e.target.value = ""; }} />
              </label>
              {fotosDocs.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {fotosDocs.map((e) => <img key={e.path} src={urlEvidencia(e.path)} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6 }} />)}
                </div>
              )}
            </div>
          )}
          <label style={{ display: "block", marginTop: 12, padding: "0.9rem", borderRadius: 10, border: `2px dashed ${C.amber}`, color: C.amber, textAlign: "center", fontWeight: 700, cursor: "pointer" }}>
            📷 Tomar / subir fotos de evidencia
            <input type="file" accept="image/*" capture="environment" multiple hidden disabled={ocupado} onChange={(e) => { subirFotos(e.target.files); e.target.value = ""; }} />
          </label>
          {msg && <p style={{ color: C.text, fontSize: 13, marginBottom: 0 }}>{msg}</p>}
        </div>
      )}

      <div style={caja}>
        <p style={{ color: C.amber, fontWeight: 700, fontSize: 12, marginTop: 0 }}>CARGA</p>
        {fila("Lugar", info.cliente_carga)}
        {fila("Domicilio", [info.carga_domicilio, info.carga_colonia, info.carga_cp && `CP ${info.carga_cp}`].filter(Boolean).join(", "))}
        {fila("Población", info.origen)}
        {fila("Fecha / cita", `${fecha(info.fecha_carga)} ${hora(info.cita_carga)}`)}
        {info.carga_ubicacion && <a href={info.carga_ubicacion} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, fontSize: 13 }}>Abrir ubicación</a>}
      </div>
      <div style={caja}>
        <p style={{ color: C.amber, fontWeight: 700, fontSize: 12, marginTop: 0 }}>DESCARGA</p>
        {fila("Lugar", info.cliente_descarga)}
        {fila("Domicilio", [info.descarga_domicilio, info.descarga_colonia, info.descarga_cp && `CP ${info.descarga_cp}`].filter(Boolean).join(", "))}
        {fila("Población", info.destino)}
        {fila("Fecha / cita", `${fecha(info.fecha_descarga)} ${hora(info.cita_descarga)}`)}
        {info.descarga_ubicacion && <a href={info.descarga_ubicacion} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, fontSize: 13 }}>Abrir ubicación</a>}
      </div>
      <div style={caja}>
        <p style={{ color: C.amber, fontWeight: 700, fontSize: 12, marginTop: 0 }}>SERVICIO</p>
        {fila("Cliente", info.cliente)}
        {fila("Tipo de unidad", info.tipo_unidad)}
        {fila("Tipo de carga", info.tipo_carga)}
        {fila("Fumigación", info.req_fumigacion)}
        {fila("GPS", info.req_gps)}
        {fila("Cuenta espejo", info.req_cuenta_espejo)}
        {fila("SUA", info.req_sua)}
        {fila("Comentarios", info.comentarios)}
      </div>
      <div style={caja}>
        <p style={{ color: C.amber, fontWeight: 700, fontSize: 12, marginTop: 0 }}>TRANSPORTE</p>
        {fila("Línea", info.proveedor)}
        {fila("Operador", info.operador)}
        {fila("Placas unidad", info.placas_unidad)}
        {fila("Económico", info.economico_unidad)}
        {fila("Placas caja", info.placas_caja)}
      </div>
      {info.evidencias.length > 0 && (
        <div style={caja}>
          <p style={{ color: C.amber, fontWeight: 700, fontSize: 12, marginTop: 0 }}>EVIDENCIAS</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {info.evidencias.map((e) => (
              <a key={e.path} href={urlEvidencia(e.path)} target="_blank" rel="noopener noreferrer" title={(e.tipo === "documentos" ? "Documento · " : "") + fechaHora(e.fecha)}>
                <img src={urlEvidencia(e.path)} alt="" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8 }} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
