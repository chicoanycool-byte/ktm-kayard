"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRol } from "@/lib/session";
import { ROLES } from "@/lib/constants";

type Res = { ok: boolean; error?: string };

export async function crearUsuario(datos: { email: string; password: string; full_name: string; role: string }): Promise<Res> {
  await requireRol(["admin"]);
  if (!ROLES[datos.role]) return { ok: false, error: "Rol inválido" };
  if ((datos.password || "").length < 8) return { ok: false, error: "La contraseña debe tener al menos 8 caracteres" };
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email: datos.email.trim().toLowerCase(), password: datos.password, email_confirm: true,
      user_metadata: { full_name: datos.full_name, role: datos.role },
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/usuarios");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function cambiarPassword(id: string, password: string): Promise<Res> {
  await requireRol(["admin"]);
  if ((password || "").length < 8) return { ok: false, error: "La contraseña debe tener al menos 8 caracteres" };
  try {
    const { error } = await createAdminClient().auth.admin.updateUserById(id, { password });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
