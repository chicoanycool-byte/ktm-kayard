"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Servicio {
  id: string;
  folio: string;
  estatus: string;
  fecha_cita_carga?: string;
  hora_cita_carga?: string;
  fecha_cita_descarga?: string;
  hora_cita_descarga?: string;
  clientes?: { razon_social: string };
  proveedores?: { razon_social: string };
  operadores?: { nombre: string };
  unidades?: { placas: string };
}

interface Monitoreo {
  id: string;
  servicio_id: string;
  hora_llegada_carga?: string;
  hora_salida_carga?: string;
  hora_llegada_descarga?: string;
  hora_salida_descarga?: string;
  ota?: boolean;
  otd?: boolean;
  otif?: boolean;
  tiempo_carga_min?: number;
  tiempo_descarga_min?: number;
  tiempo_transito_min?: number;
  semaforo?: string;
}

const ESTATUS_COLORES: Record<string, { bg: string; color: string }> = {
  planeado:    { bg: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" },
  asignado:    { bg: "rgba(91,163,217,0.2)", color: "#5BA3D9" },
  en_transito: { bg: "rgba(245,166,35,0.2)", color: "#F5A623" },
  en_carga:    { bg: "rgba(251,146,60,0.2)", color: "#FB923C" },
  en_descarga: { bg: "rgba(167,139,250,0.2)", color: "#A78BFA" },
  entregado:   { bg: "rgba(34,197,94,0.2)", color: "#22C55E" },
  cancelado:   { bg: "rgba(239,68,68,0.2)", color: "#EF4444" },
};

const ESTATUS_LABELS: Record<string, string> = {
  planeado: "Planeado", asignado: "Asignado", en_transito: "En Tránsito",
  en_carga: "En Carga", en_descarga: "En Descarga", entregado: "Entregado", cancelado: "Cancelado",
};

function calcularMinutos(inicio: string, fin: string): number {
  return Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / 60000);
}

