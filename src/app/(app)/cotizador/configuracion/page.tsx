import { requireRol } from "@/lib/session";
import { mezclarConfig } from "@/lib/cotizador";
import ConfigView from "./ConfigView";

export const dynamic = "force-dynamic";

export default async function CotizadorConfigPage() {
  const { supabase } = await requireRol(["admin", "direccion"]);
  const { data } = await supabase.from("cotizador_config").select("datos").eq("id", 1).maybeSingle();
  return <ConfigView config={mezclarConfig(data?.datos)} />;
}
