import { ESTATUS_INFO, type Estatus } from "@/lib/constants";

export type ServM = {
  id: string; id_track: string; estatus: string; fecha: string; fecha_carga: string | null; fecha_descarga: string | null;
  anio: number; mes: number; semana: number; cliente: string; cliente_id: string; proveedor: string | null; proveedor_id: string | null;
  operador: string | null; origen: string | null; destino: string | null; tipo_unidad: string | null; tipo_carga: string | null;
  total_costo: number | null; total_venta: number | null; utilidad: number | null; asignado_at: string | null; finalizado_at: string | null; created_at: string;
};

export const METRICAS = {
  viajes: { label: "Viajes", tipo: "num" },
  venta: { label: "Venta", tipo: "dinero" },
  costo: { label: "Costo", tipo: "dinero" },
  utilidad: { label: "Utilidad", tipo: "dinero" },
  margen: { label: "Margen %", tipo: "pct" },
  ticket: { label: "Venta promedio por viaje", tipo: "dinero" },
  finalizados: { label: "Viajes finalizados", tipo: "num" },
  cancelados: { label: "Viajes cancelados", tipo: "num" },
} as const;
export type Metrica = keyof typeof METRICAS;

export const DIMENSIONES = {
  mes: "Mes",
  semana: "Semana",
  dia: "Día",
  cliente: "Cliente",
  proveedor: "Transportista",
  operador: "Operador",
  ruta: "Ruta (origen → destino)",
  origen: "Origen",
  destino: "Destino",
  tipo_unidad: "Tipo de unidad",
  tipo_carga: "Tipo de carga",
  estatus: "Estatus",
} as const;
export type Dimension = keyof typeof DIMENSIONES;
export const DIM_TIEMPO: Dimension[] = ["mes", "semana", "dia"];

export const TIPOS = { barras: "Barras", barras_h: "Barras horizontales", linea: "Línea", area: "Área", pastel: "Pastel", tabla: "Tabla" } as const;
export type TipoGrafica = keyof typeof TIPOS;

export type Widget = { id: string; titulo: string; metricas: Metrica[]; dimension: Dimension; tipo: TipoGrafica; top: number; ancho: 1 | 2 };

export const PALETA = ["#F5A623", "#5BA3D9", "#22C55E", "#A78BFA", "#FB923C", "#F87171", "#2DD4BF", "#F472B6", "#FACC15", "#94A3B8"];

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const pad = (n: number) => String(n).padStart(2, "0");

function clave(s: ServM, d: Dimension): [string, string] {
  switch (d) {
    case "mes": return [`${s.anio}-${pad(s.mes)}`, `${MESES[(s.mes || 1) - 1]} ${String(s.anio).slice(2)}`];
    case "semana": return [`${s.anio}-${pad(s.semana)}`, `S${s.semana} ${String(s.anio).slice(2)}`];
    case "dia": { const f = s.fecha_carga || s.fecha; return [f, `${f.slice(8, 10)}/${f.slice(5, 7)}`]; }
    case "cliente": return [s.cliente, s.cliente];
    case "proveedor": return [s.proveedor || "Sin asignar", s.proveedor || "Sin asignar"];
    case "operador": return [s.operador || "Sin operador", s.operador || "Sin operador"];
    case "ruta": { const r = `${s.origen || "—"} → ${s.destino || "—"}`; return [r, r]; }
    case "origen": return [s.origen || "—", s.origen || "—"];
    case "destino": return [s.destino || "—", s.destino || "—"];
    case "tipo_unidad": return [s.tipo_unidad || "—", s.tipo_unidad || "—"];
    case "tipo_carga": return [s.tipo_carga || "—", s.tipo_carga || "—"];
    case "estatus": return [s.estatus, ESTATUS_INFO[s.estatus as Estatus]?.label || s.estatus];
  }
}

export type Fila = { clave: string; nombre: string } & Record<Metrica, number>;

export function calcular(servicios: ServM[], w: Pick<Widget, "metricas" | "dimension" | "top">): Fila[] {
  const m = new Map<string, { nombre: string; viajes: number; venta: number; costo: number; utilidad: number; finalizados: number; cancelados: number }>();
  for (const s of servicios) {
    const [k, n] = clave(s, w.dimension);
    const a = m.get(k) || { nombre: n, viajes: 0, venta: 0, costo: 0, utilidad: 0, finalizados: 0, cancelados: 0 };
    a.viajes++;
    a.venta += Number(s.total_venta || 0);
    a.costo += Number(s.total_costo || 0);
    a.utilidad += Number(s.utilidad || 0);
    if (s.estatus === "finalizado") a.finalizados++;
    if (s.estatus === "cancelado") a.cancelados++;
    m.set(k, a);
  }
  let filas: Fila[] = [...m.entries()].map(([k, a]) => ({
    clave: k, nombre: a.nombre, viajes: a.viajes, venta: round(a.venta), costo: round(a.costo), utilidad: round(a.utilidad),
    margen: a.venta ? round((a.utilidad / a.venta) * 100, 1) : 0, ticket: a.viajes ? round(a.venta / a.viajes) : 0,
    finalizados: a.finalizados, cancelados: a.cancelados,
  }));
  if (DIM_TIEMPO.includes(w.dimension)) {
    filas.sort((a, b) => a.clave.localeCompare(b.clave));
    if (w.top > 0) filas = filas.slice(-w.top);
  } else {
    const met = w.metricas[0] || "viajes";
    filas.sort((a, b) => b[met] - a[met]);
    if (w.top > 0) filas = filas.slice(0, w.top);
  }
  return filas;
}

function round(n: number, d = 2) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function formatear(valor: number, met: Metrica) {
  const t = METRICAS[met].tipo;
  if (t === "dinero") return valor.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
  if (t === "pct") return `${valor.toFixed(1)}%`;
  return valor.toLocaleString("es-MX");
}

export const WIDGETS_INICIALES: Widget[] = [
  { id: "w1", titulo: "Viajes por mes", metricas: ["viajes"], dimension: "mes", tipo: "barras", top: 12, ancho: 1 },
  { id: "w2", titulo: "Venta y utilidad por mes", metricas: ["venta", "utilidad"], dimension: "mes", tipo: "barras", top: 12, ancho: 1 },
  { id: "w3", titulo: "Margen por mes", metricas: ["margen"], dimension: "mes", tipo: "linea", top: 12, ancho: 1 },
  { id: "w4", titulo: "Viajes por transportista", metricas: ["viajes"], dimension: "proveedor", tipo: "pastel", top: 8, ancho: 1 },
  { id: "w5", titulo: "Top clientes por venta", metricas: ["venta", "utilidad"], dimension: "cliente", tipo: "barras_h", top: 10, ancho: 2 },
  { id: "w6", titulo: "Rutas más usadas", metricas: ["viajes", "venta", "utilidad", "margen"], dimension: "ruta", tipo: "tabla", top: 15, ancho: 2 },
];
