import { ESTATUS_INFO, type Estatus } from "./constants";
import { exportarExcel, exportarPDFTabla } from "./exportar";

export type RegBitacora = {
  id: string; servicio_id: string; created_at: string; estatus: string; origen: string; comentario?: string | null;
  lat?: number | null; lng?: number | null; id_track: string; cliente: string; origen_carga?: string | null; destino?: string | null;
  proveedor?: string | null; operador?: string | null; usuario?: string | null;
};

const fh = (d: string) => new Date(d).toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "short", timeStyle: "short" });
const est = (e: string) => ESTATUS_INFO[e as Estatus]?.label || e;
const quien = (r: RegBitacora) => (r.origen === "operador" ? `Operador${r.operador ? ` (${r.operador})` : ""}` : r.usuario || "Sistema");

export function filasBitacora(regs: RegBitacora[]) {
  return regs.map((r) => ({
    "Fecha y hora": fh(r.created_at),
    "ID TRACK": r.id_track,
    Cliente: r.cliente,
    Ruta: `${r.origen_carga || "—"} → ${r.destino || "—"}`,
    Transportista: r.proveedor || "",
    Estatus: est(r.estatus),
    "Registrado por": quien(r),
    Comentario: r.comentario || "",
    Ubicación: r.lat ? `https://maps.google.com/?q=${r.lat},${r.lng}` : "",
  }));
}

export async function bitacoraExcel(regs: RegBitacora[], archivo = "Bitacora_estatus") {
  await exportarExcel([{ nombre: "Bitácora de estatus", filas: filasBitacora(regs) }], archivo);
}

export async function bitacoraPDF(regs: RegBitacora[], subtitulo: string, archivo = "Bitacora_estatus") {
  const filas = filasBitacora(regs);
  const cols = ["Fecha y hora", "ID TRACK", "Cliente", "Ruta", "Transportista", "Estatus", "Registrado por", "Comentario"];
  await exportarPDFTabla("Bitácora de estatus", subtitulo, cols, filas.map((f) => cols.map((c) => String(f[c as keyof typeof f] ?? ""))), archivo);
}
