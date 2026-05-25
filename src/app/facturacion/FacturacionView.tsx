"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Factura {
  id: string;
  servicio_id: string;
  tipo: string;
  folio_factura?: string;
  fecha_factura?: string;
  importe?: number;
  estatus_pago: string;
  pdf_url?: string;
  xml_url?: string;
  servicios?: { folio: string; clientes?: { razon_social: string }; proveedores?: { razon_social: string } };
}

interface Servicio {
  id: string;
  folio: string;
  clientes?: { razon_social: string } | { razon_social: string }[] | null;
  proveedores?: { razon_social: string } | { razon_social: string }[] | null;
}
}

const PAGO_COLORES: Record<string, { bg: string; color: string }> = {
  pendiente: { bg: "rgba(245,166,35,0.2)", color: "#F5A623" },
  facturado: { bg: "rgba(91,163,217,0.2)", color: "#5BA3D9" },
  pagado:    { bg: "rgba(34,197,94,0.2)", color: "#22C55E" },
};

const PAGO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  facturado: "Facturado",
  pagado:    "Pagado",
};

export default function FacturacionView({ facturas: ini, servicios }: { facturas: Factura[]; servicios: Servicio[] }) {
  const [facturas, setFacturas] = useState(ini);
  const [tab, setTab] = useState<"cliente"|"proveedor">("cliente");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<Factura | null>(null);
  const [form, setForm] = useState({ servicio_id: "", tipo: "cliente", folio_factura: "", fecha_factura: "", importe: "", estatus_pago: "pendiente", pdf_url: "", xml_url: "" });
  const router = useRouter();
  const supabase = createClient();

  const filtradas = facturas.filter((f) => f.tipo === tab);
  const totalImporte = filtradas.reduce((sum, f) => sum + (f.importe || 0), 0);
  const totalPagado = filtradas.filter(f => f.estatus_pago === "pagado").reduce((sum, f) => sum + (f.importe || 0), 0);
  const totalPendiente = filtradas.filter(f => f.estatus_pago !== "pagado").reduce((sum, f) => sum + (f.importe || 0), 0);

  function abrirNuevo() {
    setEditando(null);
    setForm({ servicio_id: "", tipo: tab, folio_factura: "", fecha_factura: "", importe: "", estatus_pago: "pendiente", pdf_url: "", xml_url: "" });
    setMostrarForm(true);
  }

  function abrirEditar(f: Factura) {
    setEditando(f);
    setForm({ servicio_id: f.servicio_id, tipo: f.tipo, folio_factura: f.folio_factura || "", fecha_factura: f.fecha_factura || "", importe: f.importe?.toString() || "", estatus_pago: f.estatus_pago, pdf_url: f.pdf_url || "", xml_url: f.xml_url || "" });
    setMostrarForm(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const datos = { ...form, importe: form.importe ? parseFloat(form.importe) : null };
    if (editando) {
      await supabase.from("facturacion").update(datos).eq("id", editando.id);
      setFacturas(facturas.map((f) => f.id === editando.id ? { ...f, ...datos } as Factura : f));
    } else {
      const { data } = await supabase.from("facturacion").insert([datos]).select("*, servicios(folio, clientes(razon_social), proveedores(razon_social))").single();
      if (data) setFacturas([data, ...facturas]);
    }
    setLoading(false);
    setMostrarForm(false);
    router.refresh();
  }

  async function cambiarEstatus(id: string, estatus_pago: string) {
    await supabase.from("facturacion").update({ estatus_pago }).eq("id", id);
    setFacturas(facturas.map((f) => f.id === id ? { ...f, estatus_pago } : f));
  }

  const inputStyle = { width: "100%", padding: "0.5rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const, backgroundColor: "#0F2540", color: "white" };
  const labelStyle = { fontSize: 13, fontWeight: 500 as const, color: "rgba(255,255,255,0.7)", display: "block" as const, marginBottom: 4 };

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
          <h2 style={{ color: "white", fontSize: 22, fontWeight: 700, margin: 0 }}>Facturación</h2>
          <button onClick={abrirNuevo} style={{ backgroundColor: "#F5A623", color: "#0A1628", padding: "0.5rem 1.25rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}>+ Nueva Factura</button>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total facturado", valor: `$${totalImporte.toLocaleString("es-MX")}`, color: "#F5A623" },
            { label: "Cobrado/Pagado", valor: `$${totalPagado.toLocaleString("es-MX")}`, color: "#22C55E" },
            { label: "Por cobrar/pagar", valor: `$${totalPendiente.toLocaleString("es-MX")}`, color: "#EF4444" },
          ].map((kpi) => (
            <div key={kpi.label} style={{ backgroundColor: "#1B3A5C", borderRadius: 12, padding: "1.25rem", borderLeft: `4px solid ${kpi.color}` }}>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{kpi.label}</p>
              <p style={{ margin: "0.5rem 0 0", fontSize: 24, fontWeight: 700, color: kpi.color }}>{kpi.valor}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {[{ key: "cliente", label: "Facturas a Clientes" }, { key: "proveedor", label: "Facturas de Proveedores" }].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              style={{ padding: "0.625rem 1.25rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, backgroundColor: tab === t.key ? "#F5A623" : "#1B3A5C", color: tab === t.key ? "#0A1628" : "rgba(255,255,255,0.7)" }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ backgroundColor: "#1B3A5C", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ backgroundColor: "#0A1628", borderBottom: "2px solid rgba(245,166,35,0.3)" }}>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Folio Servicio</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>{tab === "cliente" ? "Cliente" : "Proveedor"}</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Folio Factura</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Fecha</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Importe</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Estatus</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Docs</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>No hay facturas registradas</td></tr>
              ) : (
                filtradas.map((f, i) => {
                  const col = PAGO_COLORES[f.estatus_pago] || PAGO_COLORES.pendiente;
                  return (
                    <tr key={f.id} style={{ backgroundColor: i % 2 === 0 ? "#1B3A5C" : "#162F4A", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#F5A623" }}>{f.servicios?.folio || "-"}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "white", fontWeight: 500 }}>{tab === "cliente" ? f.servicios?.clientes?.razon_social : f.servicios?.proveedores?.razon_social || "-"}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{f.folio_factura || "-"}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{f.fecha_factura ? new Date(f.fecha_factura).toLocaleDateString("es-MX") : "-"}</td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#22C55E" }}>${f.importe?.toLocaleString("es-MX") || "0"}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <select value={f.estatus_pago} onChange={(e) => cambiarEstatus(f.id, e.target.value)}
                          style={{ padding: "0.25rem 0.5rem", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "none", backgroundColor: col.bg, color: col.color, cursor: "pointer" }}>
                          {Object.entries(PAGO_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {f.pdf_url && <a href={f.pdf_url} target="_blank" style={{ fontSize: 11, padding: "0.2rem 0.5rem", backgroundColor: "rgba(239,68,68,0.2)", color: "#EF4444", borderRadius: 4, textDecoration: "none", fontWeight: 600 }}>PDF</a>}
                          {f.xml_url && <a href={f.xml_url} target="_blank" style={{ fontSize: 11, padding: "0.2rem 0.5rem", backgroundColor: "rgba(91,163,217,0.2)", color: "#5BA3D9", borderRadius: 4, textDecoration: "none", fontWeight: 600 }}>XML</a>}
                          {!f.pdf_url && !f.xml_url && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>-</span>}
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <button onClick={() => abrirEditar(f)} style={{ fontSize: 12, padding: "0.25rem 0.75rem", border: "1px solid rgba(245,166,35,0.5)", color: "#F5A623", borderRadius: 6, cursor: "pointer", backgroundColor: "transparent" }}>Editar</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: "0.75rem" }}>Total: {filtradas.length} facturas</p>
      </main>

      {mostrarForm && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ backgroundColor: "#1B3A5C", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", border: "1px solid rgba(245,166,35,0.2)" }}>
            <h3 style={{ color: "white", fontSize: 18, fontWeight: "bold", marginBottom: "1.5rem" }}>{editando ? "Editar" : "Nueva"} Factura</h3>
            <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div><label style={labelStyle}>Tipo</label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
                  <option value="cliente">Factura a Cliente</option>
                  <option value="proveedor">Factura de Proveedor</option>
                </select>
              </div>
              <div><label style={labelStyle}>Servicio *</label>
                <select required value={form.servicio_id} onChange={(e) => setForm({ ...form, servicio_id: e.target.value })} style={inputStyle}>
                  <option value="">-- Seleccionar --</option>
                  {servicios.map((s) => <option key={s.id} value={s.id}>{s.folio} — {s.clientes?.razon_social || "-"}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div><label style={labelStyle}>Folio Factura</label><input type="text" value={form.folio_factura} onChange={(e) => setForm({ ...form, folio_factura: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Fecha Factura</label><input type="date" value={form.fecha_factura} onChange={(e) => setForm({ ...form, fecha_factura: e.target.value })} style={inputStyle} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div><label style={labelStyle}>Importe $</label><input type="number" step="0.01" value={form.importe} onChange={(e) => setForm({ ...form, importe: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Estatus de Pago</label>
                  <select value={form.estatus_pago} onChange={(e) => setForm({ ...form, estatus_pago: e.target.value })} style={inputStyle}>
                    <option value="pendiente">Pendiente</option>
                    <option value="facturado">Facturado</option>
                    <option value="pagado">Pagado</option>
                  </select>
                </div>
              </div>
              <div><label style={labelStyle}>URL del PDF</label><input type="text" value={form.pdf_url} onChange={(e) => setForm({ ...form, pdf_url: e.target.value })} placeholder="https://..." style={inputStyle} /></div>
              <div><label style={labelStyle}>URL del XML</label><input type="text" value={form.xml_url} onChange={(e) => setForm({ ...form, xml_url: e.target.value })} placeholder="https://..." style={inputStyle} /></div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: "0.625rem", backgroundColor: "#F5A623", color: "#0A1628", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>{loading ? "Guardando..." : "Guardar"}</button>
                <button type="button" onClick={() => setMostrarForm(false)} style={{ flex: 1, padding: "0.625rem", backgroundColor: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}