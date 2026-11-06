"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ROLES } from "@/lib/constants";
import { Btn, Buscador, C, Campo, Grid, Modal, Tabla, Td, Titulo, Tr, inputStyle } from "@/components/ui";
import { cambiarPassword, crearUsuario } from "./actions";

type Usuario = { id: string; full_name: string; email: string; role: string; is_active: boolean };

export default function UsuariosView({ usuarios: ini, yo }: { usuarios: Usuario[]; yo: string }) {
  const [usuarios, setUsuarios] = useState(ini);
  const [busqueda, setBusqueda] = useState("");
  const [modo, setModo] = useState<"nuevo" | "editar" | "password" | null>(null);
  const [sel, setSel] = useState<Usuario | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", role: "operaciones", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const filtrados = usuarios.filter((u) => [u.full_name, u.email, ROLES[u.role]].some((v) => (v || "").toLowerCase().includes(busqueda.toLowerCase())));

  function abrir(m: typeof modo, u: Usuario | null = null) {
    setSel(u);
    setError("");
    setForm({ full_name: u?.full_name || "", email: u?.email || "", role: u?.role || "operaciones", password: "" });
    setModo(m);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (modo === "nuevo") {
      const r = await crearUsuario(form);
      setLoading(false);
      if (!r.ok) return setError(r.error || "Error");
      setModo(null);
      router.refresh();
      return;
    }
    if (modo === "password" && sel) {
      const r = await cambiarPassword(sel.id, form.password);
      setLoading(false);
      if (!r.ok) return setError(r.error || "Error");
      setModo(null);
      return;
    }
    if (sel) {
      const { error } = await supabase.from("profiles").update({ full_name: form.full_name, role: form.role }).eq("id", sel.id);
      setLoading(false);
      if (error) return setError(error.message);
      setUsuarios(usuarios.map((u) => (u.id === sel.id ? { ...u, full_name: form.full_name, role: form.role } : u)));
      setModo(null);
    }
  }

  async function alternar(u: Usuario) {
    if (u.id === yo) return;
    const { error } = await supabase.from("profiles").update({ is_active: !u.is_active }).eq("id", u.id);
    if (!error) setUsuarios(usuarios.map((x) => (x.id === u.id ? { ...x, is_active: !u.is_active } : x)));
  }

  return (
    <div>
      <Titulo accion={<Btn onClick={() => abrir("nuevo")}>+ Nuevo usuario</Btn>}>Usuarios</Titulo>
      <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar nombre, correo o rol…" />
      <Tabla columnas={["Nombre", "Correo", "Rol", "Estatus", ""]}>
        {filtrados.map((u, i) => (
          <Tr key={u.id} i={i}>
            <Td fuerte>{u.full_name || "—"}</Td>
            <Td>{u.email}</Td>
            <Td>{ROLES[u.role] || u.role}</Td>
            <Td><span style={{ color: u.is_active ? C.green : C.red, fontWeight: 600, fontSize: 12 }}>{u.is_active ? "Activo" : "Inactivo"}</span></Td>
            <Td>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn small variante="secundario" onClick={() => abrir("editar", u)}>Editar</Btn>
                <Btn small variante="secundario" onClick={() => abrir("password", u)}>Contraseña</Btn>
                {u.id !== yo && <Btn small variante={u.is_active ? "peligro" : "secundario"} onClick={() => alternar(u)}>{u.is_active ? "Desactivar" : "Activar"}</Btn>}
              </div>
            </Td>
          </Tr>
        ))}
      </Tabla>

      {modo && (
        <Modal titulo={modo === "nuevo" ? "Nuevo usuario" : modo === "password" ? `Contraseña de ${sel?.full_name}` : "Editar usuario"} onClose={() => setModo(null)} ancho={480}>
          <form onSubmit={guardar}>
            <Grid>
              {modo !== "password" && <Campo label="Nombre completo *"><input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} style={inputStyle} /></Campo>}
              {modo === "nuevo" && <Campo label="Correo *"><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} /></Campo>}
              {modo !== "password" && (
                <Campo label="Rol *">
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={inputStyle} disabled={sel?.id === yo}>
                    {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Campo>
              )}
              {modo !== "editar" && <Campo label="Contraseña (mín. 8) *"><input required minLength={8} type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={inputStyle} /></Campo>}
            </Grid>
            {error && <p style={{ color: C.red, fontSize: 13 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <Btn type="submit" disabled={loading} style={{ flex: 1 }}>{loading ? "Guardando…" : "Guardar"}</Btn>
              <Btn variante="secundario" onClick={() => setModo(null)} style={{ flex: 1 }}>Cancelar</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
