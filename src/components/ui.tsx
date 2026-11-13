"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
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

// ---------- Tabla con filtros por columna (estilo Excel) ----------
// Los filtros trabajan sobre lo que se ve en cada celda, así sirven en todas las tablas sin cambiar cada pantalla.
function valorCelda(td: Element | undefined): string {
  if (!td) return "";
  const sel = td.querySelector("select") as HTMLSelectElement | null;
  if (sel) return (sel.options[sel.selectedIndex]?.text || "").trim();
  const inp = td.querySelector("input") as HTMLInputElement | null;
  if (inp && inp.type !== "checkbox") return (inp.value || "").trim();
  return ((td as HTMLElement).innerText || td.textContent || "").replace(/\s+/g, " ").trim();
}
const VACIO = "(Vacías)";
const etiquetaValor = (v: string) => (v === "" || v === "—" ? VACIO : v);
const ordenar = (a: string, b: string) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" });

type FiltroCol = { excluidos: Set<string>; texto: string };

export function Tabla({ columnas, children, vacio = "Sin registros", colSpan }: { columnas: string[]; children: ReactNode; vacio?: string; colSpan?: number }) {
  const hayFilas = Array.isArray(children) ? children.length > 0 : !!children;
  const tbody = useRef<HTMLTableSectionElement>(null);
  const [filtros, setFiltros] = useState<Record<number, FiltroCol>>({});
  const [abierto, setAbierto] = useState<{ col: number; x: number; y: number } | null>(null);
  const [conteo, setConteo] = useState<{ vis: number; total: number }>({ vis: 0, total: 0 });
  const activos = Object.entries(filtros).filter(([, f]) => f.excluidos.size > 0 || f.texto.trim() !== "");

  const filasPrincipales = useCallback(() => {
    const rows = tbody.current ? Array.from(tbody.current.rows) : [];
    return rows.filter((r) => r.cells.length >= columnas.length && !r.dataset.vacio);
  }, [columnas.length]);

  const pasa = useCallback((r: HTMLTableRowElement, omitir?: number) => {
    for (const [k, f] of activos) {
      const c = Number(k);
      if (c === omitir) continue;
      const v = valorCelda(r.cells[c]);
      if (f.excluidos.has(etiquetaValor(v))) return false;
      if (f.texto.trim() && !v.toLowerCase().includes(f.texto.trim().toLowerCase())) return false;
    }
    return true;
  }, [activos]);

  // Aplica los filtros después de cada render (las filas las pinta cada pantalla)
  useLayoutEffect(() => {
    const rows = tbody.current ? Array.from(tbody.current.rows) : [];
    let vis = 0, total = 0, ultimaVisible = true;
    for (const r of rows) {
      if (r.dataset.vacio) continue;
      if (r.cells.length >= columnas.length) {
        total++;
        ultimaVisible = activos.length === 0 || pasa(r);
        if (ultimaVisible) vis++;
      }
      // filas de detalle (menos celdas) siguen a su fila principal
      r.style.display = ultimaVisible ? "" : "none";
    }
    // conteo leído del DOM ya filtrado; el guard evita ciclos
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (vis !== conteo.vis || total !== conteo.total) setConteo({ vis, total });
  });

  const cambiar = (col: number, f: FiltroCol | null) => setFiltros((prev) => {
    const n = { ...prev };
    if (!f || (f.excluidos.size === 0 && !f.texto.trim())) delete n[col]; else n[col] = f;
    return n;
  });

  return (
    <div>
      {activos.length > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, fontSize: 12, color: C.muted, flexWrap: "wrap" }}>
          <span>Filtrado: <b style={{ color: C.amber }}>{conteo.vis}</b> de {conteo.total} registros</span>
          <button onClick={() => setFiltros({})} style={{ background: "none", border: `1px solid ${C.line}`, color: C.amber, borderRadius: 6, padding: "2px 10px", cursor: "pointer", fontSize: 12 }}>Quitar filtros de la tabla</button>
        </div>
      )}
      <div style={{ backgroundColor: C.card, borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: C.side, borderBottom: "2px solid rgba(245,166,35,0.3)" }}>
              {columnas.map((c, idx) => {
                const filtrable = c.trim() !== "" && hayFilas;
                const on = !!filtros[idx];
                return (
                  <th key={idx} style={{ padding: "0.65rem 0.85rem", textAlign: "left", color: C.amber, whiteSpace: "nowrap", fontWeight: 600 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {c}
                      {filtrable && (
                        <button
                          title={on ? "Filtro activo" : "Filtrar"}
                          onClick={(e) => {
                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setAbierto(abierto?.col === idx ? null : { col: idx, x: Math.min(r.left, window.innerWidth - 300), y: r.bottom + 4 });
                          }}
                          style={{
                            border: "none", cursor: "pointer", borderRadius: 4, padding: "0 4px", lineHeight: "16px", fontSize: 11,
                            background: on ? C.amber : "rgba(245,166,35,0.15)", color: on ? C.side : C.amber,
                          }}
                        >{on ? "▼●" : "▼"}</button>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody ref={tbody}>
            {hayFilas ? children : (
              <tr data-vacio="1"><td colSpan={colSpan || columnas.length} style={{ textAlign: "center", padding: "2rem", color: C.muted }}>{vacio}</td></tr>
            )}
            {hayFilas && activos.length > 0 && conteo.vis === 0 && (
              <tr data-vacio="1"><td colSpan={colSpan || columnas.length} style={{ textAlign: "center", padding: "2rem", color: C.muted }}>Ningún registro coincide con los filtros</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {abierto && (
        <MenuFiltro
          titulo={columnas[abierto.col]}
          x={abierto.x} y={abierto.y}
          valores={() => {
            const set = new Set<string>();
            for (const r of filasPrincipales()) if (pasa(r, abierto.col)) set.add(etiquetaValor(valorCelda(r.cells[abierto.col])));
            return Array.from(set).sort(ordenar);
          }}
          filtro={filtros[abierto.col]}
          onAplicar={(f) => { cambiar(abierto.col, f); setAbierto(null); }}
          onCerrar={() => setAbierto(null)}
        />
      )}
    </div>
  );
}

function MenuFiltro({ titulo, x, y, valores, filtro, onAplicar, onCerrar }: {
  titulo: string; x: number; y: number; valores: () => string[]; filtro?: FiltroCol;
  onAplicar: (f: FiltroCol | null) => void; onCerrar: () => void;
}) {
  const [lista] = useState<string[]>(valores);
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set(filtro?.excluidos || []));
  const [texto, setTexto] = useState(filtro?.texto || "");
  const [buscar, setBuscar] = useState("");
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fuera = (e: MouseEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) onCerrar(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    const t = setTimeout(() => document.addEventListener("mousedown", fuera), 0);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", onCerrar, true);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", esc); window.removeEventListener("scroll", onCerrar, true); };
  }, [onCerrar]);

  const visibles = lista.filter((v) => v.toLowerCase().includes(buscar.toLowerCase())).slice(0, 400);
  const todosMarcados = visibles.every((v) => !excluidos.has(v));
  const alternarTodos = () => {
    const n = new Set(excluidos);
    if (todosMarcados) visibles.forEach((v) => n.add(v)); else visibles.forEach((v) => n.delete(v));
    setExcluidos(n);
  };
  const alternar = (v: string) => { const n = new Set(excluidos); if (n.has(v)) n.delete(v); else n.add(v); setExcluidos(n); };
  const aplicar = () => {
    // si buscó en la lista y no tocó casillas, se queda solo con lo encontrado (como Excel)
    let ex = excluidos;
    if (buscar.trim() && excluidos.size === (filtro?.excluidos.size || 0)) {
      ex = new Set(lista.filter((v) => !v.toLowerCase().includes(buscar.toLowerCase())));
    }
    onAplicar({ excluidos: ex, texto });
  };

  return (
    <div ref={caja} style={{
      position: "fixed", left: Math.max(8, x), top: Math.min(y, window.innerHeight - 440), width: 290, zIndex: 60,
      backgroundColor: C.card2, border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: "0 12px 32px rgba(0,0,0,0.5)", padding: 12,
      color: C.text, fontSize: 13, textAlign: "left", fontWeight: 400,
    }}>
      <p style={{ margin: "0 0 8px", color: C.amber, fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Filtrar: {titulo}</p>
      <input autoFocus placeholder="Contiene el texto…" value={texto} onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") aplicar(); }} style={{ ...inputStyle, fontSize: 13, padding: "0.4rem 0.6rem", marginBottom: 8 }} />
      <input placeholder="Buscar en la lista…" value={buscar} onChange={(e) => setBuscar(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") aplicar(); }} style={{ ...inputStyle, fontSize: 13, padding: "0.4rem 0.6rem", marginBottom: 8 }} />
      <div style={{ maxHeight: 230, overflowY: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 6px" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0", cursor: "pointer", fontWeight: 600 }}>
          <input type="checkbox" checked={todosMarcados} onChange={alternarTodos} /> (Seleccionar todo)
        </label>
        {visibles.map((v) => (
          <label key={v} style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0", cursor: "pointer" }}>
            <input type="checkbox" checked={!excluidos.has(v)} onChange={() => alternar(v)} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={v}>{v}</span>
          </label>
        ))}
        {visibles.length === 0 && <p style={{ color: C.muted, margin: "6px 0" }}>Sin coincidencias</p>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
        <button onClick={() => onAplicar(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12 }}>Quitar filtro</button>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onCerrar} style={{ background: "none", border: `1px solid ${C.line}`, color: C.text, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Cancelar</button>
          <button onClick={aplicar} style={{ background: C.amber, border: "none", color: C.side, borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontWeight: 700 }}>Aplicar</button>
        </div>
      </div>
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
