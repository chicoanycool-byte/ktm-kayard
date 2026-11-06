import { requireRol } from "@/lib/session";
import AsignarView from "./AsignarView";

export default async function AsignarPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const { supabase, perfil } = await requireRol(["admin", "direccion", "operaciones", "compras"]);
  const esAdmin = perfil.role === "admin";
  const [{ data: servicios }, { data: proveedores }, { data: operadores }, { data: extra }] = await Promise.all([
    supabase.from("v_servicios").select("*").in("estatus", ["programado", "asignado"]).order("fecha_carga", { ascending: true }),
    supabase.from("proveedores").select("id, nombre, contacto_nombre, contacto_telefono").eq("activo", true).order("nombre"),
    supabase.from("operadores").select("id, nombre, telefono, folio_licencia, proveedor_id").eq("activo", true).order("nombre"),
    // El administrador puede editar el transporte de un servicio en cualquier estatus
    esAdmin && id ? supabase.from("v_servicios").select("*").eq("id", id) : Promise.resolve({ data: [] as never[] }),
  ]);
  const lista = [...(extra || []).filter((x: { id: string }) => !(servicios || []).some((s) => s.id === x.id)), ...(servicios || [])];
  return <AsignarView servicios={lista} proveedores={proveedores || []} operadores={operadores || []} seleccionadoId={id} />;
}
