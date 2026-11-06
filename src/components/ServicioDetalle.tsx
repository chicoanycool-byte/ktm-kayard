"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ESTATUS_INFO, type Estatus } from "@/lib/constants";
import { fecha, fechaHora, hora } from "@/lib/format";
import { linkWhatsApp, msgCliente, msgOperador, msgProveedor } from "@/lib/whatsapp";
import { descargarFoto, descargarTodas, nombresFotos } from "@/lib/fotos";
import { bitacoraExcel, bitacoraPDF } from "@/lib/bitacora";
import { Btn, C, Dato, EstatusBadge, Modal, Seccion } from "./ui";

export type ServicioV = Record<string, any> & { id: string; id_track: string; estatus: string; token_operador: string };

export function linkOperador(token: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/operador/${token}`;
}

export function urlEvidencia(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/evidencias/${path}`;
}

export default function ServicioDetalle({ s, onClose, acciones }: { s: ServicioV; onClose: () => void; acciones?: React.ReactNode }) {
  const [bitacora, setBitacora] = useState<any[]>([]);
  const [evidencias, setEvidencias] = useState<any[]>([]);
  const [bajando, setBajando] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("v_bitacora").select("*").eq("servicio_id", s.id).order("created_at").then(({ data }) => setBitacora(data || []));
    supabase.from("evidencias").select("*").eq("servicio_id", s.id).order("created_at").then(({ data }) => setEvidencias(data || []));
  }, [s.id]);

  const g = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.85rem" } as const;

  return (
    <Modal titulo={`Servicio ${s.id_track}`} onClose={onClose} ancho={820}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <EstatusBadge estatus={s.estatus} />
        {s.estatus_facturacion === "facturado" && <span style={{ padding: "0.2rem 0.65rem", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "rgba(34,197,94,0.2)", color: C.green }}>FACTURADO{s.enviado_facturar_at ? ` · ${fecha(s.enviado_facturar_at)}` : ""}</span>}
        <span style={{ color: C.muted, fontSize: 12 }}>Alta: {fechaHora(s.created_at)}</span>
      </div>
      <div style={g}>
        <Seccion titulo="Datos generales" />
        <Dato label="Cliente" valor={s.cliente} />
        <Dato label="Tipo de unidad" valor={s.tipo_unidad} />
        <Dato label="Tipo de carga" valor={s.tipo_carga} />
        <Dato label="Origen" valor={s.origen} />
        <Dato label="Fecha de carga" valor={fecha(s.fecha_carga)} />
        <Dato label="Destino" valor={s.destino} />
        <Dato label="Fecha de descarga" valor={fecha(s.fecha_descarga)} />
        <Seccion titulo="Carga" />
        <Dato label="Cliente de carga" valor={s.cliente_carga} />
        <Dato label="Cita" valor={hora(s.cita_carga)} />
        <Dato label="Domicilio" valor={[s.carga_domicilio, s.carga_colonia, s.carga_cp && `CP ${s.carga_cp}`].filter(Boolean).join(", ")} />
        <Seccion titulo="Descarga" />
        <Dato label="Cliente de descarga" valor={s.cliente_descarga} />
        <Dato label="Cita" valor={hora(s.cita_descarga)} />
        <Dato label="Domicilio" valor={[s.descarga_domicilio, s.descarga_colonia, s.descarga_cp && `CP ${s.descarga_cp}`].filter(Boolean).join(", ")} />
        <Seccion titulo="Requerimientos" />
        <Dato label="Fumigación" valor={s.req_fumigacion} />
        <Dato label="GPS" valor={s.req_gps} />
        <Dato label="Cuenta espejo" valor={s.req_cuenta_espejo} />
        <Dato label="Póliza de seguro" valor={s.req_poliza_seguro} />
        <Dato label="SUA" valor={s.req_sua} />
        <Dato label="Comentarios" valor={s.comentarios} />
        <Seccion titulo="Transporte" />
        <Dato label="Línea de transporte" valor={s.proveedor} />
        <Dato label="Operador" valor={s.operador} />
        <Dato label="Teléfono operador" valor={s.operador_telefono} />
        <Dato label="Placas unidad" valor={s.placas_unidad} />
        <Dato label="Económico unidad" valor={s.economico_unidad} />
        <Dato label="Placas caja" valor={s.placas_caja} />
        <Dato label="Económico caja" valor={s.economico_caja} />
        <Dato label="Folio licencia" valor={s.folio_licencia} />
        {s.ultima_lat && (
          <Dato label="Última ubicación" valor={<a href={`https://maps.google.com/?q=${s.ultima_lat},${s.ultima_lng}`} target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>Ver en mapa</a>} />
        )}
      </div>

      {evidencias.length > 0 && (() => {
        const fotos = [...evidencias].sort((a, b) => (a.tipo === "documentos" ? 0 : 1) - (b.tipo === "documentos" ? 0 : 1) || a.created_at.localeCompare(b.created_at));
        const nombres = nombresFotos(s.id_track, fotos);
        const bajar = async (clave: string, fn: () => Promise<void>) => {
          setBajando(clave);
          try { await fn(); } catch (err) { alert((err as Error).message); } finally { setBajando(""); }
        };
        return (
          <>
            <div style={{ marginTop: 16, display: "flex", alignItems: "flex-end", gap: 10 }}>
              <div style={{ flex: 1 }}><Seccion titulo={`Fotos del operador (${fotos.length})`} /></div>
              <Btn small variante="secundario" disabled={!!bajando} onClick={() => bajar("todas", () => descargarTodas(s.id_track, fotos))}>
                {bajando === "todas" ? "Preparando…" : `⬇ Descargar todas (.zip)`}
              </Btn>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              {fotos.map((e, i) => (
                <div key={e.id} style={{ width: 120 }}>
                  <a href={urlEvidencia(e.foto_path)} target="_blank" rel="noopener noreferrer" title="Ver en grande">
                    <div style={{ position: "relative" }}>
                      <img src={urlEvidencia(e.foto_path)} alt="evidencia" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8, border: `1px solid ${e.tipo === "documentos" ? "#FACC15" : C.line}` }} />
                      {e.tipo === "documentos" && <span style={{ position: "absolute", left: 4, bottom: 4, background: "#FACC15", color: "#0A1628", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4 }}>DOCUMENTO</span>}
                    </div>
                  </a>
                  <p style={{ margin: "4px 0", fontSize: 10, color: C.muted }}>{fechaHora(e.created_at)}</p>
                  <button disabled={!!bajando} onClick={() => bajar(e.id, () => descargarFoto(e.foto_path, nombres[i]))}
                    style={{ width: "100%", background: "transparent", border: `1px solid ${C.line}`, color: C.amber, borderRadius: 6, fontSize: 11, padding: "3px 0", cursor: "pointer" }}>
                    {bajando === e.id ? "Bajando…" : "⬇ Descargar"}
                  </button>
                </div>
              ))}
            </div>
          </>
        );
      })()}

      <div style={{ marginTop: 16 }}><Seccion titulo="Bitácora de estatus" /></div>
      {bitacora.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <Btn small variante="secundario" onClick={() => bitacoraExcel(bitacora, `Bitacora_${s.id_track}`)}>⬇ Excel</Btn>
          <Btn small variante="secundario" onClick={() => bitacoraPDF(bitacora, `${s.id_track} · ${s.cliente} · ${s.origen || "—"} → ${s.destino || "—"}`, `Bitacora_${s.id_track}`)}>⬇ PDF</Btn>
        </div>
      )}
      <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
        {bitacora.map((b) => (
          <div key={b.id} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12, color: C.text }}>
            <span style={{ color: C.muted, minWidth: 110 }}>{fechaHora(b.created_at)}</span>
            <span style={{ color: ESTATUS_INFO[b.estatus as Estatus]?.color }}>{ESTATUS_INFO[b.estatus as Estatus]?.label || b.estatus}</span>
            {b.origen === "operador" && <span style={{ color: C.muted }}>· por el operador</span>}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
        <Btn small variante="verde" href={linkWhatsApp(s.cliente_telefono, msgCliente(s))} target="_blank">WhatsApp cliente</Btn>
        {s.proveedor && <Btn small variante="verde" href={linkWhatsApp(s.proveedor_telefono, msgProveedor(s))} target="_blank">WhatsApp transportista</Btn>}
        {s.operador && <Btn small variante="verde" href={linkWhatsApp(s.operador_telefono, msgOperador(s, linkOperador(s.token_operador)))} target="_blank">WhatsApp operador</Btn>}
        {s.proveedor && <Btn small variante="secundario" onClick={() => navigator.clipboard.writeText(linkOperador(s.token_operador))}>Copiar link del operador</Btn>}
        {acciones}
      </div>
    </Modal>
  );
}
