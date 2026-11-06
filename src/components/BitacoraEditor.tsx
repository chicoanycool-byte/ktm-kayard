"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ESTATUS, ESTATUS_INFO } from "@/lib/constants";
import { Btn, C, inputStyle } from "./ui";

// "2026-11-06T14:30" en hora del centro de México <-> ISO
export function aLocalMx(iso: string) {
  const d = new Date(iso);
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}
export function deLocalMx(local: string) {
  return new Date(`${local}:00-06:00`).toISOString();
}

// Edición de la bitácora (solo administrador): cambiar fecha/hora y estatus de cada registro, agregar y borrar
export default function BitacoraEditor({ servicioId, registros, onCambio }: { servicioId: string; registros: any[]; onCambio: () => void }) {
  const supabase = createClient();
  const [edit, setEdit] = useState<Record<string, { created_at: string; estatus: string; comentario: string }>>({});
  const [nuevo, setNuevo] = useState({ created_at: aLocalMx(new Date().toISOString()), estatus: "en_carga", comentario: "" });
  const [ocupado, setOcupado] = useState("");

  const valor = (b: any) => edit[b.id] || { created_at: aLocalMx(b.created_at), estatus: b.estatus, comentario: b.comentario || "" };
  const cambiado = (b: any) => !!edit[b.id] && (edit[b.id].created_at !== aLocalMx(b.created_at) || edit[b.id].estatus !== b.estatus || edit[b.id].comentario !== (b.comentario || ""));

  async function guardar(b: any) {
    const v = valor(b);
    setOcupado(b.id);
    const { error } = await supabase.from("servicio_estatus").update({ created_at: deLocalMx(v.created_at), estatus: v.estatus, comentario: v.comentario || null }).eq("id", b.id);
    setOcupado("");
    if (error) return alert(error.message);
    setEdit((e) => { const n = { ...e }; delete n[b.id]; return n; });
    onCambio();
  }

  async function borrar(b: any) {
    if (!confirm(`¿Borrar el registro "${ESTATUS_INFO[b.estatus as keyof typeof ESTATUS_INFO]?.label || b.estatus}" de la bitácora?`)) return;
    setOcupado(b.id);
    const { error } = await supabase.from("servicio_estatus").delete().eq("id", b.id);
    setOcupado("");
    if (error) return alert(error.message);
    onCambio();
  }

  async function agregar() {
    setOcupado("nuevo");
    const { error } = await supabase.from("servicio_estatus").insert({
      servicio_id: servicioId, estatus: nuevo.estatus, created_at: deLocalMx(nuevo.created_at),
      comentario: nuevo.comentario || "Agregado por administrador",
    });
    setOcupado("");
    if (error) return alert(error.message);
    setNuevo({ ...nuevo, comentario: "" });
    onCambio();
  }

  const fila = { display: "grid", gridTemplateColumns: "190px 190px 1fr auto", gap: 6, alignItems: "center" } as const;
  const chico = { ...inputStyle, padding: "0.3rem 0.5rem", fontSize: 12 };

  return (
    <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
      <p style={{ margin: 0, fontSize: 11, color: C.amber }}>Modo administrador: corrige fecha, hora y estatus de cada registro. Los reportes de tiempos y On-time usan estas horas.</p>
      {registros.map((b) => {
        const v = valor(b);
        return (
          <div key={b.id} style={fila}>
            <input type="datetime-local" value={v.created_at} onChange={(e) => setEdit({ ...edit, [b.id]: { ...v, created_at: e.target.value } })} style={chico} />
            <select value={v.estatus} onChange={(e) => setEdit({ ...edit, [b.id]: { ...v, estatus: e.target.value } })} style={{ ...chico, color: ESTATUS_INFO[v.estatus as keyof typeof ESTATUS_INFO]?.color }}>
              {ESTATUS.map((e) => <option key={e} value={e}>{ESTATUS_INFO[e].label}</option>)}
            </select>
            <input value={v.comentario} placeholder={b.origen === "operador" ? "Registrado por el operador" : "Comentario"} onChange={(e) => setEdit({ ...edit, [b.id]: { ...v, comentario: e.target.value } })} style={chico} />
            <div style={{ display: "flex", gap: 4 }}>
              {cambiado(b) && <Btn small onClick={() => guardar(b)} disabled={!!ocupado}>{ocupado === b.id ? "…" : "Guardar"}</Btn>}
              <Btn small variante="peligro" onClick={() => borrar(b)} disabled={!!ocupado}>Borrar</Btn>
            </div>
          </div>
        );
      })}
      <div style={{ ...fila, borderTop: `1px dashed ${C.line}`, paddingTop: 8, marginTop: 4 }}>
        <input type="datetime-local" value={nuevo.created_at} onChange={(e) => setNuevo({ ...nuevo, created_at: e.target.value })} style={chico} />
        <select value={nuevo.estatus} onChange={(e) => setNuevo({ ...nuevo, estatus: e.target.value })} style={chico}>
          {ESTATUS.map((e) => <option key={e} value={e}>{ESTATUS_INFO[e].label}</option>)}
        </select>
        <input value={nuevo.comentario} placeholder="Comentario (opcional)" onChange={(e) => setNuevo({ ...nuevo, comentario: e.target.value })} style={chico} />
        <Btn small variante="secundario" onClick={agregar} disabled={!!ocupado}>{ocupado === "nuevo" ? "…" : "+ Agregar"}</Btn>
      </div>
    </div>
  );
}
