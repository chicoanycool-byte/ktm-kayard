"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface TarifaVenta {
  id: string;
  cliente_id?: string;
  origen: string;
  destino: string;
  tipo_unidad: string;
  tarifa?: number;
  tarifas_extras?: string;
  clientes?: { razon_social: string };
}

interface TarifaCompra {
  id: string;
  proveedor_id?: string;
  origen: string;
  destino: string;
  costo_flete?: number;
  costos_extras?: string;
  proveedores?: { razon_social: string };
}

interface Props {
  tarifasVenta: TarifaVenta[];
  tarifasCompra: TarifaCompra[];
  clientes: { id: string; razon_social: string }[];
  proveedores: { id: string; razon_social: string }[];
}

const TIPOS_UNIDAD = ["Full","Trailer","Torton","Rabon","Mudanza","Camioneta 3.5","Camioneta 1.5","Automóvil","Consolidado"];

export default function TarifasView({ tarifasVenta: tvIni, tarifasCompra: tcIni, clientes, proveedores }: Props) {
  const [tab, setTab] = useState<"venta"|"compra">("venta");
  const [tarifasVenta, setTarifasVenta] = useState(tvIni);
  const [tarifasCompra, setTarifasCompra] = useState(tcIni);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [formVenta, setFormVenta] = useState({ cliente_id: "", origen: "", destino: "", tipo_unidad: "", tarifa: "", tarifas_extras: "" });
  const [formCompra, setFormCompra] = useState({ proveedor_id: "", origen: "", destino: "", costo_flete: "", costos_extras: "" });
  const router = useRouter();
  const supabase = createClient();

  function abrirNuevo() {
    setEditando(null);
    setFormVenta({ cliente_id: "", origen: "", destino: "", tipo_unidad: "", tarifa: "", tarifas_extras: "" });
    setFormCompra({ proveedor_id: "", origen: "", destino: "", costo_flete: "", costos_extras: "" });
    setMostrarForm(true);
  }

  function abrirEditar(item: any) {
    setEditando(item);
    if (tab === "venta") {
      setFormVenta({ cliente_id: item.cliente_id || "", origen: item.origen || "", destino: item.destino || "", tipo_unidad: item.tipo_unidad || "", tarifa: item.tarifa?.toString() || "", tarifas_extras: item.tarifas_extras || "" });
    } else {
      setFormCompra({ proveedor_id: item.proveedor_id || "", origen: item.origen || "", destino: item.destino || "", costo_flete: item.costo_flete?.toString() || "", costos_extras: item.costos_extras || "" });
    }
    setMostrarForm(true);
  }

  async function guardarVenta(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const datos = { ...formVenta, tarifa: formVenta.tarifa ? parseFloat(formVenta.tarifa) : null, cliente_id: formVenta.cliente_id || null };
    if (editando) {
      await supabase.from("tarifas_venta").update(datos).eq("id", editando.id);
      setTarifasVenta(tarifasVenta.map((t) => t.id === editando.id ? { ...t, ...datos } : t));
    } else {
      const { data } = await supabase.from("tarifas_venta").insert([datos]).select("*, clientes(razon_social)").single();
      if (data) setTarifasVenta([data, ...tarifasVenta]);
    }
    setLoading(false);
    setMostrarForm(false);
    router.refresh();
  }

  async function guardarCompra(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const datos = { ...formCompra, costo_flete: formCompra.costo_flete ? parseFloat(formCompra.costo_flete) : null, proveedor_id: formCompra.proveedor_id || null };
    if (editando) {
      await supabase.from("tarifas_compra").update(datos).eq("id", editando.id);
      setTarifasCompra(tarifasCompra.map((t) => t.id === editando.id ? { ...t, ...datos } : t));
    } else {
      const { data } = await supabase.from("tarifas_compra").insert([datos]).select("*, proveedores(razon_social)").single();
      if (data) setTarifasCompra([data, ...tarifasCompra]);
    }
    setLoading(false);
    setMostrarForm(false);
    router.refresh();
  }

  async function eliminar(id: string, tabla: string) {
    if (!confirm("¿Eliminar esta tarifa?")) return;
    await supabase.from(tabla).update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (tabla === "tarifas_venta") setTarifasVenta(tarifasVenta.filter((t) => t.id !== id));
    else setTarifasCompra(tarifasCompra.filter((t) => t.id !== id));
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
          <h2 style={{ color: "white", fontSize: 22, fontWeight: 700, margin: 0 }}>Tarifas</h2>
          <button onClick={abrirNuevo} style={{ backgroundColor: "#F5A623", color: "#0A1628", padding: "0.5rem 1.25rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}>+ Nueva Tarifa</button>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {[{ key: "venta", label: "Tarifas de Venta (Clientes)" }, { key: "compra", label: "Tarifas de Compra (Proveedores)" }].map((t) => (
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
                {tab === "venta" ? (
                  <>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Cliente</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Origen</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Destino</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Tipo Unidad</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Tarifa</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Extras</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Acciones</th>
                  </>
                ) : (
                  <>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Proveedor</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Origen</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Destino</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Costo Flete</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Extras</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Acciones</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {tab === "venta" ? (
                tarifasVenta.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>No hay tarifas de venta</td></tr>
                ) : tarifasVenta.map((t, i) => (
                  <tr key={t.id} style={{ backgroundColor: i % 2 === 0 ? "#1B3A5C" : "#162F4A", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.75rem 1rem", color: "white", fontWeight: 500 }}>{t.clientes?.razon_social || "-"}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{t.origen}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{t.destino}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{t.tipo_unidad}</td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#22C55E" }}>${t.tarifa?.toLocaleString("es-MX") || "0"}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{t.tarifas_extras || "-"}</td>
                    <td style={{ padding: "0.75rem 1rem", display: "flex", gap: 8 }}>
                      <button onClick={() => abrirEditar(t)} style={{ fontSize: 12, padding: "0.25rem 0.75rem", border: "1px solid rgba(245,166,35,0.5)", color: "#F5A623", borderRadius: 6, cursor: "pointer", backgroundColor: "transparent" }}>Editar</button>
                      <button onClick={() => eliminar(t.id, "tarifas_venta")} style={{ fontSize: 12, padding: "0.25rem 0.75rem", border: "1px solid rgba(239,68,68,0.5)", color: "#EF4444", borderRadius: 6, cursor: "pointer", backgroundColor: "transparent" }}>Eliminar</button>
                    </td>
                  </tr>
                ))
              ) : (
                tarifasCompra.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>No hay tarifas de compra</td></tr>
                ) : tarifasCompra.map((t, i) => (
                  <tr key={t.id} style={{ backgroundColor: i % 2 === 0 ? "#1B3A5C" : "#162F4A", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.75rem 1rem", color: "white", fontWeight: 500 }}>{t.proveedores?.razon_social || "-"}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{t.origen}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{t.destino}</td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#EF4444" }}>${t.costo_flete?.toLocaleString("es-MX") || "0"}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{t.costos_extras || "-"}</td>
                    <td style={{ padding: "0.75rem 1rem", display: "flex", gap: 8 }}>
                      <button onClick={() => abrirEditar(t)} style={{ fontSize: 12, padding: "0.25rem 0.75rem", border: "1px solid rgba(245,166,35,0.5)", color: "#F5A623", borderRadius: 6, cursor: "pointer", backgroundColor: "transparent" }}>Editar</button>
                      <button onClick={() => eliminar(t.id, "tarifas_compra")} style={{ fontSize: 12, padding: "0.25rem 0.75rem", border: "1px solid rgba(239,68,68,0.5)", color: "#EF4444", borderRadius: 6, cursor: "pointer", backgroundColor: "transparent" }}>Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {mostrarForm && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ backgroundColor: "#1B3A5C", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", border: "1px solid rgba(245,166,35,0.2)" }}>
            <h3 style={{ color: "white", fontSize: 18, fontWeight: "bold", marginBottom: "1.5rem" }}>
              {editando ? "Editar" : "Nueva"} Tarifa de {tab === "venta" ? "Venta" : "Compra"}
            </h3>

            {tab === "venta" ? (
              <form onSubmit={guardarVenta} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div><label style={labelStyle}>Cliente</label>
                  <select value={formVenta.cliente_id} onChange={(e) => setFormVenta({ ...formVenta, cliente_id: e.target.value })} style={inputStyle}>
                    <option value="">-- Todos --</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div><label style={labelStyle}>Origen *</label><input required type="text" value={formVenta.origen} onChange={(e) => setFormVenta({ ...formVenta, origen: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Destino *</label><input required type="text" value={formVenta.destino} onChange={(e) => setFormVenta({ ...formVenta, destino: e.target.value })} style={inputStyle} /></div>
                </div>
                <div><label style={labelStyle}>Tipo de Unidad *</label>
                  <select required value={formVenta.tipo_unidad} onChange={(e) => setFormVenta({ ...formVenta, tipo_unidad: e.target.value })} style={inputStyle}>
                    <option value="">-- Seleccionar --</option>
                    {TIPOS_UNIDAD.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div><label style={labelStyle}>Tarifa $</label><input type="number" step="0.01" value={formVenta.tarifa} onChange={(e) => setFormVenta({ ...formVenta, tarifa: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Extras</label><input type="text" value={formVenta.tarifas_extras} onChange={(e) => setFormVenta({ ...formVenta, tarifas_extras: e.target.value })} style={inputStyle} /></div>
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button type="submit" disabled={loading} style={{ flex: 1, padding: "0.625rem", backgroundColor: "#F5A623", color: "#0A1628", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>{loading ? "Guardando..." : "Guardar"}</button>
                  <button type="button" onClick={() => setMostrarForm(false)} style={{ flex: 1, padding: "0.625rem", backgroundColor: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
                </div>
              </form>
            ) : (
              <form onSubmit={guardarCompra} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div><label style={labelStyle}>Proveedor</label>
                  <select value={formCompra.proveedor_id} onChange={(e) => setFormCompra({ ...formCompra, proveedor_id: e.target.value })} style={inputStyle}>
                    <option value="">-- Todos --</option>
                    {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div><label style={labelStyle}>Origen *</label><input required type="text" value={formCompra.origen} onChange={(e) => setFormCompra({ ...formCompra, origen: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Destino *</label><input required type="text" value={formCompra.destino} onChange={(e) => setFormCompra({ ...formCompra, destino: e.target.value })} style={inputStyle} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div><label style={labelStyle}>Costo Flete $</label><input type="number" step="0.01" value={formCompra.costo_flete} onChange={(e) => setFormCompra({ ...formCompra, costo_flete: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Costos Extras</label><input type="text" value={formCompra.costos_extras} onChange={(e) => setFormCompra({ ...formCompra, costos_extras: e.target.value })} style={inputStyle} /></div>
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button type="submit" disabled={loading} style={{ flex: 1, padding: "0.625rem", backgroundColor: "#F5A623", color: "#0A1628", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>{loading ? "Guardando..." : "Guardar"}</button>
                  <button type="button" onClick={() => setMostrarForm(false)} style={{ flex: 1, padding: "0.625rem", backgroundColor: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}