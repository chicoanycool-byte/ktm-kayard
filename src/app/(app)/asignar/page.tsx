import { requireRol } from "@/lib/session";
import AsignarView from "./AsignarView";

export default async function AsignarPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const { supabase } = await requireRol(["admin", "direccion", "operaciones", "compras"]);
  const [{ data: servicios }, { data: proveedores }, { data: operadores }] = await Promise.all([
    supabase.from("v_servicios").select("*").in("estatus", ["programado", "asignado"]).order("fecha_carga", { ascending: true }),
    supabase.from("proveedores").select("id, nombre, contacto_nombre, contacto_telefono").eq("activo", true).order("nombre"),
    supabase.from("operadores").select("id, nombre, telefono, folio_licencia, proveedor_id").eq("activo", true).order("nombre"),
  ]);
  return <AsignarView servicios={servicios || []} proveedores={proveedores || []} operadores={operadores || []} seleccionadoId={id} />;
}
