"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Unidad {
  id: string;
  placas: string;
  tipo?: string;
  capacidad?: string;
  modelo?: string;
  anio?: number;
  proveedor_id?: string;
  estatus: boolean;
  proveedores?: { razon_social: string };
}

interface Proveedor {
  id: string;
  razon_social: string;
}

export default function UnidadesView({ unidades: ini, proveedores }: { unidades: Unidad[]; proveedores: Proveedor[] }) {
  const [unidades, setUnidades] = useState(ini);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<Unidad | null>(null);
  const [form, setForm] = useState({ placas: "", tipo: "", capacidad: "", modelo: "", anio: "", proveedor_id: "" });
  const router = useRouter();
  const supabase = createClient();

  const filtrados = unidades.filter((u) =>
    u.placas.toLowerCase().includes(busqueda.toLowerCase()) ||
    (u.tipo && u.tipo.toLowerCase().includes(busqueda.toLowerCase()))
  );

  function abrirNuevo() {
    setEditando(null);
    setForm({ placas: "", tipo: "", capacidad: "", modelo: "", anio: "", proveedor_id: "" });
    setMostrarForm(true);
  }

  function abrirEditar(u: Unidad) {
    setEditando(u);
    setForm({ placas: u.placas, tipo: u.tipo || "", capacidad: u.capacidad || "", modelo: u.modelo || "", anio: u.anio?.toString() || "", proveedor_id: u.proveedor_id || "" });
    setMostrarForm(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const datos = { ...form, anio: form.anio ? parseInt(form.anio) : null };
    if (editando) {
      await supabase.from("unidades").update(datos).eq("id", editando.id);
      setUnidades(unidades.map((u) => u.id === editando.id ? { ...u, ...datos } : u));
    } else {
      const { data } = await supabase.from("unidades").insert([{ ...datos, estatus: true }]).select("*, proveedores(razon_social)").single();
      if (data) setUnidades([...unidades, data]);
    }
    setLoading(false);
    setMostrarForm(false);
    router.refresh();
  }

  async function desactivar(id: string) {
    if (!confirm("¿Desactivar esta unidad?")) return;
    await supabase.from("unidades").update({ estatus: false }).eq("id", id);
    setUnidades(unidades.map((u) => u.id === id ? { ...u, estatus: false } : u));
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
          <h2 style={{ color: "white", fontSize: 22, fontWeight: 700, margin: 0 }}>Catálogo de Unidades</h2>
          <button onClick={abrirNuevo} style={{ backgroundColor: "#F5A623", color: "#0A1628", padding: "0.5rem 1.25rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}>+ Nueva Unidad</button>
        </div>

        <input type="text" placeholder="Buscar por placas o tipo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          style={{ padding: "0.5rem 1rem", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, marginBottom: "1rem", width: "100%", maxWidth: 400, fontSize: 14, backgroundColor: "#1B3A5C", color: "white" }} />

        <div style={{ backgroundColor: "#1B3A5C", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ backgroundColor: "#0A1628", borderBottom: "2px solid rgba(245,166,35,0.3)" }}>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Placas</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Tipo</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Capacidad</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Modelo</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Año</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Proveedor</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Estatus</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>No hay unidades registradas</td></tr>
              ) : (
                filtrados.map((u, i) => (
                  <tr key={u.id} style={{ backgroundColor: i % 2 === 0 ? "#1B3A5C" : "#162F4A", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#F5A623" }}>{u.placas}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{u.tipo || "-"}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{u.capacidad || "-"}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{u.modelo || "-"}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{u.anio || "-"}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{u.proveedores?.razon_social || "-"}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ padding: "0.25rem 0.75rem", borderRadius: 999, fontSize: 12, fontWeight: 500, backgroundColor: u.estatus ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", color: u.estatus ? "#22C55E" : "#EF4444" }}>
                        {u.estatus ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", display: "flex", gap: 8 }}>
                      <button onClick={() => abrirEditar(u)} style={{ fontSize: 12, padding: "0.25rem 0.75rem", border: "1px solid rgba(245,166,35,0.5)", color: "#F5A623", borderRadius: 6, cursor: "pointer", backgroundColor: "transparent" }}>Editar</button>
                      {u.estatus && <button onClick={() => desactivar(u.id)} style={{ fontSize: 12, padding: "0.25rem 0.75rem", border: "1px solid rgba(239,68,68,0.5)", color: "#EF4444", borderRadius: 6, cursor: "pointer", backgroundColor: "transparent" }}>Desactivar</button>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: "0.75rem" }}>Total: {filtrados.length} unidades</p>
      </main>

      {mostrarForm && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ backgroundColor: "#1B3A5C", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", border: "1px solid rgba(245,166,35,0.2)" }}>
            <h3 style={{ color: "white", fontSize: 18, fontWeight: "bold", marginBottom: "1.5rem" }}>{editando ? "Editar Unidad" : "Nueva Unidad"}</h3>
            <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 4 }}>Placas *</label>
                <input type="text" required value={form.placas} onChange={(e) => setForm({ ...form, placas: e.target.value.toUpperCase() })}
                  style={{ width: "100%", padding: "0.5rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 14, boxSizing: "border-box", backgroundColor: "#0F2540", color: "white" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 4 }}>Tipo</label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 14, backgroundColor: "#0F2540", color: "white" }}>
                  <option value="">-- Seleccionar --</option>
                  <option value="Full">Full</option>
                  <option value="Trailer">Trailer</option>
                  <option value="Torton">Torton</option>
                  <option value="Rabon">Rabon</option>
                  <option value="Mudanza">Mudanza</option>
                  <option value="Camioneta 3.5">Camioneta 3.5</option>
                  <option value="Camioneta 1.5">Camioneta 1.5</option>
                  <option value="Automóvil">Automóvil</option>
                  <option value="Consolidado">Consolidado</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 4 }}>Capacidad</label>
                <input type="text" value={form.capacidad} onChange={(e) => setForm({ ...form, capacidad: e.target.value })}
                  placeholder="Ej: 10 toneladas"
                  style={{ width: "100%", padding: "0.5rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 14, boxSizing: "border-box", backgroundColor: "#0F2540", color: "white" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 4 }}>Modelo</label>
                <input type="text" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                  placeholder="Ej: International, Kenworth"
                  style={{ width: "100%", padding: "0.5rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 14, boxSizing: "border-box", backgroundColor: "#0F2540", color: "white" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 4 }}>Año</label>
                <input type="number" value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })}
                  placeholder="Ej: 2020" min="1990" max="2030"
                  style={{ width: "100%", padding: "0.5rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 14, boxSizing: "border-box", backgroundColor: "#0F2540", color: "white" }} />
              </div>
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