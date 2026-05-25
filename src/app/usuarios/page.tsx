import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UsuariosView from "./UsuariosView";

export default async function UsuariosPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: usuarios } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  return <UsuariosView usuarios={usuarios || []} />;
}