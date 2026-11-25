"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireEscritura } from "@/lib/session";
import { ROLES } from "@/lib/constants";

type Res = { ok: boolean; error?: string };

// El alta y el cambio de contraseña pasan por funciones de la base que verifican
// que quien llama sea administrador. Así no hace falta la llave de servicio.
export async function crearUsuario(datos: { email: string; password: string; full_name: string; role: string }): Promise<Res> {
  await requireEscritura(["admin"]);
  if (!ROLES[datos.role]) return { ok: false, error: "Rol inválido" };
  if ((datos.password || "").length < 8) return { ok: false, error: "La contraseña debe tener al menos 8 caracteres" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_crear_usuario", {
    p_email: datos.email, p_password: datos.password, p_nombre: datos.full_name, p_rol: datos.role,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/usuarios");
  return { ok: true };
}

export async function cambiarPassword(id: string, password: string): Promise<Res> {
  await requireEscritura(["admin"]);
  if ((password || "").length < 8) return { ok: false, error: "La contraseña debe tener al menos 8 caracteres" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_cambiar_password", { p_id: id, p_password: password });
  return error ? { ok: false, error: error.message } : { ok: true };
}
