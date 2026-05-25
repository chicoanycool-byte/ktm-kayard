import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MonitoreoView from "./MonitoreoView";

export default async function MonitoreoPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: servicios } = await supabase
    .from("servicios")
    .select("*, clientes(razon_social), proveedores(razon_social), operadores(nombre), unidades(placas)")
    .not("estatus", "eq", "cancelado")
    .is("deleted_at", null)
    .order("fecha_cita_carga", { ascending: true });

  const { data: monitoreos } = await supabase
    .from("monitoreo")
    .select("*");

  return (
    <MonitoreoView
      servicios={servicios || []}
      monitoreos={monitoreos || []}
    />
  );
}