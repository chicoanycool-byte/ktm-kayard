import { cargarListas, traerTodo } from "@/lib/listas";
import { requireRol } from "@/lib/session";
import { mezclarConfig } from "@/lib/cotizador";
import CotizadorView, { type Cotizacion } from "./CotizadorView";

export const dynamic = "force-dynamic";

export default async function CotizadorPage() {
  const { supabase, perfil } = await requireRol(["admin", "direccion", "ventas"]);
  const [{ data: cfgRow }, listas, { data: clientes }, cotizaciones] = await Promise.all([
    supabase.from("cotizador_config").select("datos").eq("id", 1).maybeSingle(),
    cargarListas(supabase, ["poblaciones"]),
    supabase.from("clientes").select("id, nombre, contacto_nombre").eq("activo", true).order("nombre"),
    traerTodo<Cotizacion>((a, b) => supabase.from("cotizaciones").select("*").order("created_at", { ascending: false }).range(a, b)),
  ]);
  return (
    <CotizadorView
      config={mezclarConfig(cfgRow?.datos)}
      poblaciones={listas.poblaciones || []}
      clientes={(clientes || []) as { id: string; nombre: string; contacto_nombre: string | null }[]}
      cotizaciones={cotizaciones}
      esAdmin={["admin", "direccion"].includes(perfil.role)}
    />
  );
}
