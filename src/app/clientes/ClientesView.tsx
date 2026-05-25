"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Cliente {
  id: string;
  razon_social: string;
  nombre_comercial?: string;
  rfc?: string;
  contacto?: string;
  correo?: string;
  telefono?: string;
  estatus: boolean;
}

export default function ClientesView({ clientes: ini }: { clientes: Cliente[] }) {
  const [clientes, setClientes] = useState(ini);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState({ razon_social: "", nombre_comercial: "", rfc: "", contacto: "", correo: "", telefono: "" });
  const router = useRouter();
  const supabase = createClient();

  const filtrados = clientes.filter((c) =>
    c.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.rfc && c.rfc.toLowerCase().includes(busqueda.toLowerCase()))
  );

  function abrirNuevo() {
    setEditando(null);
    setForm({ razon_social: "", nombre_comercial: "", rfc: "", contacto: "", correo: "", telefono: "" });
    setMostrarForm(true);
  }

  function abrirEditar(c: Cliente) {
    setEditando(c);
    setForm({ razon_social: c.razon_social, nombre_comercial: c.nombre_comercial || "", rfc: c.rfc || "", contacto: c.contacto || "", correo: c.correo || "", telefono: c.telefono || "" });
    setMostrarForm(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (editando) {
      await supabase.from("clientes").update(form).eq("id", editando.id);
      setClientes(clientes.map((c) => c.id === editando.id ? { ...c, ...form } : c));
    } else {
      const { data } = await supabase.from("clientes").insert([{ ...form, estatus: true }]).select().single();
      if (data) setClientes([...clientes, data]);
    }
    setLoading(false);
    setMostrarForm(false);
    router.refresh();
  }

  async function desactivar(id: string) {
    if (!confirm("¿Desactivar este cliente?")) return;
    await supabase.from("clientes").update({ estatus: false }).eq("id", id);
    setClientes(clientes.map((c) => c.id === id ? { ...c, estatus: false } : c));
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
          <h2 style={{ color: "white", fontSize: 22, fontWeight: 700, margin: 0 }}>Catálogo de Clientes</h2>
          <button onClick={abrirNuevo} style={{ backgroundColor: "#F5A623", color: "#0A1628", padding: "0.5rem 1.25rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}>+ Nuevo Cliente</button>
        </div>

        <input type="text" placeholder="Buscar por nombre o RFC..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          style={{ padding: "0.5rem 1rem", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, marginBottom: "1rem", width: "100%", maxWidth: 400, fontSize: 14, backgroundColor: "#1B3A5C", color: "white" }} />

        <div style={{ backgroundColor: "#1B3A5C", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ backgroundColor: "#0A1628", borderBottom: "2px solid rgba(245,166,35,0.3)" }}>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Razón Social</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>RFC</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Contacto</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Teléfono</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Estatus</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>No hay clientes registrados</td></tr>
              ) : (
                filtrados.map((c, i) => (
                  <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? "#1B3A5C" : "#162F4A", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 500, color: "white" }}>{c.razon_social}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{c.rfc || "-"}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{c.contacto || "-"}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{c.telefono || "-"}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ padding: "0.25rem 0.75rem", borderRadius: 999, fontSize: 12, fontWeight: 500, backgroundColor: c.estatus ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", color: c.estatus ? "#22C55E" : "#EF4444" }}>
                        {c.estatus ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", display: "flex", gap: 8 }}>
                      <button onClick={() => abrirEditar(c)} style={{ fontSize: 12, padding: "0.25rem 0.75rem", border: "1px solid rgba(245,166,35,0.5)", color: "#F5A623", borderRadius: 6, cursor: "pointer", backgroundColor: "transparent" }}>Editar</button>
                      {c.estatus && <button onClick={() => desactivar(c.id)} style={{ fontSize: 12, padding: "0.25rem 0.75rem", border: "1px solid rgba(239,68,68,0.5)", color: "#EF4444", borderRadius: 6, cursor: "pointer", backgroundColor: "transparent" }}>Desactivar</button>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: "0.75rem" }}>Total: {filtrados.length} clientes</p>
      </main>

      {mostrarForm && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ backgroundColor: "#1B3A5C", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 480, border: "1px solid rgba(245,166,35,0.2)" }}>
            <h3 style={{ color: "white", fontSize: 20, fontWeight: "bold", marginBottom: "1.5rem" }}>{editando ? "Editar Cliente" : "Nuevo Cliente"}</h3>
            <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { label: "Razón Social *", key: "razon_social", required: true },
                { label: "Nombre Comercial", key: "nombre_comercial", required: false },
                { label: "RFC", key: "rfc", required: false },
                { label: "Contacto", key: "contacto", required: false },
                { label: "Correo", key: "correo", required: false },
                { label: "Teléfono", key: "telefono", required: false },
              ].map(({ label, key, required }) => (
                <div key={key}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 4 }}>{label}</label>
                  <input type="text" required={required} value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem 1rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 14, boxSizing: "border-box", backgroundColor: "#0F2540", color: "white" }} />
                </div>
              ))}
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