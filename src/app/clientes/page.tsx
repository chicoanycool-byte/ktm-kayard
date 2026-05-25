import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ClientesView from "./ClientesView";

export default async function ClientesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: clientes } = await supabase
    .from("clientes")
    .select("*")
    .is("deleted_at", null)
    .order("razon_social", { ascending: true });

  return <ClientesView clientes={clientes || []} />;
}