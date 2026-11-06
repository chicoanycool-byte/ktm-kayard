"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ESTATUS, ESTATUS_INFO, type Estatus } from "@/lib/constants";
import { fecha, fechaHora, hora } from "@/lib/format";
import ServicioDetalle, { type ServicioV } from "@/components/ServicioDetalle";
import { Btn, Buscador, C, EstatusBadge, Tabla, Td, Titulo, Tr, inputStyle } from "@/components/ui";

export default function MonitoreoView({ servicios: ini }: { servicios: ServicioV[] }) {
  const [servicios, setServicios] = useState(ini);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("activos");
  const [detalle, setDetalle] = useState<ServicioV | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setServicios(ini), [ini]);

  // Se refresca solo cada 60 s para ver los avances del operador
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 60000);
    return () => clearInterval(t);
  }, [router]);

  const conteo = useMemo(() => {
    const c: Record<string, number> = {};
    servicios.forEach((s) => (c[s.estatus] = (c[s.estatus] || 0) + 1));
    return c;
  }, [servicios]);

  const filtrados = servicios.filter((s) => {
    if (filtro === "activos" && ["finalizado", "cancelado"].includes(s.estatus)) return false;
    if (!["activos", "todos"].includes(filtro) && s.estatus !== filtro) return false;
    const q = busqueda.toLowerCase();
    return [s.id_track, s.cliente, s.origen, s.destino, s.proveedor, s.operador, s.placas_unidad].some((v) => (v || "").toLowerCase().includes(q));
  });

  async function cambiar(s: ServicioV, estatus: string) {
    if (estatus === s.estatus) return;
    if (estatus === "cancelado" && !confirm(`¿Cancelar ${s.id_track}?`)) return;
    const { error } = await supabase.from("servicios").update({ estatus }).eq("id", s.id);
    if (error) return alert(error.message);
    setServicios(servicios.map((x) => (x.id === s.id ? { ...x, estatus, updated_at: new Date().toISOString() } : x)));
  }

  return (
    <div>
      <Titulo accion={<Btn variante="secundario" onClick={() => router.refresh()}>↺ Actualizar</Btn>}>Monitoreo de servicios</Titulo>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {ESTATUS.map((e) => (
          <button key={e} onClick={() => setFiltro(filtro === e ? "activos" : e)}
            style={{ background: filtro === e ? ESTATUS_INFO[e].bg : C.card, border: `1px solid ${filtro === e ? ESTATUS_INFO[e].color : "transparent"}`, borderRadius: 10, padding: "0.5rem 0.9rem", cursor: "pointer", textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{ESTATUS_INFO[e].label}</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: ESTATUS_INFO[e].color }}>{conteo[e] || 0}</p>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar ID TRACK, cliente, operador, placas…" />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ ...inputStyle, maxWidth: 200, backgroundColor: C.card }}>
          <option value="activos">Activos</option>
          <option value="todos">Todos (45 días)</option>
          {ESTATUS.map((e) => <option key={e} value={e}>{ESTATUS_INFO[e].label}</option>)}
        </select>
      </div>

      <Tabla columnas={["Estatus", "ID TRACK", "Cliente", "Origen", "Unidad", "Carga", "Fecha carga", "Fecha descarga", "Transporte / operador", "Ubicación", "Actualizado", "Cambiar estatus"]}>
        {filtrados.map((s, i) => (
          <Tr key={s.id} i={i}>
            <Td><EstatusBadge estatus={s.estatus} /></Td>
            <Td fuerte><span onClick={() => setDetalle(s)} style={{ cursor: "pointer", textDecoration: "underline" }}>{s.id_track}</span></Td>
            <Td>{s.cliente}</Td>
            <Td>{s.origen} → {s.destino}</Td>
            <Td>{s.tipo_unidad || "—"}</Td>
            <Td>{s.tipo_carga || "—"}</Td>
            <Td>{fecha(s.fecha_carga)} {hora(s.cita_carga)}</Td>
            <Td>{fecha(s.fecha_descarga)} {hora(s.cita_descarga)}</Td>
            <Td>{s.proveedor ? `${s.proveedor} · ${s.operador || ""}` : <span style={{ color: C.muted }}>Sin asignar</span>}</Td>
            <Td>{s.ultima_lat ? <a href={`https://maps.google.com/?q=${s.ultima_lat},${s.ultima_lng}`} target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>Mapa</a> : "—"}</Td>
            <Td>{fechaHora(s.updated_at)}</Td>
            <Td>
              <select value={s.estatus} onChange={(e) => cambiar(s, e.target.value)}
                style={{ ...inputStyle, padding: "0.25rem 0.4rem", fontSize: 12, width: 160, color: ESTATUS_INFO[s.estatus as Estatus]?.color }}>
                {ESTATUS.map((e) => <option key={e} value={e} disabled={e === "asignado" && !s.proveedor}>{ESTATUS_INFO[e].label}</option>)}
              </select>
            </Td>
          </Tr>
        ))}
      </Tabla>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{filtrados.length} servicios · se actualiza cada minuto</p>

      {detalle && <ServicioDetalle s={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}