function formatMinutos(min: number): string {
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export default function MonitoreoView({ servicios, monitoreos: monIni }: { servicios: Servicio[]; monitoreos: Monitoreo[] }) {
  const [monitoreos, setMonitoreos] = useState(monIni);
  const [servicioActivo, setServicioActivo] = useState<Servicio | null>(null);
  const [form, setForm] = useState({ hora_llegada_carga: "", hora_salida_carga: "", hora_llegada_descarga: "", hora_salida_descarga: "" });
  const [loading, setLoading] = useState(false);
  const [filtroEstatus, setFiltroEstatus] = useState("todos");
  const router = useRouter();
  const supabase = createClient();

  function getMonitoreo(id: string) { return monitoreos.find((m) => m.servicio_id === id); }

  function abrirMonitoreo(s: Servicio) {
    setServicioActivo(s);
    const mon = getMonitoreo(s.id);
    setForm({
      hora_llegada_carga: mon?.hora_llegada_carga ? new Date(mon.hora_llegada_carga).toISOString().slice(0, 16) : "",
      hora_salida_carga: mon?.hora_salida_carga ? new Date(mon.hora_salida_carga).toISOString().slice(0, 16) : "",
      hora_llegada_descarga: mon?.hora_llegada_descarga ? new Date(mon.hora_llegada_descarga).toISOString().slice(0, 16) : "",
      hora_salida_descarga: mon?.hora_salida_descarga ? new Date(mon.hora_salida_descarga).toISOString().slice(0, 16) : "",
    });
  }

  function calcularIndicadores() {
    const lc = form.hora_llegada_carga ? new Date(form.hora_llegada_carga) : null;
    const sc = form.hora_salida_carga ? new Date(form.hora_salida_carga) : null;
    const ld = form.hora_llegada_descarga ? new Date(form.hora_llegada_descarga) : null;
    const sd = form.hora_salida_descarga ? new Date(form.hora_salida_descarga) : null;
    const tiempoCarga = lc && sc ? calcularMinutos(lc.toISOString(), sc.toISOString()) : null;
    const tiempoDescarga = ld && sd ? calcularMinutos(ld.toISOString(), sd.toISOString()) : null;
    const tiempoTransito = sc && ld ? calcularMinutos(sc.toISOString(), ld.toISOString()) : null;
    const citaCarga = servicioActivo?.fecha_cita_carga && servicioActivo?.hora_cita_carga ? new Date(`${servicioActivo.fecha_cita_carga}T${servicioActivo.hora_cita_carga}`) : null;
    const citaDescarga = servicioActivo?.fecha_cita_descarga && servicioActivo?.hora_cita_descarga ? new Date(`${servicioActivo.fecha_cita_descarga}T${servicioActivo.hora_cita_descarga}`) : null;
    const ota = citaCarga && lc ? lc <= citaCarga : null;
    const otd = citaDescarga && sd ? sd <= citaDescarga : null;
    const otif = ota !== null && otd !== null ? ota && otd : null;
    const semaforo = otif === false ? "rojo" : (ota === false || otd === false) ? "amarillo" : "verde";
    return { tiempoCarga, tiempoDescarga, tiempoTransito, ota, otd, otif, semaforo };
  }

  async function guardarMonitoreo(e: React.FormEvent) {
    e.preventDefault();
    if (!servicioActivo) return;
    setLoading(true);
    const { tiempoCarga, tiempoDescarga, tiempoTransito, ota, otd, otif, semaforo } = calcularIndicadores();
    const datos = {
      servicio_id: servicioActivo.id,
      hora_llegada_carga: form.hora_llegada_carga || null,
      hora_salida_carga: form.hora_salida_carga || null,
      hora_llegada_descarga: form.hora_llegada_descarga || null,
      hora_salida_descarga: form.hora_salida_descarga || null,
      tiempo_carga_min: tiempoCarga,
      tiempo_descarga_min: tiempoDescarga,
      tiempo_transito_min: tiempoTransito,
      ota, otd, otif, semaforo,
    };
    const existente = getMonitoreo(servicioActivo.id);
    if (existente) {
      await supabase.from("monitoreo").update(datos).eq("id", existente.id);
      setMonitoreos(monitoreos.map((m) => m.servicio_id === servicioActivo.id ? { ...m, ...datos } : m));
    } else {
      const { data } = await supabase.from("monitoreo").insert([datos]).select().single();
      if (data) setMonitoreos([...monitoreos, data]);
    }
    setLoading(false);
    setServicioActivo(null);
    router.refresh();
  }

  const serviciosFiltrados = filtroEstatus === "todos" ? servicios : servicios.filter((s) => s.estatus === filtroEstatus);
  const indicadores = servicioActivo ? calcularIndicadores() : null;

  const semColorMap: Record<string, string> = { verde: "#22C55E", amarillo: "#F5A623", rojo: "#EF4444" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0F1E2E" }}>
      <header style={{ background: "linear-gradient(135deg, #0A1628 0%, #1B3A5C 100%)", color: "white", padding: "0.75rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(245,166,35,0.2)" }}>
        <div style={{ backgroundColor: "#E8F0F7", borderRadius: 8, padding: "4px 8px" }}>
          <img src="/logo-kayard.png" alt="Kayard" style={{ height: 36, objectFit: "contain" }} />
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={() => router.refresh()} style={{ color: "#F5A623", fontSize: 13, padding: "0.4rem 0.75rem", borderRadius: 6, border: "1px solid rgba(245,166,35,0.4)", backgroundColor: "transparent", cursor: "pointer" }}>↺ Actualizar</button>
          <a href="/dashboard" style={{ color: "#F5A623", textDecoration: "none", fontSize: 13, padding: "0.4rem 0.75rem", borderRadius: 6, border: "1px solid rgba(245,166,35,0.4)" }}>← Dashboard</a>
        </div>
      </header>

      <main style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ color: "white", fontSize: 22, fontWeight: 700, margin: 0 }}>Monitoreo de Servicios</h2>
          <select value={filtroEstatus} onChange={(e) => setFiltroEstatus(e.target.value)}
            style={{ padding: "0.5rem 1rem", border: "1px solid rgba(245,166,35,0.3)", borderRadius: 8, fontSize: 14, backgroundColor: "#1B3A5C", color: "white", cursor: "pointer" }}>
            <option value="todos">Todos los estatus</option>
            {Object.entries(ESTATUS_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total servicios", valor: servicios.length, color: "#F5A623" },
            { label: "En tránsito", valor: servicios.filter(s => s.estatus === "en_transito").length, color: "#5BA3D9" },
            { label: "Entregados", valor: servicios.filter(s => s.estatus === "entregado").length, color: "#22C55E" },
            { label: "Retrasados", valor: monitoreos.filter(m => m.semaforo === "rojo").length, color: "#EF4444" },
          ].map((kpi) => (
            <div key={kpi.label} style={{ backgroundColor: "#1B3A5C", borderRadius: 12, padding: "1.25rem", borderLeft: `4px solid ${kpi.color}` }}>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{kpi.label}</p>
              <p style={{ margin: "0.5rem 0 0", fontSize: 32, fontWeight: 700, color: kpi.color }}>{kpi.valor}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {serviciosFiltrados.length === 0 ? (
            <div style={{ backgroundColor: "#1B3A5C", borderRadius: 12, padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>No hay servicios</div>
          ) : serviciosFiltrados.map((s) => {
            const col = ESTATUS_COLORES[s.estatus] || ESTATUS_COLORES.planeado;
            const mon = getMonitoreo(s.id);
            const semColor = mon?.semaforo ? semColorMap[mon.semaforo] : "rgba(255,255,255,0.2)";
            return (
              <div key={s.id} style={{ backgroundColor: "#1B3A5C", borderRadius: 12, padding: "1rem 1.5rem", borderLeft: `4px solid ${col.color}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ padding: "0.25rem 0.75rem", borderRadius: 999, fontSize: 12, fontWeight: 600, backgroundColor: col.bg, color: col.color }}>{ESTATUS_LABELS[s.estatus]}</span>
                    <span style={{ fontWeight: 700, color: "#F5A623", fontSize: 15 }}>{s.folio}</span>
                    <span style={{ color: "white", fontWeight: 500, fontSize: 14 }}>{s.clientes?.razon_social || "-"}</span>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{s.operadores?.nombre || "-"}</span>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{s.unidades?.placas || "-"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    {mon && (
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: semColor }} />
                        {mon.otif !== null && mon.otif !== undefined && (
                          <span style={{ fontSize: 12, padding: "0.2rem 0.5rem", borderRadius: 4, backgroundColor: mon.otif ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", color: mon.otif ? "#22C55E" : "#EF4444", fontWeight: 600 }}>
                            OTIF: {mon.otif ? "✓" : "✗"}
                          </span>
                        )}
                      </div>
                    )}
                    <button onClick={() => abrirMonitoreo(s)}
                      style={{ fontSize: 13, padding: "0.4rem 1rem", backgroundColor: "#F5A623", color: "#0A1628", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
                      Registrar tiempos
                    </button>
                  </div>
                </div>
                {mon && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginTop: "0.75rem", padding: "0.75rem", backgroundColor: "#0F2540", borderRadius: 8 }}>
                    {[
                      { label: "Llegada carga", val: mon.hora_llegada_carga ? new Date(mon.hora_llegada_carga).toLocaleString("es-MX") : "-" },
                      { label: "Salida carga", val: mon.hora_salida_carga ? new Date(mon.hora_salida_carga).toLocaleString("es-MX") : "-" },
                      { label: "Llegada descarga", val: mon.hora_llegada_descarga ? new Date(mon.hora_llegada_descarga).toLocaleString("es-MX") : "-" },
                      { label: "Salida descarga", val: mon.hora_salida_descarga ? new Date(mon.hora_salida_descarga).toLocaleString("es-MX") : "-" },
                    ].map((item) => (
                      <div key={item.label}>
                        <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{item.label}</p>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "white" }}>{item.val}</p>
                      </div>
                    ))}
                    {mon.tiempo_carga_min !== null && mon.tiempo_carga_min !== undefined && (
                      <div style={{ gridColumn: "span 4", display: "flex", gap: "2rem", paddingTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>⏱ Carga: <strong style={{ color: "white" }}>{formatMinutos(mon.tiempo_carga_min!)}</strong></span>
                        {mon.tiempo_transito_min !== null && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>🚛 Tránsito: <strong style={{ color: "white" }}>{formatMinutos(mon.tiempo_transito_min!)}</strong></span>}
                        {mon.tiempo_descarga_min !== null && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>📦 Descarga: <strong style={{ color: "white" }}>{formatMinutos(mon.tiempo_descarga_min!)}</strong></span>}
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>OTA: <strong style={{ color: mon.ota ? "#22C55E" : "#EF4444" }}>{mon.ota ? "✓" : "✗"}</strong></span>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>OTD: <strong style={{ color: mon.otd ? "#22C55E" : "#EF4444" }}>{mon.otd ? "✓" : "✗"}</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {servicioActivo && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ backgroundColor: "#1B3A5C", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", border: "1px solid rgba(245,166,35,0.2)" }}>
            <h3 style={{ color: "white", fontSize: 20, fontWeight: "bold", marginBottom: "0.5rem" }}>Registro de Tiempos</h3>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: "1.5rem" }}>{servicioActivo.folio} — {servicioActivo.clientes?.razon_social}</p>
            <form onSubmit={guardarMonitoreo} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ backgroundColor: "#0A1628", padding: "0.5rem 1rem", borderRadius: 6, borderLeft: "3px solid #F5A623" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#F5A623", margin: 0 }}>Carga</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 4 }}>Llegada a carga</label>
                  <input type="datetime-local" value={form.hora_llegada_carga} onChange={(e) => setForm({ ...form, hora_llegada_carga: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 13, backgroundColor: "#0F2540", color: "white" }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 4 }}>Salida de carga</label>
                  <input type="datetime-local" value={form.hora_salida_carga} onChange={(e) => setForm({ ...form, hora_salida_carga: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 13, backgroundColor: "#0F2540", color: "white" }} />
                </div>
              </div>
              <div style={{ backgroundColor: "#0A1628", padding: "0.5rem 1rem", borderRadius: 6, borderLeft: "3px solid #F5A623" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#F5A623", margin: 0 }}>Descarga</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 4 }}>Llegada a descarga</label>
                  <input type="datetime-local" value={form.hora_llegada_descarga} onChange={(e) => setForm({ ...form, hora_llegada_descarga: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 13, backgroundColor: "#0F2540", color: "white" }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 4 }}>Salida de descarga</label>
                  <input type="datetime-local" value={form.hora_salida_descarga} onChange={(e) => setForm({ ...form, hora_salida_descarga: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 13, backgroundColor: "#0F2540", color: "white" }} />
                </div>
              </div>

              {indicadores && (form.hora_llegada_carga || form.hora_salida_carga || form.hora_llegada_descarga || form.hora_salida_descarga) && (
                <div style={{ backgroundColor: "#0F2540", borderRadius: 8, padding: "1rem" }}>
                  <p style={{ margin: "0 0 0.75rem", fontSize: 13, fontWeight: 600, color: "#F5A623" }}>Indicadores calculados:</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    {indicadores.tiempoCarga !== null && (
                      <div style={{ textAlign: "center", padding: "0.5rem", backgroundColor: "#1B3A5C", borderRadius: 8 }}>
                        <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Tiempo carga</p>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "white" }}>{formatMinutos(indicadores.tiempoCarga)}</p>
                      </div>
                    )}
                    {indicadores.tiempoTransito !== null && (
                      <div style={{ textAlign: "center", padding: "0.5rem", backgroundColor: "#1B3A5C", borderRadius: 8 }}>
                        <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Tiempo tránsito</p>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "white" }}>{formatMinutos(indicadores.tiempoTransito)}</p>
                      </div>
                    )}
                    {indicadores.tiempoDescarga !== null && (
                      <div style={{ textAlign: "center", padding: "0.5rem", backgroundColor: "#1B3A5C", borderRadius: 8 }}>
                        <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Tiempo descarga</p>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "white" }}>{formatMinutos(indicadores.tiempoDescarga)}</p>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                    {indicadores.ota !== null && <span style={{ fontSize: 13, padding: "0.25rem 0.75rem", borderRadius: 6, backgroundColor: indicadores.ota ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", color: indicadores.ota ? "#22C55E" : "#EF4444", fontWeight: 600 }}>OTA: {indicadores.ota ? "✓" : "✗"}</span>}
                    {indicadores.otd !== null && <span style={{ fontSize: 13, padding: "0.25rem 0.75rem", borderRadius: 6, backgroundColor: indicadores.otd ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", color: indicadores.otd ? "#22C55E" : "#EF4444", fontWeight: 600 }}>OTD: {indicadores.otd ? "✓" : "✗"}</span>}
                    {indicadores.otif !== null && <span style={{ fontSize: 13, padding: "0.25rem 0.75rem", borderRadius: 6, backgroundColor: indicadores.otif ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", color: indicadores.otif ? "#22C55E" : "#EF4444", fontWeight: 700 }}>OTIF: {indicadores.otif ? "✓" : "✗"}</span>}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: "0.625rem", backgroundColor: "#F5A623", color: "#0A1628", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>{loading ? "Guardando..." : "Guardar"}</button>
                <button type="button" onClick={() => setServicioActivo(null)} style={{ flex: 1, padding: "0.625rem", backgroundColor: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}