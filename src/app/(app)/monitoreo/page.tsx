import { requireRol } from "@/lib/session";
import MonitoreoView from "./MonitoreoView";

export default async function MonitoreoPage() {
  const { supabase, perfil } = await requireRol(["admin", "direccion", "operaciones", "monitoreo"]);
  // eslint-disable-next-line react-hooks/purity
  const desde = new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString().slice(0, 10);
  const { data } = await supabase.from("v_servicios").select("*")
    .or(`estatus.not.in.(finalizado,cancelado),fecha_carga.gte.${desde}`)
    .order("fecha_carga", { ascending: true });
  return <MonitoreoView servicios={data || []} esAdmin={perfil.role === "admin"} />;
}
