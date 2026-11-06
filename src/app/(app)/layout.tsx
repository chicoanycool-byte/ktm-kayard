import Layout from "@/components/Layout";
import { getPerfil } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await getPerfil();
  const nombre = perfil.full_name || perfil.email || "Usuario";
  return (
    <Layout userName={nombre} userRole={perfil.role} userInitial={nombre.charAt(0).toUpperCase()}>
      {children}
    </Layout>
  );
}
