import Crud from "@/components/Crud";
import { requireRol } from "@/lib/session";

export default async function ProveedoresPage() {
  const { supabase } = await requireRol(["admin", "direccion", "compras", "operaciones"]);
  const { data } = await supabase.from("proveedores").select("*").order("nombre");
  return (
    <Crud titulo="Proveedores de transporte" singular="transportista" tabla="proveedores" filas={data || []}
      campos={[
        { key: "nombre", label: "Nombre del transportista", requerido: true },
        { key: "contacto_nombre", label: "Nombre del contacto" },
        { key: "contacto_telefono", label: "Teléfono de contacto", tipo: "tel" },
        { key: "correo", label: "Correo", tipo: "email" },
        { key: "rfc", label: "RFC", enTabla: false },
      ]} />
  );
}
