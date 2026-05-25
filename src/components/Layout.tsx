"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
  userName: string;
  userRole: string;
  userInitial: string;
}

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/servicios", label: "Servicios", icon: "🚛" },
  { href: "/monitoreo", label: "Monitoreo", icon: "📡" },
  { href: "/facturacion", label: "Facturación", icon: "📄" },
  { href: "/reportes", label: "Reportes", icon: "📊" },
  { href: "/clientes", label: "Clientes", icon: "👥" },
  { href: "/proveedores", label: "Proveedores", icon: "🏢" },
  { href: "/operadores", label: "Operadores", icon: "👷" },
  { href: "/unidades", label: "Unidades", icon: "🚚" },
  { href: "/tarifas", label: "Tarifas", icon: "💲" },
  { href: "/usuarios", label: "Usuarios", icon: "👤" },
];

const ROLE_LABELS: Record<string, string> = {
  admin:       "Administrador General",
  direccion:   "Dirección",
  operaciones: "Operaciones",
  facturacion: "Facturación",
  monitoreo:   "Monitoreo",
  cliente:     "Cliente",
  proveedor:   "Proveedor",
};

export default function Layout({ children, userName, userRole, userInitial }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const now = new Date();
  const fecha = now.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const hora = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#0F1E2E", fontFamily: "system-ui, sans-serif" }}>
      <aside style={{ width: collapsed ? 64 : 240, backgroundColor: "#0A1628", display: "flex", flexDirection: "column", transition: "width 0.2s ease", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto", overflowX: "hidden", borderRight: "1px solid rgba(245,166,35,0.15)" }}>
        <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(245,166,35,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#E8F0F7", borderRadius: "0 0 8px 8px" }}>
          {!collapsed && <img src="/logo-kayard.png" alt="Kayard" style={{ height: 40, objectFit: "contain" }} />}
          {collapsed && <div style={{ width: 36, height: 36, backgroundColor: "#F5A623", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#0A1628", fontSize: 16, margin: "0 auto" }}>K</div>}
          <button onClick={() => setCollapsed(!collapsed)} style={{ background: "none", border: "none", color: "#F5A623", cursor: "pointer", fontSize: 16, padding: 4 }}>
            {collapsed ? "→" : "←"}
          </button>
        </div>
        <nav style={{ flex: 1, padding: "0.5rem 0" }}>
          {menuItems.map((item) => {
            const activo = pathname === item.href;
            return (
              <a key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 1rem", textDecoration: "none", backgroundColor: activo ? "rgba(245,166,35,0.12)" : "transparent", borderLeft: activo ? "3px solid #F5A623" : "3px solid transparent", color: activo ? "#F5A623" : "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: activo ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden" }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </a>
            );
          })}
        </nav>
        {!collapsed && (
          <div style={{ padding: "1rem", borderTop: "1px solid rgba(245,166,35,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#F5A623", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#0A1628", fontSize: 15, flexShrink: 0 }}>{userInitial}</div>
              <div style={{ overflow: "hidden" }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</p>
                <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{ROLE_LABELS[userRole] || userRole}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{ backgroundColor: "#0F2540", borderBottom: "1px solid rgba(245,166,35,0.2)", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{fecha} — {hora}</p>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "white" }}>{userName}</p>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{ROLE_LABELS[userRole] || userRole}</p>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: "#F5A623", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#0A1628", fontSize: 16 }}>{userInitial}</div>
            <a href="/auth/signout" style={{ fontSize: 12, padding: "0.4rem 0.875rem", borderRadius: 6, border: "1px solid rgba(245,166,35,0.4)", color: "#F5A623", textDecoration: "none", fontWeight: 500 }}>Salir</a>
          </div>
        </header>
        <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto", backgroundColor: "#0F1E2E" }}>
          {children}
        </main>
      </div>
    </div>
  );
}