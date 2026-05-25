import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TarifasView from "./TarifasView";

export default async function TarifasPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: tarifasVenta } = await supabase
    .from("tarifas_venta")
    .select("*, clientes(razon_social)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { data: tarifasCompra } = await supabase
    .from("tarifas_compra")
    .select("*, proveedores(razon_social)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, razon_social")
    .eq("estatus", true)
    .is("deleted_at", null)
    .order("razon_social", { ascending: true });

  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, razon_social")
    .eq("estatus", true)
    .is("deleted_at", null)
    .order("razon_social", { ascending: true });

  return (
    <TarifasView
      tarifasVenta={tarifasVenta || []}
      tarifasCompra={tarifasCompra || []}
      clientes={clientes || []}
      proveedores={proveedores || []}
    />
  );
}