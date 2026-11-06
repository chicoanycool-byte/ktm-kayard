import Crud from "@/components/Crud";
import { requireRol } from "@/lib/session";

export default async function ClientesPage() {
  const { supabase } = await requireRol(["admin", "direccion", "ventas", "operaciones"]);
  const { data } = await supabase.from("clientes").select("*").order("nombre");
  return (
    <Crud titulo="Catálogo de clientes" singular="cliente" tabla="clientes" filas={data || []}
      campos={[
        { key: "nombre", label: "Nombre del cliente", requerido: true },
        { key: "contacto_nombre", label: "Nombre del contacto" },
        { key: "contacto_telefono", label: "Teléfono del contacto", tipo: "tel" },
        { key: "correo", label: "Correo", tipo: "email" },
        { key: "rfc", label: "RFC", enTabla: false },
        { key: "logo_url", label: "Logo (URL)", tipo: "url", enTabla: false },
      ]} />
  );
}
