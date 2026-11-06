import { cargarTiempos } from "@/lib/cargarTiempos";
import { cargarListas } from "@/lib/listas";
import { requireRol } from "@/lib/session";
import EjecutivoView from "./EjecutivoView";

export default async function EjecutivoPage() {
  const { supabase } = await requireRol(["admin", "direccion", "operaciones", "monitoreo", "ventas"]);
  const [{ servicios, registros }, listas] = await Promise.all([cargarTiempos(supabase), cargarListas(supabase, ["clientes", "proveedores"])]);
  return <EjecutivoView servicios={servicios} registros={registros} listas={listas} />;
}
