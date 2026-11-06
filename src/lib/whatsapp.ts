import { fecha, hora, money } from "./format";

// Mensajes equivalentes a las acciones de WhatsApp de AppSheet
export type ServicioWA = {
  id_track: string;
  cliente?: string | null;
  cliente_contacto?: string | null;
  cliente_telefono?: string | null;
  tipo_unidad?: string | null;
  tipo_carga?: string | null;
  origen?: string | null;
  destino?: string | null;
  fecha_carga?: string | null;
  fecha_descarga?: string | null;
  cliente_carga?: string | null;
  cita_carga?: string | null;
  cliente_descarga?: string | null;
  cita_descarga?: string | null;
  req_fumigacion?: string | null;
  req_cuenta_espejo?: string | null;
  req_sua?: string | null;
  proveedor?: string | null;
  proveedor_contacto?: string | null;
  proveedor_telefono?: string | null;
  operador?: string | null;
  operador_telefono?: string | null;
  placas_unidad?: string | null;
  factura_proveedor?: string | null;
  venta_flete?: number | null;
  venta_seguro?: number | null;
  venta_estadias?: number | null;
  venta_maniobra?: number | null;
};

export function telefonoMx(tel?: string | null) {
  const d = (tel || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 10) return "52" + d;
  return d;
}

export function linkWhatsApp(tel: string | null | undefined, texto: string) {
  const t = telefonoMx(tel);
  return `https://wa.me/${t}?text=${encodeURIComponent(texto)}`;
}

export function msgCliente(s: ServicioWA) {
  return [
    `Hola ${s.cliente_contacto || ""}`.trim(),
    "",
    "Te comparto la confirmación del servicio que nos solicitaste y su ID TRACK.",
    "",
    `ID TRACK: ${s.id_track}`,
    "",
    `Tipo de unidad: ${s.tipo_unidad || "—"}`,
    `Tipo de carga: ${s.tipo_carga || "—"}`,
    `Origen: ${s.origen || "—"}`,
    `Destino: ${s.destino || "—"}`,
    `Fecha de carga: ${fecha(s.fecha_carga)}`,
    `Fecha de descarga: ${fecha(s.fecha_descarga)}`,
    `Carga en: ${s.cliente_carga || "—"} (cita ${hora(s.cita_carga)})`,
    `Descarga en: ${s.cliente_descarga || "—"} (cita ${hora(s.cita_descarga)})`,
    "",
    "*Gracias por confiar en nosotros* 🚛",
  ].join("\n");
}

export function msgProveedor(s: ServicioWA) {
  return [
    `Hola ${s.proveedor_contacto || ""}`.trim(),
    "",
    "Te paso la información del viaje que te asignamos.",
    "",
    `ID TRACK: ${s.id_track}`,
    "",
    "*DATOS GENERALES*",
    `Tipo de unidad: ${s.tipo_unidad || "—"}`,
    `Origen: ${s.origen || "—"}`,
    `Carga en: ${s.cliente_carga || "—"}`,
    `Fecha de carga: ${fecha(s.fecha_carga)} ${hora(s.cita_carga)}`,
    `Destino: ${s.destino || "—"}`,
    `Descarga en: ${s.cliente_descarga || "—"}`,
    `Fecha de descarga: ${fecha(s.fecha_descarga)} ${hora(s.cita_descarga)}`,
    "",
    "*EXTRAS*",
    `Fumigación: ${s.req_fumigacion || "—"}`,
    `Cuenta espejo: ${s.req_cuenta_espejo || "—"}`,
    `SUA: ${s.req_sua || "—"}`,
    "",
    "*OPERADOR*",
    `Operador: ${s.operador || "—"}`,
    `Placas: ${s.placas_unidad || "—"}`,
    "",
    "Gracias, buen viaje 🚚",
  ].join("\n");
}

export function msgOperador(s: ServicioWA, link: string) {
  return [
    `Hola ${s.operador || ""}`.trim(),
    "",
    "Te mando la información de tu viaje.",
    "",
    `ID TRACK: ${s.id_track}`,
    `Tipo de unidad: ${s.tipo_unidad || "—"}`,
    `Origen: ${s.origen || "—"} — ${s.cliente_carga || ""}`,
    `Fecha de carga: ${fecha(s.fecha_carga)} ${hora(s.cita_carga)}`,
    `Destino: ${s.destino || "—"} — ${s.cliente_descarga || ""}`,
    `Fecha de descarga: ${fecha(s.fecha_descarga)} ${hora(s.cita_descarga)}`,
    "",
    "Desde este link vas actualizando el estatus y subes tus evidencias:",
    link,
    "",
    "Buen viaje 🚛",
  ].join("\n");
}

export function msgFacturar(s: ServicioWA, nombre: string) {
  // Mismo contenido que la acción "Enviar facturar" de AppSheet
  return [
    `Hola ${nombre}`.trim(),
    "",
    "De tu apoyo para facturar este ID TRACK.",
    "",
    `ID TRACK: ${s.id_track}.`,
    "",
    `*Cliente*: ${s.cliente || "—"}.`,
    `*Transporte*: ${s.proveedor || "—"}.`,
    `*Fecha Carga*: ${fecha(s.fecha_carga)}.`,
    `*Factura de cliente*: ${s.factura_proveedor || "—"}.`,
    `*Origen*: ${s.origen || "—"}.`,
    `*Destino*: ${s.destino || "—"}.`,
    `*Transporte*: ${money(s.venta_flete)}.`,
    `*Seguro*: ${money(s.venta_seguro)}.`,
    `*Estadias*: ${money(s.venta_estadias)}.`,
    `*Maniobra*: ${money(s.venta_maniobra)}.`,
    "",
    "*🙏🤝GRACIAS GORDO 😘.*",
  ].join("\n");
}
