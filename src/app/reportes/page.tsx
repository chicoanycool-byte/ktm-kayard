import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReportesView from "./ReportesView";

export default async function ReportesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: servicios } = await supabase
    .from("servicios")
    .select("*, clientes(razon_social), proveedores(razon_social)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { data: monitoreos } = await supabase
    .from("monitoreo")
    .select("*");

  const { data: facturas } = await supabase
    .from("facturacion")
    .select("*, servicios(folio, clientes(razon_social), proveedores(razon_social))")
    .is("deleted_at", null);

  return (
    <ReportesView
      servicios={servicios || []}
      monitoreos={monitoreos || []}
      facturas={facturas || []}
    />
  );
}