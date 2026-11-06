"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";
import SelectBuscable from "./SelectBuscable";
import { Btn, Buscador, Campo, C, Grid, Modal, Tabla, Td, Titulo, Tr, inputStyle } from "./ui";

export type Opcion = { id: string; nombre: string };
export type CampoDef = {
  key: string;
  label: string;
  tipo?: "texto" | "tel" | "email" | "numero" | "dinero" | "select" | "url";
  requerido?: boolean;
  opciones?: string; // nombre de la lista en `listas`
  enTabla?: boolean;
};

type Fila = Record<string, unknown> & { id: string; activo?: boolean };

// Catálogo genérico: lista con búsqueda + alta/edición en modal + activar/desactivar
export default function Crud({ titulo, tabla, campos, filas: ini, listas = {}, singular }: {
  titulo: string; tabla: string; campos: CampoDef[]; filas: Fila[]; listas?: Record<string, Opcion[]>; singular: string;
}) {
  const [filas, setFilas] = useState(ini);
  const [busqueda, setBusqueda] = useState("");
  const [verInactivos, setVerInactivos] = useState(false);
  const [editando, setEditando] = useState<Fila | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const nombreDe = (lista: string | undefined, id: unknown) =>
    (lista && listas[lista]?.find((o) => o.id === id)?.nombre) || "—";

  const mostrar = (c: CampoDef, f: Fila) => {
    const v = f[c.key];
    if (c.tipo === "select") return nombreDe(c.opciones, v);
    if (c.tipo === "dinero") return money(v as number);
    if (c.tipo === "url" && v) return <a href={String(v)} target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>Ver</a>;
    return (v as string) || "—";
  };

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase();
    return filas.filter((f) => (verInactivos || f.activo !== false) &&
      campos.some((c) => String(c.tipo === "select" ? nombreDe(c.opciones, f[c.key]) : f[c.key] ?? "").toLowerCase().includes(q)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, busqueda, verInactivos]);

  function abrir(f: Fila | null) {
    setEditando(f);
    setError("");
    setForm(Object.fromEntries(campos.map((c) => [c.key, f && f[c.key] != null ? String(f[c.key]) : ""])));
    setAbierto(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const datos: Record<string, unknown> = {};
    for (const c of campos) {
      const v = form[c.key]?.trim() ?? "";
      datos[c.key] = v === "" ? null : (c.tipo === "numero" || c.tipo === "dinero") ? Number(v) : v;
    }
    const q = editando
      ? supabase.from(tabla).update(datos).eq("id", editando.id).select().single()
      : supabase.from(tabla).insert(datos).select().single();
    const { data, error } = await q;
    setLoading(false);
    if (error) {
      setError(error.code === "23505" ? "Ya existe un registro con esos datos." : error.message);
      return;
    }
    setFilas(editando ? filas.map((f) => (f.id === editando.id ? data : f)) : [data, ...filas]);
    setAbierto(false);
    router.refresh();
  }

  async function alternar(f: Fila) {
    const activo = f.activo === false;
    if (!activo && !confirm(`¿Desactivar este registro?`)) return;
    const { error } = await supabase.from(tabla).update({ activo }).eq("id", f.id);
    if (!error) setFilas(filas.map((x) => (x.id === f.id ? { ...x, activo } : x)));
  }

  const colsTabla = campos.filter((c) => c.enTabla !== false);

  return (
    <div>
      <Titulo accion={<Btn onClick={() => abrir(null)}>+ Nuevo {singular}</Btn>}>{titulo}</Titulo>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Buscador value={busqueda} onChange={setBusqueda} />
        <label style={{ color: C.muted, fontSize: 13, marginBottom: "1rem", display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} /> Ver inactivos
        </label>
      </div>
      <Tabla columnas={[...colsTabla.map((c) => c.label), ""]}>
        {filtradas.map((f, i) => (
          <Tr key={f.id} i={i}>
            {colsTabla.map((c, j) => <Td key={c.key} fuerte={j === 0} style={{ opacity: f.activo === false ? 0.45 : 1 }}>{mostrar(c, f)}</Td>)}
            <Td>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn small variante="secundario" onClick={() => abrir(f)}>Editar</Btn>
                <Btn small variante={f.activo === false ? "secundario" : "peligro"} onClick={() => alternar(f)}>{f.activo === false ? "Activar" : "Desactivar"}</Btn>
              </div>
            </Td>
          </Tr>
        ))}
      </Tabla>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{filtradas.length} registros</p>

      {abierto && (
        <Modal titulo={`${editando ? "Editar" : "Nuevo"} ${singular}`} onClose={() => setAbierto(false)}>
          <form onSubmit={guardar}>
            <Grid>
              {campos.map((c) => (
                <Campo key={c.key} label={c.label + (c.requerido ? " *" : "")}>
                  {c.tipo === "select" ? (
                    <SelectBuscable requerido={c.requerido} value={form[c.key] || ""} opciones={listas[c.opciones || ""] || []}
                      onChange={(id) => setForm((f) => ({ ...f, [c.key]: id }))} />
                  ) : (
                    <input required={c.requerido} value={form[c.key] || ""} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                      type={c.tipo === "numero" || c.tipo === "dinero" ? "number" : c.tipo === "tel" ? "tel" : c.tipo === "email" ? "email" : c.tipo === "url" ? "url" : "text"}
                      step={c.tipo === "dinero" ? "0.01" : undefined} min={c.tipo === "dinero" ? 0 : undefined} style={inputStyle} />
                  )}
                </Campo>
              ))}
            </Grid>
            {error && <p style={{ color: C.red, fontSize: 13, marginTop: 12 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <Btn type="submit" disabled={loading} style={{ flex: 1 }}>{loading ? "Guardando…" : "Guardar"}</Btn>
              <Btn variante="secundario" onClick={() => setAbierto(false)} style={{ flex: 1 }}>Cancelar</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
