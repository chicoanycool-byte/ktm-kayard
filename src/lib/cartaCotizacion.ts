// Genera la carta de cotización FCV-03 en Word (.docx) con el mismo formato del documento de Bonyard.
import {
  AlignmentType, BorderStyle, Document, Footer, ImageRun, LevelFormat, PageNumber, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from "docx";
import { money } from "./format";
import type { ConfigCotizador } from "./cotizador";

export type DatosCarta = {
  folio: string;
  fecha: string;             // YYYY-MM-DD
  cliente: string;
  contacto?: string | null;
  ruta: string;              // "Acatic, Jalisco → Almacén Bonyard Nave 2, El Salto, Jalisco"
  unidad_descripcion: string;
  tarimas: string;
  tarifa: number;            // tarifa cliente antes de IVA
  hora_extra: number;
  estadia: number;
  condiciones: string[];
  cfg: ConfigCotizador;
};

const FONT = "Aptos";
const NAVY = "1F3864";
const bordes = { style: BorderStyle.SINGLE, size: 6, color: "000000" } as const;
const marco = { top: bordes, bottom: bordes, left: bordes, right: bordes };

const fechaLarga = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
};
const t = (text: string, o: { bold?: boolean; size?: number; color?: string } = {}) => new TextRun({ text, font: FONT, size: o.size ?? 20, bold: o.bold, color: o.color });
const p = (runs: TextRun[] | string, o: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; before?: number; bold?: boolean; size?: number; color?: string } = {}) =>
  new Paragraph({ alignment: o.align, spacing: { after: o.after ?? 120, before: o.before ?? 0, line: 276 }, children: typeof runs === "string" ? [t(runs, { bold: o.bold, size: o.size, color: o.color })] : runs });
const celda = (children: Paragraph[], width: number, o: { fill?: string; vAlign?: boolean } = {}) =>
  new TableCell({ children, width: { size: width, type: WidthType.DXA }, borders: marco, verticalAlign: o.vAlign ? VerticalAlign.CENTER : undefined, margins: { top: 60, bottom: 60, left: 100, right: 100 }, shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined });

export async function generarCartaCotizacion(d: DatosCarta): Promise<Blob> {
  const logo = await fetch("/logo-bonyard.png").then((r) => r.arrayBuffer());
  const e = d.cfg.empresa;
  const saludo = d.contacto ? `${d.contacto} / ${d.cliente}` : d.cliente;

  const encabezado = new Table({
    columnWidths: [2300, 6500, 2540],
    width: { size: 11340, type: WidthType.DXA },
    rows: [new TableRow({ children: [
      celda([new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: "png", data: logo, transformation: { width: 133, height: 54 } })] })], 2300, { vAlign: true }),
      celda([p("CARTA DE COTIZACION", { align: AlignmentType.CENTER, bold: true, size: 36, after: 0 })], 6500, { vAlign: true }),
      celda([p(e.codigo_formato, { size: 18, after: 60 }), p(`VERSION: ${e.version_formato}`, { size: 18, after: 60 }), p(`FECHA: ${e.fecha_formato}`, { size: 18, after: 0 })], 2540, { vAlign: true }),
    ] })],
  });

  const th = (txt: string, w: number) => celda([p(txt, { align: AlignmentType.CENTER, bold: true, color: "FFFFFF", after: 0 })], w, { fill: NAVY, vAlign: true });
  type Align = (typeof AlignmentType)[keyof typeof AlignmentType];
const td = (txt: string, w: number, align: Align = AlignmentType.LEFT, bold = false) => celda([p(txt, { align, bold, after: 0 })], w, { vAlign: true });
  const tarifas = new Table({
    columnWidths: [3000, 1900, 1700, 1500, 1710],
    width: { size: 9810, type: WidthType.DXA },
    rows: [
      new TableRow({ tableHeader: true, children: [th("Tipo de unidad", 3000), th("Cap. Tarimas", 1900), th("Tarifa", 1700), th("Hora extra", 1500), th("Estadía / día", 1710)] }),
      new TableRow({ children: [
        td(d.unidad_descripcion, 3000), td(d.tarimas, 1900, AlignmentType.CENTER), td(money(d.tarifa), 1700, AlignmentType.CENTER, true),
        td(money(d.hora_extra), 1500, AlignmentType.RIGHT), td(money(d.estadia), 1710, AlignmentType.RIGHT),
      ] }),
    ],
  });

  const doc = new Document({
    creator: e.nombre,
    title: `Carta de cotización ${d.folio}`,
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    numbering: { config: [{ reference: "vinetas", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } } } }] }] },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 500, right: 450, bottom: 700, left: 450, header: 708, footer: 300 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [t("Página ", { size: 16, color: "7F7F7F" }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: "7F7F7F" }), t(" de ", { size: 16, color: "7F7F7F" }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: "7F7F7F" })] })] }) },
      children: [
        encabezado,
        p("", { after: 120 }),
        p(`Fecha: ${fechaLarga(d.fecha)}`, { bold: true }),
        p(`Folio: ${d.folio}`, { size: 18, color: "595959" }),
        p(`Estimado(a) ${saludo},`, { bold: true }),
        p("Gracias por su solicitud. A continuación, les enviamos nuestra cotización.", { bold: true }),
        p(`Reciba un cordial saludo de parte de ${e.nombre}. Somos un operador logístico 3PL especializado en almacenamiento de grado alimenticio, con operación certificada bajo los estándares SQF e ISO 9001:2015, lo que garantiza procesos auditables, trazabilidad y cumplimiento normativo en cada etapa del servicio.`),
        p("Como complemento a nuestras operaciones de almacenaje, ponemos a su disposición nuestro servicio de transporte de carga, con una flotilla diversificada que se adapta a distintos volúmenes y tipos de mercancía. A continuación, presentamos nuestra propuesta de tarifa para su operación."),
        p("Tarifas de Transporte", { bold: true, color: NAVY, before: 120 }),
        p(`Ruta: ${d.ruta}`, { bold: true }),
        tarifas,
        p(`Tarifa expresada en pesos mexicanos (MXN), antes de IVA. Hora extra y estadía aplican una vez agotadas las ${d.cfg.horas_libres_carga} horas libres de carga y las ${d.cfg.horas_libres_descarga} horas libres de descarga.`, { size: 15, color: "595959", before: 80 }),
        p("Condiciones Comerciales", { bold: true, color: NAVY, before: 120 }),
        ...d.condiciones.map((c) => new Paragraph({ numbering: { reference: "vinetas", level: 0 }, spacing: { after: 60, line: 264 }, children: [t(c, { size: 16 })] })),
        p("Quedamos atentos a sus comentarios y a su disposición para coordinar el inicio de operaciones.", { size: 16, before: 120 }),
        p("Atentamente,", { before: 200 }),
        p(e.firma, { bold: true, after: 0 }),
        p(e.nombre, { bold: true, color: NAVY, after: 0 }),
        p(e.ciudad, { color: "7F7F7F" }),
      ],
    }],
  });
  return Packer.toBlob(doc);
}

export function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
