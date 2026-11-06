"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU, ROLES, puedeVer } from "@/lib/constants";
import { C } from "./ui";

interface LayoutProps {
  children: React.ReactNode;
  userName: string;
  userRole: string;
  userInitial: string;
}

export default function Layout({ children, userName, userRole, userInitial }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [abiertoMovil, setAbiertoMovil] = useState(false);
  const pathname = usePathname();
  const ancho = collapsed ? 64 : 240;

  return (
    <div className="ktm-shell" style={{ display: "flex", minHeight: "100vh", backgroundColor: C.bg, fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @media (max-width: 860px) {
          .ktm-aside { position: fixed !important; left: 0; top: 0; z-index: 40; transform: translateX(${abiertoMovil ? "0" : "-100%"}); width: 240px !important; transition: transform .2s; }
          .ktm-burger { display: inline-flex !important; }
          .ktm-collapse { display: none !important; }
          .ktm-main { padding: 1rem !important; }
          .ktm-hide-sm { display: none !important; }
        }
      `}</style>
      {abiertoMovil && <div onClick={() => setAbiertoMovil(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 30 }} />}
      <aside className="ktm-aside" style={{ width: ancho, backgroundColor: C.side, display: "flex", flexDirection: "column", transition: "width 0.2s ease", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto", overflowX: "hidden", borderRight: `1px solid ${C.line}` }}>
        <div style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#E8F0F7", borderRadius: "0 0 8px 8px" }}>
          {!collapsed && <img src="/logo-kayard.png" alt="Kayard" style={{ height: 40, objectFit: "contain" }} />}
          {collapsed && <div style={{ width: 36, height: 36, backgroundColor: C.amber, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.side, fontSize: 16, margin: "0 auto" }}>K</div>}
          <button className="ktm-collapse" onClick={() => setCollapsed(!collapsed)} style={{ background: "none", border: "none", color: C.side, cursor: "pointer", fontSize: 16, padding: 4 }}>
            {collapsed ? "→" : "←"}
          </button>
        </div>
        <nav style={{ flex: 1, padding: "0.5rem 0" }}>
          {MENU.map((g) => {
            const items = g.items.filter((i) => puedeVer(i, userRole));
            if (!items.length) return null;
            return (
              <div key={g.titulo} style={{ marginBottom: 6 }}>
                {!collapsed && g.titulo !== "General" && (
                  <p style={{ margin: "0.75rem 1rem 0.25rem", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>{g.titulo}</p>
                )}
                {items.map((item) => {
                  const activo = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setAbiertoMovil(false)} title={item.label}
                      style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.55rem 1rem", textDecoration: "none", backgroundColor: activo ? "rgba(245,166,35,0.12)" : "transparent", borderLeft: activo ? `3px solid ${C.amber}` : "3px solid transparent", color: activo ? C.amber : "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: activo ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden" }}>
                      <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{ backgroundColor: "#0F2540", borderBottom: `1px solid ${C.line}`, padding: "0.65rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="ktm-burger" onClick={() => setAbiertoMovil(true)} style={{ display: "none", background: "none", border: `1px solid ${C.line}`, color: C.amber, borderRadius: 6, padding: "4px 10px", fontSize: 18, cursor: "pointer" }}>☰</button>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "white" }}>KTM <span className="ktm-hide-sm" style={{ fontWeight: 400, color: C.muted }}>· Kayard Transport Management</span></p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div className="ktm-hide-sm" style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "white" }}>{userName}</p>
              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{ROLES[userRole] || userRole}</p>
            </div>
            <div style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: C.amber, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.side, fontSize: 15 }}>{userInitial}</div>
            <a href="/auth/signout" style={{ fontSize: 12, padding: "0.35rem 0.8rem", borderRadius: 6, border: "1px solid rgba(245,166,35,0.4)", color: C.amber, textDecoration: "none", fontWeight: 500 }}>Salir</a>
          </div>
        </header>
        <main className="ktm-main" style={{ flex: 1, padding: "1.5rem", overflowY: "auto", backgroundColor: C.bg }}>
          {children}
        </main>
      </div>
    </div>
  );
}
