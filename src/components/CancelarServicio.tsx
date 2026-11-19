"use client";
import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Btn, C, Campo, Modal, inputStyle } from "@/components/ui";

const MOTIVOS = [
  "El cliente canceló el servicio",
  "El cliente reprogramó la carga",
  "No hubo producto para cargar",
  "No hubo unidad disponible",
  "Se duplicó el registro",
];

// Cancela el servicio y deja el motivo escrito en la bitácora
export async function cancelarServicio(supabase: SupabaseClient, servicioId: string, motivo: string) {
  const { error } = await supabase.from("servicios").update({ estatus: "cancelado" }).eq("id", servicioId);
  if (error) return error.message;
  const texto = motivo.trim();
  if (texto) {
    const { data } = await supabase.from("servicio_estatus").select("id")
      .eq("servicio_id", servicioId).eq("estatus", "cancelado")
      .order("created_at", { ascending: false }).limit(1);
    if (data?.[0]) await supabase.from("servicio_estatus").update({ comentario: texto }).eq("id", data[0].id);
  }
  return null;
}

// Quita la cancelación: regresa al estatus que corresponde según tenga o no transporte asignado
export async function reactivarServicio(supabase: SupabaseClient, servicioId: string, tieneProveedor: boolean) {
  const estatus = tieneProveedor ? "asignado" : "programado";
  const { error } = await supabase.from("servicios").update({ estatus }).eq("id", servicioId);
  if (error) return { error: error.message, estatus };
  const { data } = await supabase.from("servicio_estatus").select("id")
    .eq("servicio_id", servicioId).eq("estatus", estatus)
    .order("created_at", { ascending: false }).limit(1);
  if (data?.[0]) await supabase.from("servicio_estatus").update({ comentario: "Se quitó la cancelación" }).eq("id", data[0].id);
  return { error: null, estatus };
}

export default function ModalCancelar({ idTrack, facturado, onCerrar, onConfirmar }: {
  idTrack: string; facturado?: boolean; onCerrar: () => void; onConfirmar: (motivo: string) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [otro, setOtro] = useState("");
  const [guardando, setGuardando] = useState(false);
  const texto = motivo === "Otro" ? otro : motivo;

  return (
    <Modal titulo={`Cancelar ${idTrack}`} onClose={onCerrar} ancho={480}>
      {facturado && (
        <p style={{ margin: "0 0 12px", padding: "0.6rem 0.8rem", borderRadius: 8, backgroundColor: "rgba(239,68,68,0.15)", color: "#FCA5A5", fontSize: 13 }}>
          Este servicio ya está marcado como facturado. Si lo cancelas, revisa la factura con facturación.
        </p>
      )}
      <Campo label="Motivo de la cancelación">
        <select value={motivo} onChange={(e) => setMotivo(e.target.value)} style={inputStyle}>
          {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
          <option value="Otro">Otro…</option>
        </select>
      </Campo>
      {motivo === "Otro" && (
        <Campo label="Escribe el motivo">
          <input autoFocus value={otro} onChange={(e) => setOtro(e.target.value)} placeholder="Motivo" style={inputStyle} />
        </Campo>
      )}
      <p style={{ color: C.muted, fontSize: 12, margin: "6px 0 14px" }}>
        El motivo queda guardado en la bitácora del servicio con tu usuario y la hora.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn variante="secundario" onClick={onCerrar} style={{ flex: 1 }}>No cancelar</Btn>
        <Btn variante="peligro" disabled={guardando || !texto.trim()} style={{ flex: 1 }}
          onClick={async () => { setGuardando(true); await onConfirmar(texto.trim()); setGuardando(false); }}>
          {guardando ? "Cancelando…" : "Sí, cancelar servicio"}
        </Btn>
      </div>
    </Modal>
  );
}
