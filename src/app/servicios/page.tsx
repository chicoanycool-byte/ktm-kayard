import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ServiciosView from "./ServiciosView";

export default async function ServiciosPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: servicios } = await supabase
    .from("servicios")
    .select("*, clientes(razon_social)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, razon_social")
    .eq("estatus", true)
    .is("deleted_at", null)
    .order("razon_social", { ascending: true });

  const { data: clientesCarga } = await supabase
    .from("clientes_carga")
    .select("*")
    .is("deleted_at", null)
    .order("nombre", { ascending: true });

  const { data: clientesDescarga } = await supabase
    .from("clientes_descarga")
    .select("*")
    .is("deleted_at", null)
    .order("nombre", { ascending: true });

  return (
    <ServiciosView
      servicios={servicios || []}
      clientes={clientes || []}
      clientesCarga={clientesCarga || []}
      clientesDescarga={clientesDescarga || []}
    />
  );
}