import { cargarTiempos } from "@/lib/cargarTiempos";
import { cargarListas } from "@/lib/listas";
import { requireRol } from "@/lib/session";
import TiemposView from "./TiemposView";

export default async function TiemposPage() {
  const { supabase } = await requireRol(["admin", "direccion", "operaciones", "monitoreo"]);
  const [{ servicios, registros }, listas] = await Promise.all([cargarTiempos(supabase), cargarListas(supabase, ["clientes", "proveedores"])]);
  return <TiemposView servicios={servicios} registros={registros} listas={listas} />;
}
