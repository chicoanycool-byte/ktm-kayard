import Crud from "@/components/Crud";
import { cargarListas } from "@/lib/listas";
import { requireRol } from "@/lib/session";

export default async function PuntosPage() {
  const { supabase } = await requireRol(["admin", "direccion", "ventas", "operaciones"]);
  const [{ data }, listas] = await Promise.all([
    supabase.from("clientes_cd").select("*").order("nombre"),
    cargarListas(supabase, ["poblaciones"]),
  ]);
  return (
    <Crud titulo="Clientes de carga / descarga" singular="punto" tabla="clientes_cd" filas={data || []} listas={listas}
      campos={[
        { key: "nombre", label: "Cliente (lugar)", requerido: true },
        { key: "domicilio", label: "Domicilio" },
        { key: "colonia", label: "Colonia" },
        { key: "codigo_postal", label: "C.P." },
        { key: "poblacion_id", label: "Población", tipo: "select", opciones: "poblaciones" },
        { key: "link_ubicacion", label: "Ubicación (link de Maps)", tipo: "url" },
      ]} />
  );
}
