import type { SupabaseClient } from "@supabase/supabase-js";

// Supabase regresa máximo 1000 filas por consulta: esto pide en bloques hasta traer todo
export async function traerTodo<T = Record<string, unknown>>(
  consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  bloque = 1000
): Promise<T[]> {
  const todo: T[] = [];
  for (let desde = 0; ; desde += bloque) {
    const { data, error } = await consulta(desde, desde + bloque - 1);
    if (error || !data) break;
    todo.push(...data);
    if (data.length < bloque) break;
  }
  return todo;
}

// Carga catálogos activos como {id, nombre} para los campos de búsqueda
export async function cargarListas(supabase: SupabaseClient, tablas: string[]) {
  const res = await Promise.all(
    tablas.map((t) =>
      traerTodo<{ id: string; nombre: string }>((a, b) =>
        supabase.from(t).select("id, nombre").eq("activo", true).order("nombre").range(a, b)
      )
    )
  );
  return Object.fromEntries(tablas.map((t, i) => [t, res[i]])) as Record<string, { id: string; nombre: string }[]>;
}
