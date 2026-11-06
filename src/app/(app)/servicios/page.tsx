import { cargarListas } from "@/lib/listas";
import { requireRol } from "@/lib/session";
import ServiciosView from "./ServiciosView";

export default async function ServiciosPage() {
  const { supabase } = await requireRol(["admin", "direccion", "operaciones", "ventas"]);
  const [{ data: servicios }, listas] = await Promise.all([
    supabase.from("v_servicios").select("*").order("created_at", { ascending: false }).limit(500),
    cargarListas(supabase, ["clientes", "tipos_unidad", "tipos_carga", "poblaciones", "clientes_cd"]),
  ]);
  return <ServiciosView servicios={servicios || []} listas={listas} />;
}
