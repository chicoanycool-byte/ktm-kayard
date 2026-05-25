import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UnidadesView from "./UnidadesView";

export default async function UnidadesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: unidades } = await supabase
    .from("unidades")
    .select("*, proveedores(razon_social)")
    .is("deleted_at", null)
    .order("placas", { ascending: true });

  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, razon_social")
    .eq("estatus", true)
    .is("deleted_at", null)
    .order("razon_social", { ascending: true });

  return <UnidadesView unidades={unidades || []} proveedores={proveedores || []} />;
}