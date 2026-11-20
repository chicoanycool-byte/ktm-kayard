import { cargarListas, traerTodo } from "@/lib/listas";
import { requireRol } from "@/lib/session";
import ServiciosView from "./ServiciosView";

export default async function ServiciosPage() {
  const { supabase, perfil } = await requireRol(["admin", "direccion", "operaciones", "ventas"]);
  const [{ data: servicios }, listas, { data: bloqueados }] = await Promise.all([
    traerTodo((a, b) => supabase.from("v_servicios").select("*").order("created_at", { ascending: false }).order("id_track", { ascending: false }).range(a, b)).then((data) => ({ data })),
    cargarListas(supabase, ["clientes", "tipos_unidad", "tipos_carga", "poblaciones", "clientes_cd", "proveedores"]),
    supabase.from("clientes").select("id, nombre, bloqueo_motivo").eq("bloqueado", true),
  ]);
  return <ServiciosView servicios={servicios || []} listas={listas} esAdmin={perfil.role === "admin"} bloqueados={bloqueados || []} />;
}
