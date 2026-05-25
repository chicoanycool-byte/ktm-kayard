"use client";
import { useState } from "react";

interface Servicio {
  id: string;
  folio: string;
  estatus: string;
  fecha_cita_carga?: string;
  venta_cliente?: number;
  costo_proveedor?: number;
  clientes?: { razon_social: string };
  proveedores?: { razon_social: string };
}

interface Monitoreo {
  id: string;
  servicio_id: string;
  ota?: boolean;
  otd?: boolean;
  otif?: boolean;
  tiempo_carga_min?: number;
  tiempo_descarga_min?: number;
  tiempo_transito_min?: number;
  semaforo?: string;
}

export default function ReportesView({ servicios, monitoreos, facturas }: { servicios: Servicio[]; monitoreos: Monitoreo[]; facturas: any[] }) {
  const [tab, setTab] = useState<"operativo"|"financiero"|"cumplimiento">("operativo");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const serviciosFiltrados = servicios.filter((s) => {
    if (!fechaInicio && !fechaFin) return true;
    const fecha = s.fecha_cita_carga || "";
    if (fechaInicio && fecha < fechaInicio) return false;
    if (fechaFin && fecha > fechaFin) return false;
    return true;
  });

  const totalServicios = serviciosFiltrados.length;
  const entregados = serviciosFiltrados.filter(s => s.estatus === "entregado").length;
  const cancelados = serviciosFiltrados.filter(s => s.estatus === "cancelado").length;
  const enTransito = serviciosFiltrados.filter(s => s.estatus === "en_transito").length;

  const totalVenta = serviciosFiltrados.reduce((sum, s) => sum + (s.venta_cliente || 0), 0);
  const totalCosto = serviciosFiltrados.reduce((sum, s) => sum + (s.costo_proveedor || 0), 0);
  const totalMargen = totalVenta - totalCosto;
  const margenPct = totalVenta > 0 ? ((totalMargen / totalVenta) * 100).toFixed(1) : "0";

  const monsFiltrados = monitoreos.filter(m => serviciosFiltrados.some(s => s.id === m.servicio_id));
  const totalMons = monsFiltrados.length;
  const otaPct = totalMons > 0 ? ((monsFiltrados.filter(m => m.ota).length / totalMons) * 100).toFixed(1) : "0";
  const otdPct = totalMons > 0 ? ((monsFiltrados.filter(m => m.otd).length / totalMons) * 100).toFixed(1) : "0";
  const otifPct = totalMons > 0 ? ((monsFiltrados.filter(m => m.otif).length / totalMons) * 100).toFixed(1) : "0";

  const porCliente: Record<string, { count: number; venta: number; margen: number }> = {};
  serviciosFiltrados.forEach(s => {
    const nombre = s.clientes?.razon_social || "Sin cliente";
    if (!porCliente[nombre]) porCliente[nombre] = { count: 0, venta: 0, margen: 0 };
    porCliente[nombre].count++;
    porCliente[nombre].venta += s.venta_cliente || 0;
    porCliente[nombre].margen += (s.venta_cliente || 0) - (s.costo_proveedor || 0);
  });

  const porProveedor: Record<string, { count: number; costo: number }> = {};
  serviciosFiltrados.forEach(s => {
    const nombre = s.proveedores?.razon_social || "Sin proveedor";
    if (!porProveedor[nombre]) porProveedor[nombre] = { count: 0, costo: 0 };
    porProveedor[nombre].count++;
    porProveedor[nombre].costo += s.costo_proveedor || 0;
  });

  function exportarCSV() {
    const headers = ["Folio","Cliente","Proveedor","Estatus","Fecha Carga","Venta","Costo","Margen"];
    const rows = serviciosFiltrados.map(s => [s.folio, s.clientes?.razon_social || "", s.proveedores?.razon_social || "", s.estatus, s.fecha_cita_carga || "", s.venta_cliente || 0, s.costo_proveedor || 0, (s.venta_cliente || 0) - (s.costo_proveedor || 0)]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-ktm-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const thStyle = { padding: "0.75rem 1rem", textAlign: "left" as const, color: "#F5A623", fontWeight: 500 };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0F1E2E" }}>
      <header style={{ background: "linear-gradient(135deg, #0A1628 0%, #1B3A5C 100%)", color: "white", padding: "0.75rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(245,166,35,0.2)" }}>
        <div style={{ backgroundColor: "#E8F0F7", borderRadius: 8, padding: "4px 8px" }}>
          <img src="/logo-kayard.png" alt="Kayard" style={{ height: 36, objectFit: "contain" }} />
        </div>
        <a href="/dashboard" style={{ color: "#F5A623", textDecoration: "none", fontSize: 13, padding: "0.4rem 0.75rem", borderRadius: 6, border: "1px solid rgba(245,166,35,0.4)" }}>← Dashboard</a>
      </header>

      <main style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ color: "white", fontSize: 22, fontWeight: 700, margin: 0 }}>Reportes</h2>
          <button onClick={exportarCSV} style={{ backgroundColor: "#22C55E", color: "white", padding: "0.5rem 1.25rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}>↓ Exportar CSV</button>
        </div>

        {/* Filtros */}
        <div style={{ backgroundColor: "#1B3A5C", borderRadius: 12, padding: "1rem 1.5rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#F5A623" }}>Filtrar por fecha:</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Desde</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
              style={{ padding: "0.4rem 0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 13, backgroundColor: "#0F2540", color: "white" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Hasta</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
              style={{ padding: "0.4rem 0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 13, backgroundColor: "#0F2540", color: "white" }} />
          </div>
          {(fechaInicio || fechaFin) && (
            <button onClick={() => { setFechaInicio(""); setFechaFin(""); }}
              style={{ padding: "0.4rem 0.75rem", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, fontSize: 13, cursor: "pointer", backgroundColor: "transparent", color: "rgba(255,255,255,0.6)" }}>
              Limpiar
            </button>
          )}
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginLeft: "auto" }}>{serviciosFiltrados.length} servicios</span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {[{ key: "operativo", label: "Operativo" }, { key: "financiero", label: "Financiero" }, { key: "cumplimiento", label: "Cumplimiento" }].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              style={{ padding: "0.625rem 1.25rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, backgroundColor: tab === t.key ? "#F5A623" : "#1B3A5C", color: tab === t.key ? "#0A1628" : "rgba(255,255,255,0.7)" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OPERATIVO */}
        {tab === "operativo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
              {[
                { label: "Total servicios", valor: totalServicios, color: "#F5A623" },
                { label: "Entregados", valor: entregados, color: "#22C55E" },
                { label: "En tránsito", valor: enTransito, color: "#5BA3D9" },
                { label: "Cancelados", valor: cancelados, color: "#EF4444" },
              ].map((kpi) => (
                <div key={kpi.label} style={{ backgroundColor: "#1B3A5C", borderRadius: 12, padding: "1.25rem", borderLeft: `4px solid ${kpi.color}` }}>
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{kpi.label}</p>
                  <p style={{ margin: "0.5rem 0 0", fontSize: 32, fontWeight: 700, color: kpi.color }}>{kpi.valor}</p>
                </div>
              ))}
            </div>
            <div style={{ backgroundColor: "#1B3A5C", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <h3 style={{ margin: 0, color: "#F5A623", fontSize: 15, fontWeight: 600 }}>Servicios por Cliente</h3>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead><tr style={{ backgroundColor: "#0A1628" }}>
                  <th style={thStyle}>Cliente</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Servicios</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Venta Total</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Margen</th>
                </tr></thead>
                <tbody>
                  {Object.entries(porCliente).sort((a, b) => b[1].count - a[1].count).map(([nombre, datos], i) => (
                    <tr key={nombre} style={{ backgroundColor: i % 2 === 0 ? "#1B3A5C" : "#162F4A", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "0.75rem 1rem", color: "white", fontWeight: 500 }}>{nombre}</td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "rgba(255,255,255,0.6)" }}>{datos.count}</td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#22C55E", fontWeight: 600 }}>${datos.venta.toLocaleString("es-MX")}</td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: datos.margen >= 0 ? "#22C55E" : "#EF4444", fontWeight: 600 }}>${datos.margen.toLocaleString("es-MX")}</td>
                    </tr>
                  ))}
                  {Object.keys(porCliente).length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>Sin datos</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FINANCIERO */}
        {tab === "financiero" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
              {[
                { label: "Venta total", valor: `$${totalVenta.toLocaleString("es-MX")}`, color: "#F5A623" },
                { label: "Costo total", valor: `$${totalCosto.toLocaleString("es-MX")}`, color: "#EF4444" },
                { label: "Margen total", valor: `$${totalMargen.toLocaleString("es-MX")}`, color: "#22C55E" },
                { label: "% Margen", valor: `${margenPct}%`, color: "#5BA3D9" },
              ].map((kpi) => (
                <div key={kpi.label} style={{ backgroundColor: "#1B3A5C", borderRadius: 12, padding: "1.25rem", borderLeft: `4px solid ${kpi.color}` }}>
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{kpi.label}</p>
                  <p style={{ margin: "0.5rem 0 0", fontSize: 24, fontWeight: 700, color: kpi.color }}>{kpi.valor}</p>
                </div>
              ))}
            </div>
            <div style={{ backgroundColor: "#1B3A5C", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <h3 style={{ margin: 0, color: "#F5A623", fontSize: 15, fontWeight: 600 }}>Costos por Proveedor</h3>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead><tr style={{ backgroundColor: "#0A1628" }}>
                  <th style={thStyle}>Proveedor</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Servicios</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Costo Total</th>
                </tr></thead>
                <tbody>
                  {Object.entries(porProveedor).sort((a, b) => b[1].costo - a[1].costo).map(([nombre, datos], i) => (
                    <tr key={nombre} style={{ backgroundColor: i % 2 === 0 ? "#1B3A5C" : "#162F4A", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "0.75rem 1rem", color: "white", fontWeight: 500 }}>{nombre}</td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "rgba(255,255,255,0.6)" }}>{datos.count}</td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#EF4444", fontWeight: 600 }}>${datos.costo.toLocaleString("es-MX")}</td>
                    </tr>
                  ))}
                  {Object.keys(porProveedor).length === 0 && <tr><td colSpan={3} style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>Sin datos</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CUMPLIMIENTO */}
        {tab === "cumplimiento" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
              {[
                { label: "OTA", valor: `${otaPct}%`, color: parseFloat(otaPct) >= 90 ? "#22C55E" : parseFloat(otaPct) >= 70 ? "#F5A623" : "#EF4444" },
                { label: "OTD", valor: `${otdPct}%`, color: parseFloat(otdPct) >= 90 ? "#22C55E" : parseFloat(otdPct) >= 70 ? "#F5A623" : "#EF4444" },
                { label: "OTIF", valor: `${otifPct}%`, color: parseFloat(otifPct) >= 90 ? "#22C55E" : parseFloat(otifPct) >= 70 ? "#F5A623" : "#EF4444" },
              ].map((kpi) => (
                <div key={kpi.label} style={{ backgroundColor: "#1B3A5C", borderRadius: 12, padding: "1.5rem", textAlign: "center", borderTop: `4px solid ${kpi.color}` }}>
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{kpi.label}</p>
                  <p style={{ margin: "0.5rem 0 0", fontSize: 40, fontWeight: 700, color: kpi.color }}>{kpi.valor}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{totalMons} servicios monitoreados</p>
                </div>
              ))}
            </div>
            <div style={{ backgroundColor: "#1B3A5C", borderRadius: 12, padding: "1.5rem" }}>
              <h3 style={{ margin: "0 0 1rem", color: "#F5A623", fontSize: 15, fontWeight: 600 }}>Distribución por Semáforo</h3>
              <div style={{ display: "flex", gap: "1.5rem" }}>
                {[
                  { label: "Verde", count: monsFiltrados.filter(m => m.semaforo === "verde").length, color: "#22C55E", bg: "rgba(34,197,94,0.15)" },
                  { label: "Amarillo", count: monsFiltrados.filter(m => m.semaforo === "amarillo").length, color: "#F5A623", bg: "rgba(245,166,35,0.15)" },
                  { label: "Rojo", count: monsFiltrados.filter(m => m.semaforo === "rojo").length, color: "#EF4444", bg: "rgba(239,68,68,0.15)" },
                ].map((sem) => (
                  <div key={sem.label} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1.25rem", backgroundColor: sem.bg, borderRadius: 10, border: `1px solid ${sem.color}30` }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: sem.color }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: sem.color }}>{sem.label}: {sem.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}