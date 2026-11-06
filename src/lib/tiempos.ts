// Tiempos entre estatus y cumplimiento On-time, calculados con la bitácora de estatus

export type ServT = {
  id: string; id_track: string; estatus: string; cliente: string; cliente_id: string; proveedor: string | null; proveedor_id: string | null;
  origen: string | null; destino: string | null; tipo_unidad: string | null; fecha: string; fecha_carga: string | null; cita_carga: string | null;
  fecha_descarga: string | null; cita_descarga: string | null; cliente_carga: string | null; cliente_descarga: string | null; created_at: string;
};
export type RegT = { servicio_id: string; estatus: string; created_at: string };

export const ETAPAS = [
  { clave: "asignacion", label: "Programado → Asignado", de: "programado", a: ["asignado"] },
  { clave: "llegada", label: "Asignado → Llegada a carga", de: "asignado", a: ["en_carga"] },
  { clave: "carga", label: "Carga", de: "en_carga", a: ["espera_documentos", "en_transito"] },
  { clave: "documentos", label: "Espera de documentos", de: "espera_documentos", a: ["en_transito"] },
  { clave: "transito", label: "Tránsito", de: "en_transito", a: ["en_descarga", "finalizado"] },
  { clave: "descarga", label: "Descarga", de: "en_descarga", a: ["finalizado"] },
] as const;
export type ClaveEtapa = (typeof ETAPAS)[number]["clave"] | "puerta_a_puerta" | "ciclo";

export const ETAPAS_TOTALES = [
  { clave: "puerta_a_puerta" as const, label: "Llegada a carga → Finalizado" },
  { clave: "ciclo" as const, label: "Ciclo total (alta → finalizado)" },
];

const MX = "-06:00"; // Hora del centro de México (sin horario de verano)

function citaMs(fecha: string | null, cita: string | null) {
  if (!fecha) return null;
  return new Date(`${fecha}T${cita ? cita.slice(0, 5) : "23:59"}:00${MX}`).getTime();
}

export type ResultadoServicio = {
  s: ServT;
  marcas: Record<string, number>; // primera vez que el servicio llegó a cada estatus (ms)
  horas: Partial<Record<ClaveEtapa, number>>;
  llegadaCarga: number | null; citaCarga: number | null; onTimeCarga: boolean | null; retrasoCargaMin: number | null;
  llegadaEntrega: number | null; citaEntrega: number | null; onTimeEntrega: boolean | null; retrasoEntregaMin: number | null;
  onTime: boolean | null;
};

export function analizar(servicios: ServT[], registros: RegT[], toleranciaMin = 0): ResultadoServicio[] {
  const porServicio = new Map<string, Record<string, number>>();
  for (const r of registros) {
    const t = new Date(r.created_at).getTime();
    const m = porServicio.get(r.servicio_id) || {};
    if (m[r.estatus] === undefined || t < m[r.estatus]) m[r.estatus] = t;
    porServicio.set(r.servicio_id, m);
  }
  const tol = toleranciaMin * 60000;
  return servicios.map((s) => {
    const marcas = { ...(porServicio.get(s.id) || {}) };
    if (marcas.programado === undefined) marcas.programado = new Date(s.created_at).getTime();
    const horas: ResultadoServicio["horas"] = {};
    for (const e of ETAPAS) {
      const ini = marcas[e.de];
      const fin = e.a.map((x) => marcas[x]).find((x) => x !== undefined);
      if (ini !== undefined && fin !== undefined && fin >= ini) horas[e.clave] = (fin - ini) / 3600000;
    }
    if (marcas.en_carga !== undefined && marcas.finalizado !== undefined) horas.puerta_a_puerta = (marcas.finalizado - marcas.en_carga) / 3600000;
    if (marcas.finalizado !== undefined) horas.ciclo = (marcas.finalizado - marcas.programado) / 3600000;

    const llegadaCarga = marcas.en_carga ?? null;
    const citaCarga = citaMs(s.fecha_carga, s.cita_carga);
    const llegadaEntrega = marcas.en_descarga ?? marcas.finalizado ?? null;
    const citaEntrega = citaMs(s.fecha_descarga || s.fecha_carga, s.cita_descarga);
    const onTimeCarga = llegadaCarga !== null && citaCarga !== null ? llegadaCarga <= citaCarga + tol : null;
    const onTimeEntrega = marcas.en_descarga !== undefined && citaEntrega !== null ? llegadaEntrega! <= citaEntrega + tol : null;
    const onTime = onTimeCarga === null && onTimeEntrega === null ? null : (onTimeCarga ?? true) && (onTimeEntrega ?? true);
    return {
      s, marcas, horas,
      llegadaCarga, citaCarga, onTimeCarga, retrasoCargaMin: llegadaCarga !== null && citaCarga !== null ? Math.round((llegadaCarga - citaCarga) / 60000) : null,
      llegadaEntrega: marcas.en_descarga ?? null, citaEntrega, onTimeEntrega,
      retrasoEntregaMin: marcas.en_descarga !== undefined && citaEntrega !== null ? Math.round((marcas.en_descarga - citaEntrega) / 60000) : null,
      onTime,
    };
  });
}

