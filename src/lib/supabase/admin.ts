import { createClient } from "@supabase/supabase-js";

// Cliente con service role: SOLO usar en el servidor (server actions / route handlers)
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta la variable SUPABASE_SERVICE_ROLE_KEY");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
