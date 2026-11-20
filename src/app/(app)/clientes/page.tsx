import { requireRol } from "@/lib/session";
import ClientesView from "./ClientesView";

export default async function ClientesPage() {
  const { supabase, perfil } = await requireRol(["admin", "direccion", "ventas", "operaciones", "facturacion"]);
  const { data } = await supabase.from("clientes").select("*").order("nombre");
  return (
    <ClientesView filas={data || []} rol={perfil.role}
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
