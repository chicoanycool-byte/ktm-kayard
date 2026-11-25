import { createClient } from "@supabase/supabase-js";

// Cliente con service role: SOLO usar en el servidor (server actions / route handlers)
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Para dar de alta usuarios falta cargar la llave de servicio de Supabase (SUPABASE_SERVICE_ROLE_KEY) en las variables de entorno de Vercel, y volver a desplegar.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
