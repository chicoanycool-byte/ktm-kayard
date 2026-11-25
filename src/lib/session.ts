import { redirect } from "next/navigation";
import { esSoloLectura } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export type Perfil = { id: string; full_name: string; email: string; role: string; is_active: boolean };

// Usuario + perfil; manda a /login si no hay sesión o el usuario está inactivo
export async function getPerfil() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!perfil || !perfil.is_active) redirect("/login?inactivo=1");
  return { supabase, user, perfil: perfil as Perfil };
}

// Para abrir una pantalla: el rol de consulta entra a cualquiera, solo a mirar
export async function requireRol(roles: string[]) {
  const ctx = await getPerfil();
  if (!esSoloLectura(ctx.perfil.role) && !roles.includes(ctx.perfil.role)) redirect("/dashboard");
  return ctx;
}

// Para las acciones que escriben desde el servidor, que no pasan por las políticas
// de la base porque usan la llave de servicio: ahí el rol de consulta nunca entra.
export async function requireEscritura(roles: string[]) {
  const ctx = await getPerfil();
  if (esSoloLectura(ctx.perfil.role) || !roles.includes(ctx.perfil.role)) redirect("/dashboard");
  return ctx;
}
