"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Operador {
  id: string;
  nombre: string;
  telefono?: string;
  licencia?: string;
  vencimiento_licencia?: string;
  proveedor_id?: string;
  estatus: boolean;
  proveedores?: { razon_social: string };
}

interface Proveedor {
  id: string;
  razon_social: string;
}

export default function OperadoresView({ operadores: ini, proveedores }: { operadores: Operador[]; proveedores: Proveedor[] }) {
  const [operadores, setOperadores] = useState(ini);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<Operador | null>(null);
  const [form, setForm] = useState({ nombre: "", telefono: "", licencia: "", vencimiento_licencia: "", proveedor_id: "" });
  const router = useRouter();
  const supabase = createClient();

  const filtrados = operadores.filter((o) =>
    o.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (o.licencia && o.licencia.toLowerCase().includes(busqueda.toLowerCase()))
  );

  function abrirNuevo() {
    setEditando(null);
    setForm({ nombre: "", telefono: "", licencia: "", vencimiento_licencia: "", proveedor_id: "" });
    setMostrarForm(true);
  }

  function abrirEditar(o: Operador) {
    setEditando(o);
    setForm({ nombre: o.nombre, telefono: o.telefono || "", licencia: o.licencia || "", vencimiento_licencia: o.vencimiento_licencia || "", proveedor_id: o.proveedor_id || "" });
    setMostrarForm(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (editando) {
      await supabase.from("operadores").update(form).eq("id", editando.id);
      setOperadores(operadores.map((o) => o.id === editando.id ? { ...o, ...form } : o));
    } else {
      const { data } = await supabase.from("operadores").insert([{ ...form, estatus: true }]).select("*, proveedores(razon_social)").single();
      if (data) setOperadores([...operadores, data]);
    }
    setLoading(false);
    setMostrarForm(false);
    router.refresh();
  }

  async function desactivar(id: string) {
    if (!confirm("¿Desactivar este operador?")) return;
    await supabase.from("operadores").update({ estatus: false }).eq("id", id);
    setOperadores(operadores.map((o) => o.id === id ? { ...o, estatus: false } : o));
  }

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
          <h2 style={{ color: "white", fontSize: 22, fontWeight: 700, margin: 0 }}>Catálogo de Operadores</h2>
          <button onClick={abrirNuevo} style={{ backgroundColor: "#F5A623", color: "#0A1628", padding: "0.5rem 1.25rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}>+ Nuevo Operador</button>
        </div>

        <input type="text" placeholder="Buscar por nombre o licencia..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          style={{ padding: "0.5rem 1rem", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, marginBottom: "1rem", width: "100%", maxWidth: 400, fontSize: 14, backgroundColor: "#1B3A5C", color: "white" }} />

        <div style={{ backgroundColor: "#1B3A5C", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ backgroundColor: "#0A1628", borderBottom: "2px solid rgba(245,166,35,0.3)" }}>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Nombre</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Teléfono</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Licencia</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Vencimiento</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Proveedor</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Estatus</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>No hay operadores registrados</td></tr>
              ) : (
                filtrados.map((o, i) => {
                  const hoy = new Date();
                  const venc = o.vencimiento_licencia ? new Date(o.vencimiento_licencia) : null;
                  const dias = venc ? Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)) : null;
                  const colorVenc = dias === null ? "rgba(255,255,255,0.6)" : dias < 0 ? "#EF4444" : dias < 30 ? "#F5A623" : "#22C55E";
                  return (
                    <tr key={o.id} style={{ backgroundColor: i % 2 === 0 ? "#1B3A5C" : "#162F4A", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 500, color: "white" }}>{o.nombre}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{o.telefono || "-"}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{o.licencia || "-"}</td>
                      <td style={{ padding: "0.75rem 1rem", color: colorVenc, fontWeight: 500 }}>
                        {o.vencimiento_licencia ? new Date(o.vencimiento_licencia).toLocaleDateString("es-MX") : "-"}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{o.proveedores?.razon_social || "-"}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{ padding: "0.25rem 0.75rem", borderRadius: 999, fontSize: 12, fontWeight: 500, backgroundColor: o.estatus ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", color: o.estatus ? "#22C55E" : "#EF4444" }}>
                          {o.estatus ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", display: "flex", gap: 8 }}>
                        <button onClick={() => abrirEditar(o)} style={{ fontSize: 12, padding: "0.25rem 0.75rem", border: "1px solid rgba(245,166,35,0.5)", color: "#F5A623", borderRadius: 6, cursor: "pointer", backgroundColor: "transparent" }}>Editar</button>
                        {o.estatus && <button onClick={() => desactivar(o.id)} style={{ fontSize: 12, padding: "0.25rem 0.75rem", border: "1px solid rgba(239,68,68,0.5)", color: "#EF4444", borderRadius: 6, cursor: "pointer", backgroundColor: "transparent" }}>Desactivar</button>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: "0.75rem" }}>Total: {filtrados.length} operadores</p>
      </main>

      {mostrarForm && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ backgroundColor: "#1B3A5C", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 480, border: "1px solid rgba(245,166,35,0.2)" }}>
            <h3 style={{ color: "white", fontSize: 18, fontWeight: "bold", marginBottom: "1.5rem" }}>{editando ? "Editar Operador" : "Nuevo Operador"}</h3>
            <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { label: "Nombre *", key: "nombre", required: true, type: "text" },
                { label: "Teléfono", key: "telefono", required: false, type: "text" },
                { label: "Licencia", key: "licencia", required: false, type: "text" },
                { label: "Vencimiento de Licencia", key: "vencimiento_licencia", required: false, type: "date" },
              ].map(({ label, key, required, type }) => (
                <div key={key}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 4 }}>{label}</label>
                  <input type={type} required={required} value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem 1rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 14, boxSizing: "border-box", backgroundColor: "#0F2540", color: "white" }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 4 }}>Proveedor</label>
                <select value={form.proveedor_id} onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 14, backgroundColor: "#0F2540", color: "white" }}>
                  <option value="">-- Seleccionar --</option>
                  {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: "0.625rem", backgroundColor: "#F5A623", color: "#0A1628", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
                  {loading ? "Guardando..." : "Guardar"}
                </button>
                <button type="button" onClick={() => setMostrarForm(false)} style={{ flex: 1, padding: "0.625rem", backgroundColor: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer" }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}