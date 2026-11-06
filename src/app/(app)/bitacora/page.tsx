import { traerTodo } from "@/lib/listas";
import { requireRol } from "@/lib/session";
import type { RegBitacora } from "@/lib/bitacora";
import BitacoraView from "./BitacoraView";

export default async function BitacoraPage() {
  const { supabase } = await requireRol(["admin", "direccion", "operaciones", "monitoreo"]);
  const regs = await traerTodo<RegBitacora>((a, b) =>
    supabase.from("v_bitacora").select("*").order("created_at", { ascending: false }).order("id").range(a, b));
  return <BitacoraView registros={regs} />;
}
