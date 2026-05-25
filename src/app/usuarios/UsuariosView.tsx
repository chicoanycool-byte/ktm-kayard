"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Usuario {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador General", direccion: "Dirección", operaciones: "Operaciones",
  facturacion: "Facturación", monitoreo: "Monitoreo", cliente: "Cliente", proveedor: "Proveedor",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "#EF4444", direccion: "#A78BFA", operaciones: "#5BA3D9",
  facturacion: "#22C55E", monitoreo: "#F5A623", cliente: "rgba(255,255,255,0.5)", proveedor: "#FB923C",
};

export default function UsuariosView({ usuarios: ini }: { usuarios: Usuario[] }) {
  const [usuarios, setUsuarios] = useState(ini);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", role: "operaciones", password: "" });
  const router = useRouter();
  const supabase = createClient();

  const filtrados = usuarios.filter((u) =>
    u.full_name.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.role.toLowerCase().includes(busqueda.toLowerCase())
  );

  function abrirNuevo() {
    setEditando(null);
    setForm({ full_name: "", email: "", role: "operaciones", password: "" });
    setMostrarForm(true);
  }

  function abrirEditar(u: Usuario) {
    setEditando(u);
    setForm({ full_name: u.full_name, email: u.email, role: u.role, password: "" });
    setMostrarForm(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (editando) {
      await supabase.from("profiles").update({ full_name: form.full_name, role: form.role }).eq("id", editando.id);
      setUsuarios(usuarios.map((u) => u.id === editando.id ? { ...u, full_name: form.full_name, role: form.role } : u));
    }
    setLoading(false);
    setMostrarForm(false);
    router.refresh();
  }

  async function toggleActivo(id: string, activo: boolean) {
    await supabase.from("profiles").update({ is_active: !activo }).eq("id", id);
    setUsuarios(usuarios.map((u) => u.id === id ? { ...u, is_active: !activo } : u));
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
          <h2 style={{ color: "white", fontSize: 22, fontWeight: 700, margin: 0 }}>Gestión de Usuarios</h2>
          <button onClick={abrirNuevo} style={{ backgroundColor: "#F5A623", color: "#0A1628", padding: "0.5rem 1.25rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}>+ Nuevo Usuario</button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total usuarios", valor: usuarios.length, color: "#F5A623" },
            { label: "Activos", valor: usuarios.filter(u => u.is_active).length, color: "#22C55E" },
            { label: "Inactivos", valor: usuarios.filter(u => !u.is_active).length, color: "#EF4444" },
            { label: "Roles distintos", valor: new Set(usuarios.map(u => u.role)).size, color: "#5BA3D9" },
          ].map((kpi) => (
            <div key={kpi.label} style={{ backgroundColor: "#1B3A5C", borderRadius: 12, padding: "1rem", borderLeft: `4px solid ${kpi.color}` }}>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{kpi.label}</p>
              <p style={{ margin: "0.25rem 0 0", fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.valor}</p>
            </div>
          ))}
        </div>

        <input type="text" placeholder="Buscar por nombre, correo o rol..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          style={{ padding: "0.5rem 1rem", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, marginBottom: "1rem", width: "100%", maxWidth: 400, fontSize: 14, backgroundColor: "#1B3A5C", color: "white" }} />

        <div style={{ backgroundColor: "#1B3A5C", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ backgroundColor: "#0A1628", borderBottom: "2px solid rgba(245,166,35,0.3)" }}>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Nombre</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Correo</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Rol</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Estatus</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Último acceso</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>No hay usuarios</td></tr>
              ) : (
                filtrados.map((u, i) => (
                  <tr key={u.id} style={{ backgroundColor: i % 2 === 0 ? "#1B3A5C" : "#162F4A", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#F5A623", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#0A1628", fontSize: 14, flexShrink: 0 }}>
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500, color: "white" }}>{u.full_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{u.email}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ padding: "0.25rem 0.75rem", borderRadius: 999, fontSize: 12, fontWeight: 600, backgroundColor: `${ROLE_COLORS[u.role]}20`, color: ROLE_COLORS[u.role] || "rgba(255,255,255,0.6)" }}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ padding: "0.25rem 0.75rem", borderRadius: 999, fontSize: 12, fontWeight: 500, backgroundColor: u.is_active ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", color: u.is_active ? "#22C55E" : "#EF4444" }}>
                        {u.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                      {u.last_login ? new Date(u.last_login).toLocaleDateString("es-MX") : "Nunca"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", display: "flex", gap: 8 }}>
                      <button onClick={() => abrirEditar(u)} style={{ fontSize: 12, padding: "0.25rem 0.75rem", border: "1px solid rgba(245,166,35,0.5)", color: "#F5A623", borderRadius: 6, cursor: "pointer", backgroundColor: "transparent" }}>Editar</button>
                      <button onClick={() => toggleActivo(u.id, u.is_active)} style={{ fontSize: 12, padding: "0.25rem 0.75rem", border: `1px solid ${u.is_active ? "rgba(239,68,68,0.5)" : "rgba(34,197,94,0.5)"}`, color: u.is_active ? "#EF4444" : "#22C55E", borderRadius: 6, cursor: "pointer", backgroundColor: "transparent" }}>
                        {u.is_active ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: "0.75rem" }}>Total: {filtrados.length} usuarios</p>
      </main>

      {mostrarForm && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ backgroundColor: "#1B3A5C", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 480, border: "1px solid rgba(245,166,35,0.2)" }}>
            <h3 style={{ color: "white", fontSize: 18, fontWeight: "bold", marginBottom: "1.5rem" }}>{editando ? "Editar Usuario" : "Nuevo Usuario"}</h3>
            <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div><label style={labelStyle}>Nombre completo *</label>
                <input type="text" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} style={inputStyle} />
              </div>
              {!editando && (
                <>
                  <div><label style={labelStyle}>Correo electrónico *</label>
                    <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
                  </div>
                  <div><label style={labelStyle}>Contraseña *</label>
                    <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={inputStyle} />
                  </div>
                </>
              )}
              <div><label style={labelStyle}>Rol *</label>
                <select required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={inputStyle}>
                  {Object.entries(ROLE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
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