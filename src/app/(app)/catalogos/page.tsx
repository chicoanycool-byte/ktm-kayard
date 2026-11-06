import Crud from "@/components/Crud";
import { traerTodo } from "@/lib/listas";
import { requireRol } from "@/lib/session";

export default async function CatalogosPage() {
  const { supabase } = await requireRol(["admin", "direccion", "operaciones"]);
  const [u, c, p] = await Promise.all([
    supabase.from("tipos_unidad").select("*").order("nombre"),
    supabase.from("tipos_carga").select("*").order("nombre"),
    traerTodo((a, b) => supabase.from("poblaciones").select("*").order("nombre").range(a, b)).then((data) => ({ data })),
  ]);
  return (
    <div style={{ display: "grid", gap: "2.5rem" }}>
      <Crud titulo="Tipos de unidad" singular="tipo de unidad" tabla="tipos_unidad" filas={u.data || []}
        campos={[{ key: "nombre", label: "Tipo de unidad", requerido: true }]} />
      <Crud titulo="Tipos de carga" singular="tipo de carga" tabla="tipos_carga" filas={c.data || []}
        campos={[{ key: "nombre", label: "Tipo de carga", requerido: true }]} />
      <Crud titulo="Poblaciones" singular="población" tabla="poblaciones" filas={p.data || []}
        campos={[{ key: "nombre", label: "Población (Ciudad, Estado)", requerido: true }]} />
    </div>
  );
}
