import Link from "next/link";
import { getPerfil } from "@/lib/session";
import { ESTATUS_INFO, MENU, puedeVer, type Estatus } from "@/lib/constants";
import { money } from "@/lib/format";
import EnVivo from "@/components/EnVivo";

export default async function DashboardPage() {
  const { supabase, perfil } = await getPerfil();
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const inicioMes = hoy.slice(0, 8) + "01";

  const [{ data: activos }, { data: mes }] = await Promise.all([
    supabase.from("servicios").select("estatus, fecha_carga").not("estatus", "in", "(finalizado,cancelado)"),
    supabase.from("v_servicios").select("estatus, total_venta, utilidad").gte("fecha_carga", inicioMes).neq("estatus", "cancelado"),
  ]);

  const cuenta = (e: string) => (activos || []).filter((s) => s.estatus === e).length;
  const cargasHoy = (activos || []).filter((s) => s.fecha_carga === hoy).length;
  const ventaMes = (mes || []).reduce((a, s) => a + Number(s.total_venta || 0), 0);
  const utilMes = (mes || []).reduce((a, s) => a + Number(s.utilidad || 0), 0);
  const finMes = (mes || []).filter((s) => s.estatus === "finalizado").length;

  const kpis = [
    { l: "Cargas hoy", v: String(cargasHoy), c: "#F5A623" },
    ...(["programado", "asignado", "en_transito"] as Estatus[]).map((e) => ({ l: ESTATUS_INFO[e].label, v: String(cuenta(e)), c: ESTATUS_INFO[e].color })),
    { l: "Finalizados del mes", v: String(finMes), c: "#22C55E" },
    ...(["admin", "direccion", "facturacion"].includes(perfil.role) ? [
      { l: "Venta del mes", v: money(ventaMes), c: "#F5A623" },
      { l: "Utilidad del mes", v: money(utilMes), c: utilMes < 0 ? "#EF4444" : "#22C55E" },
    ] : []),
  ];

  const accesos = MENU.flatMap((g) => g.items.map((i) => ({ ...i, grupo: g.titulo }))).filter((i) => i.href !== "/dashboard" && puedeVer(i, perfil.role));

  return (
    <div>
      <h2 style={{ color: "white", fontSize: 22, fontWeight: 700, margin: "0 0 0.25rem" }}>Hola, {perfil.full_name.split(" ")[0] || "bienvenido"}</h2>
      <p style={{ color: "rgba(255,255,255,0.5)", margin: "0 0 1.25rem", fontSize: 14, display: "flex", gap: 12, alignItems: "center" }}>Así va la operación hoy. <EnVivo /></p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.85rem", marginBottom: "1.75rem" }}>
        {kpis.map((k) => (
          <div key={k.l} style={{ backgroundColor: "#1B3A5C", borderRadius: 12, padding: "1rem 1.1rem", borderLeft: `4px solid ${k.c}` }}>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{k.l}</p>
            <p style={{ margin: "0.35rem 0 0", fontSize: 26, fontWeight: 700, color: k.c }}>{k.v}</p>
          </div>
        ))}
      </div>

      <h3 style={{ color: "white", fontSize: 16, margin: "0 0 0.75rem" }}>Menú</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.85rem" }}>
        {accesos.map((a) => (
          <Link key={a.href} href={a.href} style={{ backgroundColor: "#1B3A5C", borderRadius: 14, padding: "1.1rem", textDecoration: "none", border: "1px solid rgba(245,166,35,0.12)", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 28 }}>{a.icon}</span>
            <span style={{ color: "white", fontWeight: 600, fontSize: 14 }}>{a.label}</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{a.grupo}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
