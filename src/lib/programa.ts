import { ESTATUS_INFO, type Estatus } from "./constants";
import { exportarExcel, exportarPDFTabla } from "./exportar";
import { fecha, hora } from "./format";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Programa de servicios para enviar al proveedor (sin costos ni ventas)
const req = (s: any) =>
  [["Fumigación", s.req_fumigacion], ["GPS", s.req_gps], ["Cuenta espejo", s.req_cuenta_espejo], ["Póliza", s.req_poliza_seguro], ["SUA", s.req_sua]]
    .filter(([, v]) => v === "SI").map(([l]) => l).join(", ");
const dom = (...p: (string | null | undefined)[]) => p.filter(Boolean).join(", ");

export function filasPrograma(servicios: any[]) {
  return servicios.map((s) => ({
    "ID TRACK": s.id_track,
    Estatus: ESTATUS_INFO[s.estatus as Estatus]?.label || s.estatus,
    Cliente: s.cliente || "",
    "Fecha carga": fecha(s.fecha_carga),
    "Cita carga": hora(s.cita_carga),
    Origen: s.origen || "",
    "Lugar de carga": dom(s.cliente_carga, s.carga_domicilio, s.carga_colonia, s.carga_cp && `CP ${s.carga_cp}`),
    "Fecha descarga": fecha(s.fecha_descarga),
    "Cita descarga": hora(s.cita_descarga),
    Destino: s.destino || "",
    "Lugar de descarga": dom(s.cliente_descarga, s.descarga_domicilio, s.descarga_colonia, s.descarga_cp && `CP ${s.descarga_cp}`),
    Unidad: s.tipo_unidad || "",
    Carga: s.tipo_carga || "",
    Requerimientos: req(s),
    Transportista: s.proveedor || "",
    Operador: s.operador || "",
    Placas: [s.placas_unidad, s.placas_caja].filter(Boolean).join(" / "),
    Comentarios: s.comentarios || "",
  }));
}

export async function programaPDF(servicios: any[], subtitulo: string) {
  const filas = filasPrograma(servicios);
  const cols = ["ID TRACK", "Fecha carga", "Cita carga", "Origen", "Lugar de carga", "Fecha descarga", "Cita descarga", "Destino", "Lugar de descarga", "Unidad", "Carga", "Requerimientos", "Operador", "Placas"];
  await exportarPDFTabla("Programa de servicios", subtitulo, cols, filas.map((f) => cols.map((c) => String(f[c as keyof typeof f] ?? ""))), "Programa_servicios");
}

export async function programaExcel(servicios: any[]) {
  await exportarExcel([{ nombre: "Programa", filas: filasPrograma(servicios) }], "Programa_servicios");
}
