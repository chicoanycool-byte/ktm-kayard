import type { SupabaseClient } from "@supabase/supabase-js";

export type ClienteBloqueado = { id: string; nombre: string; bloqueo_motivo: string | null };

// Clientes a los que Finanzas les frenó la cuenta. Se consulta aparte de v_servicios
// para no tener que tocar la vista, y son pocos renglones.
export async function clientesBloqueados(supabase: SupabaseClient): Promise<ClienteBloqueado[]> {
  const { data } = await supabase.from("clientes").select("id, nombre, bloqueo_motivo").eq("bloqueado", true);
  return (data || []) as ClienteBloqueado[];
}
