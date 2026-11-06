import Crud from "@/components/Crud";
import { cargarListas } from "@/lib/listas";
import { requireRol } from "@/lib/session";

export default async function OperadoresPage() {
  const { supabase } = await requireRol(["admin", "direccion", "compras", "operaciones"]);
  const [{ data }, listas] = await Promise.all([
    supabase.from("operadores").select("*").order("nombre"),
    cargarListas(supabase, ["proveedores"]),
  ]);
  return (
    <Crud titulo="Catálogo de operadores" singular="operador" tabla="operadores" filas={data || []} listas={listas}
      campos={[
        { key: "nombre", label: "Nombre del operador", requerido: true },
        { key: "telefono", label: "Teléfono", tipo: "tel" },
        { key: "folio_licencia", label: "Folio licencia" },
        { key: "proveedor_id", label: "Transportista", tipo: "select", opciones: "proveedores", requerido: true },
      ]} />
  );
}
