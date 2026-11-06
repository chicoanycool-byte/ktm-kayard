import type { SupabaseClient } from "@supabase/supabase-js";
import { traerTodo } from "./listas";
import type { RegT, ServT } from "./tiempos";

export async function cargarTiempos(supabase: SupabaseClient) {
  const [servicios, registros] = await Promise.all([
    traerTodo<ServT>((a, b) => supabase.from("v_servicios")
      .select("id, id_track, estatus, cliente, cliente_id, proveedor, proveedor_id, origen, destino, tipo_unidad, fecha, fecha_carga, cita_carga, fecha_descarga, cita_descarga, cliente_carga, cliente_descarga, created_at")
      .neq("estatus", "cancelado").order("id_track").range(a, b)),
    traerTodo<RegT>((a, b) => supabase.from("servicio_estatus").select("servicio_id, estatus, created_at").order("id").range(a, b)),
  ]);
  return { servicios, registros };
}
