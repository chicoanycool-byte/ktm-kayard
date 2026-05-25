import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FacturacionView from "./FacturacionView";

export default async function FacturacionPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: facturas } = await supabase
    .from("facturacion")
    .select("*, servicios(folio, clientes(razon_social), proveedores(razon_social))")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { data: servicios } = await supabase
    .from("servicios")
    .select("id, folio, clientes(razon_social)")
    .is("deleted_at", null)
    .order("folio", { ascending: false });

  return (
    <FacturacionView
      facturas={(facturas || []) as any[]}
      servicios={(servicios || []) as any[]}
    />
  );
}