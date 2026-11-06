import Crud from "@/components/Crud";
import { cargarListas } from "@/lib/listas";
import { requireRol } from "@/lib/session";

export default async function TarifasVentaPage() {
  const { supabase } = await requireRol(["admin", "direccion", "ventas"]);
  const [{ data }, listas] = await Promise.all([
    supabase.from("tarifas_venta").select("*").order("created_at", { ascending: false }),
    cargarListas(supabase, ["clientes", "tipos_unidad", "tipos_carga", "poblaciones"]),
  ]);
  return (
    <Crud titulo="Tarifas de venta" singular="tarifa" tabla="tarifas_venta" filas={data || []} listas={listas}
      campos={[
        { key: "cliente_id", label: "Cliente", tipo: "select", opciones: "clientes", requerido: true },
        { key: "tipo_unidad_id", label: "Tipo de unidad", tipo: "select", opciones: "tipos_unidad", requerido: true },
        { key: "tipo_carga_id", label: "Tipo de carga", tipo: "select", opciones: "tipos_carga", requerido: true },
        { key: "origen_id", label: "Origen", tipo: "select", opciones: "poblaciones", requerido: true },
        { key: "destino_id", label: "Destino", tipo: "select", opciones: "poblaciones", requerido: true },
        { key: "venta_flete", label: "Venta flete", tipo: "dinero", requerido: true },
        { key: "venta_maniobra", label: "Venta maniobra", tipo: "dinero" },
        { key: "venta_estadias", label: "Venta estadías", tipo: "dinero" },
        { key: "seguro", label: "Seguro de mercancía", tipo: "dinero" },
      ]} />
  );
}
