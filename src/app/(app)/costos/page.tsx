import { traerTodo } from "@/lib/listas";
import { requireRol } from "@/lib/session";
import CostosView from "./CostosView";

export default async function CostosPage() {
  const { supabase } = await requireRol(["admin", "direccion", "facturacion"]);
  const data = await traerTodo((a, b) => supabase.from("v_servicios").select("*")
    .not("proveedor_id", "is", null).neq("estatus", "cancelado")
    .order("fecha_carga", { ascending: false }).order("id_track", { ascending: false }).range(a, b));
  return <CostosView servicios={data || []} />;
}
