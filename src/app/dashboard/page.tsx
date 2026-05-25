import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Layout from "@/components/Layout";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const userName = profile?.full_name || "Usuario";
  const userRole = profile?.role || "operaciones";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <Layout userName={userName} userRole={userRole} userInitial={userInitial}>

      <h2 style={{ color: "white", fontSize: 22, fontWeight: 700, margin: "0 0 1.5rem" }}>
        Dashboard
      </h2>

      {/* KPIs fila 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Viajes hoy", valor: "0", color: "#F5A623", border: "#F5A623" },
          { label: "En tránsito", valor: "0", color: "#5BA3D9", border: "#2A6DA8" },
          { label: "Entregados", valor: "0", color: "#22C55E", border: "#16A34A" },
          { label: "Cancelados", valor: "0", color: "#EF4444", border: "#CC2A1A" },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            backgroundColor: "#1B3A5C",
            borderRadius: 12,
            padding: "1.25rem",
            borderLeft: `4px solid ${kpi.border}`,
          }}>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{kpi.label}</p>
            <p style={{ margin: "0.5rem 0 0", fontSize: 32, fontWeight: 700, color: kpi.color }}>{kpi.valor}</p>
          </div>
        ))}
      </div>

      {/* KPIs fila 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Facturación del mes", valor: "$0", color: "#F5A623" },
          { label: "Servicios pendientes", valor: "0", color: "#5BA3D9" },
          { label: "OTIF", valor: "0%", color: "#22C55E" },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            backgroundColor: "#1B3A5C",
            borderRadius: 12,
            padding: "1.25rem",
          }}>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{kpi.label}</p>
            <p style={{ margin: "0.5rem 0 0", fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.valor}</p>
          </div>
        ))}
      </div>

      {/* Bienvenida */}
      <div style={{
        backgroundColor: "#1B3A5C",
        borderRadius: 12,
        padding: "1.5rem",
        borderLeft: "4px solid #F5A623",
      }}>
        <h3 style={{ color: "white", fontSize: 16, fontWeight: 600, margin: "0 0 0.5rem" }}>
          Bienvenido, {userName}
        </h3>
        <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: 14 }}>
          Sistema KTM activo. Usa el menú lateral para navegar entre módulos.
        </p>
      </div>

    </Layout>
  );
}