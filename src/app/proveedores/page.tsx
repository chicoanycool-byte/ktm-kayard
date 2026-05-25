import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProveedoresView from "./ProveedoresView";

export default async function ProveedoresPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("*")
    .is("deleted_at", null)
    .order("razon_social", { ascending: true });

  return <ProveedoresView proveedores={proveedores || []} />;
}