import type { SupabaseClient } from "@supabase/supabase-js";

// Carga catálogos activos como {id, nombre} para selects
export async function cargarListas(supabase: SupabaseClient, tablas: string[]) {
  const res = await Promise.all(
    tablas.map((t) => supabase.from(t).select("id, nombre").eq("activo", true).order("nombre"))
  );
  return Object.fromEntries(tablas.map((t, i) => [t, res[i].data || []])) as Record<string, { id: string; nombre: string }[]>;
}
