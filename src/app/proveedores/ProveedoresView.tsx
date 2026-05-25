"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Proveedor {
  id: string;
  razon_social: string;
  rfc?: string;
  contacto_operativo?: string;
  telefono_operativo?: string;
  correo_operativo?: string;
  contacto_administrativo?: string;
  telefono_administrativo?: string;
  correo_administrativo?: string;
  contacto_cxc?: string;
  telefono_cxc?: string;
  correo_cxc?: string;
  estatus: boolean;
}

export default function ProveedoresView({ proveedores: ini }: { proveedores: Proveedor[] }) {
  const [proveedores, setProveedores] = useState(ini);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [form, setForm] = useState({
    razon_social: "", rfc: "",
    contacto_operativo: "", telefono_operativo: "", correo_operativo: "",
    contacto_administrativo: "", telefono_administrativo: "", correo_administrativo: "",
    contacto_cxc: "", telefono_cxc: "", correo_cxc: "",
  });
  const router = useRouter();
  const supabase = createClient();

  const filtrados = proveedores.filter((p) =>
    p.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.rfc && p.rfc.toLowerCase().includes(busqueda.toLowerCase()))
  );

  function abrirNuevo() {
    setEditando(null);
    setForm({ razon_social: "", rfc: "", contacto_operativo: "", telefono_operativo: "", correo_operativo: "", contacto_administrativo: "", telefono_administrativo: "", correo_administrativo: "", contacto_cxc: "", telefono_cxc: "", correo_cxc: "" });
    setMostrarForm(true);
  }

  function abrirEditar(p: Proveedor) {
    setEditando(p);
    setForm({
      razon_social: p.razon_social, rfc: p.rfc || "",
      contacto_operativo: p.contacto_operativo || "", telefono_operativo: p.telefono_operativo || "", correo_operativo: p.correo_operativo || "",
      contacto_administrativo: p.contacto_administrativo || "", telefono_administrativo: p.telefono_administrativo || "", correo_administrativo: p.correo_administrativo || "",
      contacto_cxc: p.contacto_cxc || "", telefono_cxc: p.telefono_cxc || "", correo_cxc: p.correo_cxc || "",
    });
    setMostrarForm(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (editando) {
      await supabase.from("proveedores").update(form).eq("id", editando.id);
      setProveedores(proveedores.map((p) => p.id === editando.id ? { ...p, ...form } : p));
    } else {
      const { data } = await supabase.from("proveedores").insert([{ ...form, estatus: true }]).select().single();
      if (data) setProveedores([...proveedores, data]);
    }
    setLoading(false);
    setMostrarForm(false);
    router.refresh();
  }

  async function desactivar(id: string) {
    if (!confirm("¿Desactivar este proveedor?")) return;
    await supabase.from("proveedores").update({ estatus: false }).eq("id", id);
    setProveedores(proveedores.map((p) => p.id === id ? { ...p, estatus: false } : p));
  }

  const seccion = (titulo: string) => (
    <div style={{ backgroundColor: "#0A1628", padding: "0.4rem 1rem", borderRadius: 6, borderLeft: "3px solid #F5A623" }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "#F5A623", margin: 0 }}>{titulo}</p>
    </div>
  );

  const campo = (label: string, key: string, required = false, type = "text") => (
    <div key={key}>
      <label style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 3 }}>{label}</label>
      <input type={type} required={required} value={form[key as keyof typeof form]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        style={{ width: "100%", padding: "0.4rem 0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 13, boxSizing: "border-box", backgroundColor: "#0F2540", color: "white" }} />
    </div>
  );

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
          <h2 style={{ color: "white", fontSize: 22, fontWeight: 700, margin: 0 }}>Catálogo de Proveedores</h2>
          <button onClick={abrirNuevo} style={{ backgroundColor: "#F5A623", color: "#0A1628", padding: "0.5rem 1.25rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}>+ Nuevo Proveedor</button>
        </div>

        <input type="text" placeholder="Buscar por nombre o RFC..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          style={{ padding: "0.5rem 1rem", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, marginBottom: "1rem", width: "100%", maxWidth: 400, fontSize: 14, backgroundColor: "#1B3A5C", color: "white" }} />

        <div style={{ backgroundColor: "#1B3A5C", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ backgroundColor: "#0A1628", borderBottom: "2px solid rgba(245,166,35,0.3)" }}>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Razón Social</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>RFC</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Contacto Operativo</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Teléfono</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Estatus</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#F5A623" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>No hay proveedores registrados</td></tr>
              ) : (
                filtrados.map((p, i) => (
                  <tr key={p.id} style={{ backgroundColor: i % 2 === 0 ? "#1B3A5C" : "#162F4A", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 500, color: "white" }}>{p.razon_social}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{p.rfc || "-"}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{p.contacto_operativo || "-"}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>{p.telefono_operativo || "-"}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ padding: "0.25rem 0.75rem", borderRadius: 999, fontSize: 12, fontWeight: 500, backgroundColor: p.estatus ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", color: p.estatus ? "#22C55E" : "#EF4444" }}>
                        {p.estatus ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", display: "flex", gap: 8 }}>
                      <button onClick={() => abrirEditar(p)} style={{ fontSize: 12, padding: "0.25rem 0.75rem", border: "1px solid rgba(245,166,35,0.5)", color: "#F5A623", borderRadius: 6, cursor: "pointer", backgroundColor: "transparent" }}>Editar</button>
                      {p.estatus && <button onClick={() => desactivar(p.id)} style={{ fontSize: 12, padding: "0.25rem 0.75rem", border: "1px solid rgba(239,68,68,0.5)", color: "#EF4444", borderRadius: 6, cursor: "pointer", backgroundColor: "transparent" }}>Desactivar</button>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: "0.75rem" }}>Total: {filtrados.length} proveedores</p>
      </main>

      {mostrarForm && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ backgroundColor: "#1B3A5C", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", border: "1px solid rgba(245,166,35,0.2)" }}>
            <h3 style={{ color: "white", fontSize: 18, fontWeight: "bold", marginBottom: "1rem" }}>{editando ? "Editar Proveedor" : "Nuevo Proveedor"}</h3>
            <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {campo("Razón Social *", "razon_social", true)}
              {campo("RFC", "rfc")}
              {seccion("Contacto Operativo")}
              {campo("Nombre", "contacto_operativo")}
              {campo("Teléfono", "telefono_operativo")}
              {campo("Correo", "correo_operativo", false, "email")}
              {seccion("Contacto Administrativo")}
              {campo("Nombre", "contacto_administrativo")}
              {campo("Teléfono", "telefono_administrativo")}
              {campo("Correo", "correo_administrativo", false, "email")}
              {seccion("Contacto Cuentas por Cobrar")}
              {campo("Nombre", "contacto_cxc")}
              {campo("Teléfono", "telefono_cxc")}
              {campo("Correo", "correo_cxc", false, "email")}
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