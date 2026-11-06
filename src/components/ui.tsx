"use client";
import type { CSSProperties, ReactNode } from "react";
import { ESTATUS_INFO, type Estatus } from "@/lib/constants";

// Paleta KTM (navy / ámbar)
export const C = {
  bg: "#0F1E2E",
  side: "#0A1628",
  card: "#1B3A5C",
  card2: "#162F4A",
  input: "#0F2540",
  amber: "#F5A623",
  line: "rgba(245,166,35,0.18)",
  muted: "rgba(255,255,255,0.5)",
  text: "rgba(255,255,255,0.85)",
  red: "#EF4444",
  green: "#22C55E",
  blue: "#5BA3D9",
};

export const inputStyle: CSSProperties = {
  width: "100%", padding: "0.5rem 0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
  fontSize: 14, boxSizing: "border-box", backgroundColor: C.input, color: "white",
};

export function Titulo({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", gap: 12, flexWrap: "wrap" }}>
      <h2 style={{ color: "white", fontSize: 22, fontWeight: 700, margin: 0 }}>{children}</h2>
      {accion}
    </div>
  );
}

export function Btn({ children, onClick, variante = "primario", type = "button", disabled, href, target, small, style }: {
  children: ReactNode; onClick?: () => void; variante?: "primario" | "secundario" | "peligro" | "verde";
  type?: "button" | "submit"; disabled?: boolean; href?: string; target?: string; small?: boolean; style?: CSSProperties;
}) {
  const base: CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: disabled ? "not-allowed" : "pointer",
    borderRadius: 8, fontWeight: 600, fontSize: small ? 12 : 14, padding: small ? "0.3rem 0.7rem" : "0.5rem 1.1rem",
    textDecoration: "none", opacity: disabled ? 0.6 : 1, whiteSpace: "nowrap",
  };
  const v: Record<string, CSSProperties> = {
    primario: { backgroundColor: C.amber, color: C.side, border: "none" },
    secundario: { backgroundColor: "transparent", color: C.amber, border: "1px solid rgba(245,166,35,0.5)" },
    peligro: { backgroundColor: "transparent", color: C.red, border: "1px solid rgba(239,68,68,0.5)" },
    verde: { backgroundColor: "#25D366", color: "#062b14", border: "none" },
  };
  const s = { ...base, ...v[variante], ...style };
  if (href) return <a href={href} target={target} rel={target ? "noopener noreferrer" : undefined} style={s}>{children}</a>;
  return <button type={type} onClick={onClick} disabled={disabled} style={s}>{children}</button>;
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ backgroundColor: C.card, borderRadius: 12, padding: "1.25rem", ...style }}>{children}</div>;
}

export function Campo({ label, children, span }: { label: string; children: ReactNode; span?: number }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined, minWidth: 0 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

export function Seccion({ titulo }: { titulo: string }) {
  return (
    <div style={{ gridColumn: "1 / -1", borderBottom: `1px solid ${C.line}`, paddingBottom: 4, marginTop: 8 }}>
      <p style={{ margin: 0, color: C.amber, fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>{titulo}</p>
    </div>
  );
}

export function Grid({ children, cols = 2 }: { children: ReactNode; cols?: number }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${cols >= 3 ? 180 : 220}px, 1fr))`, gap: "0.85rem" }}>{children}</div>;
}

export function Modal({ titulo, children, onClose, ancho = 560 }: { titulo: string; children: ReactNode; onClose: () => void; ancho?: number }) {
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 50, overflowY: "auto", padding: "2rem 1rem" }}>
      <div style={{ backgroundColor: C.card, borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: ancho, border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ color: "white", fontSize: 18, fontWeight: 700, margin: 0 }}>{titulo}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EstatusBadge({ estatus }: { estatus: string }) {
  const i = ESTATUS_INFO[estatus as Estatus] || { label: estatus, bg: "rgba(255,255,255,.1)", color: "white" };
  return (
    <span style={{ padding: "0.2rem 0.65rem", borderRadius: 999, fontSize: 11, fontWeight: 700, backgroundColor: i.bg, color: i.color, textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {i.label}
    </span>
  );
}

export function Tabla({ columnas, children, vacio = "Sin registros", colSpan }: { columnas: string[]; children: ReactNode; vacio?: string; colSpan?: number }) {
  const hayFilas = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div style={{ backgroundColor: C.card, borderRadius: 12, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ backgroundColor: C.side, borderBottom: "2px solid rgba(245,166,35,0.3)" }}>
            {columnas.map((c) => <th key={c} style={{ padding: "0.65rem 0.85rem", textAlign: "left", color: C.amber, whiteSpace: "nowrap", fontWeight: 600 }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {hayFilas ? children : (
            <tr><td colSpan={colSpan || columnas.length} style={{ textAlign: "center", padding: "2rem", color: C.muted }}>{vacio}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Tr({ children, i, onClick }: { children: ReactNode; i: number; onClick?: () => void }) {
  return (
    <tr onClick={onClick} style={{ backgroundColor: i % 2 === 0 ? C.card : C.card2, borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: onClick ? "pointer" : undefined }}>
      {children}
    </tr>
  );
}

export function Td({ children, fuerte, style }: { children: ReactNode; fuerte?: boolean; style?: CSSProperties }) {
  return <td style={{ padding: "0.6rem 0.85rem", color: fuerte ? "white" : C.text, fontWeight: fuerte ? 600 : 400, whiteSpace: "nowrap", ...style }}>{children}</td>;
}

export function Buscador({ value, onChange, placeholder = "Buscar..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input type="text" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, maxWidth: 380, marginBottom: "1rem", backgroundColor: C.card }} />;
}

export function Dato({ label, valor }: { label: string; valor: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{label}</p>
      <p style={{ margin: "2px 0 0", fontSize: 14, color: "white", wordBreak: "break-word" }}>{valor || "—"}</p>
    </div>
  );
}