export function promedio(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}
export function mediana(xs: number[]) {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

export function pctOnTime(rs: ResultadoServicio[], campo: "onTime" | "onTimeCarga" | "onTimeEntrega") {
  const ev = rs.filter((r) => r[campo] !== null);
  return { evaluados: ev.length, aTiempo: ev.filter((r) => r[campo]).length, pct: ev.length ? (ev.filter((r) => r[campo]).length / ev.length) * 100 : null };
}

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
function semanaISO(fecha: string) {
  const d = new Date(`${fecha}T12:00:00Z`);
  const dia = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dia + 3);
  const primero = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const sem = 1 + Math.round(((d.getTime() - primero.getTime()) / 86400000 - 3 + ((primero.getUTCDay() + 6) % 7)) / 7);
  return { anio: d.getUTCFullYear(), sem };
}

export function periodoDe(fecha: string, tipo: "semana" | "mes") {
  if (tipo === "mes") return { clave: fecha.slice(0, 7), nombre: `${MESES[Number(fecha.slice(5, 7)) - 1]} ${fecha.slice(2, 4)}` };
  const { anio, sem } = semanaISO(fecha);
  return { clave: `${anio}-${String(sem).padStart(2, "0")}`, nombre: `S${sem} ${String(anio).slice(2)}` };
}

export function porPeriodo(rs: ResultadoServicio[], tipo: "semana" | "mes") {
  const m = new Map<string, { clave: string; nombre: string; rs: ResultadoServicio[] }>();
  for (const r of rs) {
    const f = r.s.fecha_carga || r.s.fecha;
    const p = periodoDe(f, tipo);
    const a = m.get(p.clave) || { ...p, rs: [] };
    a.rs.push(r);
    m.set(p.clave, a);
  }
  return [...m.values()].sort((a, b) => a.clave.localeCompare(b.clave)).map((g) => ({
    clave: g.clave, nombre: g.nombre, servicios: g.rs.length,
    onTime: redondear(pctOnTime(g.rs, "onTime").pct), onTimeCarga: redondear(pctOnTime(g.rs, "onTimeCarga").pct),
    onTimeEntrega: redondear(pctOnTime(g.rs, "onTimeEntrega").pct), evaluados: pctOnTime(g.rs, "onTime").evaluados,
    transito: redondear(promedio(g.rs.map((r) => r.horas.transito).filter((x): x is number => x !== undefined)), 1),
  }));
}

export function porCliente(rs: ResultadoServicio[]) {
  const m = new Map<string, ResultadoServicio[]>();
  for (const r of rs) m.set(r.s.cliente, [...(m.get(r.s.cliente) || []), r]);
  return [...m.entries()].map(([cliente, g]) => {
    const fila: Record<string, number | string | null> = { cliente, servicios: g.length };
    for (const e of [...ETAPAS, ...ETAPAS_TOTALES]) {
      const xs = g.map((r) => r.horas[e.clave]).filter((x): x is number => x !== undefined);
      fila[e.clave] = redondear(promedio(xs), 1);
    }
    fila.onTime = redondear(pctOnTime(g, "onTime").pct);
    fila.onTimeCarga = redondear(pctOnTime(g, "onTimeCarga").pct);
    fila.onTimeEntrega = redondear(pctOnTime(g, "onTimeEntrega").pct);
    fila.evaluados = pctOnTime(g, "onTime").evaluados;
    return fila;
  }).sort((a, b) => Number(b.servicios) - Number(a.servicios));
}

function redondear(n: number | null, d = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return null;
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function duracion(h: number | null | undefined) {
  if (h === null || h === undefined) return "—";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.floor(h)} h ${Math.round((h % 1) * 60)} min`;
  return `${(h / 24).toFixed(1)} días`;
}

export function horaMx(ms: number | null) {
  if (ms === null) return "—";
  return new Date(ms).toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function retraso(min: number | null) {
  if (min === null) return "—";
  if (min <= 0) return `${Math.abs(min) >= 60 ? duracion(Math.abs(min) / 60) : `${Math.abs(min)} min`} antes`;
  return `${min >= 60 ? duracion(min / 60) : `${min} min`} tarde`;
}
