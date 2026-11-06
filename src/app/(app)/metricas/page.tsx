import { cargarListas, traerTodo } from "@/lib/listas";
import { requireRol } from "@/lib/session";
import MetricasView from "./MetricasView";

export default async function MetricasPage() {
  const { supabase } = await requireRol(["admin", "direccion", "facturacion", "operaciones"]);
  const [servicios, listas] = await Promise.all([
    traerTodo((a, b) => supabase.from("v_servicios")
      .select("id, id_track, estatus, fecha, fecha_carga, fecha_descarga, anio, mes, semana, cliente, cliente_id, proveedor, proveedor_id, operador, origen, destino, tipo_unidad, tipo_carga, total_costo, total_venta, utilidad, asignado_at, finalizado_at, created_at")
      .order("id_track").range(a, b)),
    cargarListas(supabase, ["clientes", "proveedores"]),
  ]);
  return <MetricasView servicios={servicios} listas={listas} />;
}
