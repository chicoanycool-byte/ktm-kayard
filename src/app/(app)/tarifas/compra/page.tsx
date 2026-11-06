import Crud from "@/components/Crud";
import { cargarListas } from "@/lib/listas";
import { requireRol } from "@/lib/session";

export default async function TarifasCompraPage() {
  const { supabase } = await requireRol(["admin", "direccion", "compras"]);
  const [{ data }, listas] = await Promise.all([
    supabase.from("tarifas_compra").select("*").order("created_at", { ascending: false }),
    cargarListas(supabase, ["proveedores", "tipos_unidad", "tipos_carga", "poblaciones"]),
  ]);
  return (
    <Crud titulo="Tarifas de compra" singular="tarifa" tabla="tarifas_compra" filas={data || []} listas={listas}
      campos={[
        { key: "proveedor_id", label: "Línea de transporte", tipo: "select", opciones: "proveedores", requerido: true },
        { key: "tipo_unidad_id", label: "Tipo de unidad", tipo: "select", opciones: "tipos_unidad", requerido: true },
        { key: "tipo_carga_id", label: "Tipo de carga", tipo: "select", opciones: "tipos_carga", requerido: true },
        { key: "origen_id", label: "Origen", tipo: "select", opciones: "poblaciones", requerido: true },
        { key: "destino_id", label: "Destino", tipo: "select", opciones: "poblaciones", requerido: true },
        { key: "costo_flete", label: "Costo flete", tipo: "dinero", requerido: true },
        { key: "costo_maniobras", label: "Costo maniobras", tipo: "dinero" },
        { key: "costo_estadias", label: "Costo estadías", tipo: "dinero" },
        { key: "seguro", label: "Seguro de mercancía", tipo: "dinero" },
      ]} />
  );
}
