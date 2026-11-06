import { requireRol } from "@/lib/session";
import CostosView from "./CostosView";

export default async function CostosPage() {
  const { supabase } = await requireRol(["admin", "direccion", "facturacion"]);
  const { data } = await supabase.from("v_servicios").select("*")
    .not("proveedor_id", "is", null).neq("estatus", "cancelado")
    .order("fecha_carga", { ascending: false }).limit(1000);
  return <CostosView servicios={data || []} />;
}
