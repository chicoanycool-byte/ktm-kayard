import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OperadoresView from "./OperadoresView";

export default async function OperadoresPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: operadores } = await supabase
    .from("operadores")
    .select("*, proveedores(razon_social)")
    .is("deleted_at", null)
    .order("nombre", { ascending: true });

  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, razon_social")
    .eq("estatus", true)
    .is("deleted_at", null)
    .order("razon_social", { ascending: true });

  return <OperadoresView operadores={operadores || []} proveedores={proveedores || []} />;
}