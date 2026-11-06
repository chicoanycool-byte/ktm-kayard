import { requireRol } from "@/lib/session";
import UsuariosView from "./UsuariosView";

export default async function UsuariosPage() {
  const { supabase, perfil } = await requireRol(["admin"]);
  const { data } = await supabase.from("profiles").select("*").order("full_name");
  return <UsuariosView usuarios={data || []} yo={perfil.id} />;
}
