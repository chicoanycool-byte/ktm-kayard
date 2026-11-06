"use client";
// Exportación a Excel y PDF (se cargan las librerías solo cuando se usan)

export type Hoja = { nombre: string; filas: Record<string, unknown>[] };

function fechaArchivo() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}

export async function exportarExcel(hojas: Hoja[], archivo: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const h of hojas) {
    const ws = XLSX.utils.json_to_sheet(h.filas.length ? h.filas : [{ "Sin datos": "" }]);
    const cols = Object.keys(h.filas[0] || {});
    ws["!cols"] = cols.map((c) => ({ wch: Math.min(45, Math.max(c.length, ...h.filas.slice(0, 300).map((f) => String(f[c] ?? "").length)) + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, h.nombre.slice(0, 31).replace(/[\\/?*[\]:]/g, " "));
  }
  XLSX.writeFile(wb, `${archivo}_${fechaArchivo()}.xlsx`);
}

async function encabezadoPDF(titulo: string, subtitulo: string, horizontal = true) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: horizontal ? "landscape" : "portrait", unit: "pt", format: "letter" });
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(10, 22, 40);
  doc.rect(0, 0, w, 54, "F");
  try {
    const img = await fetch("/logo-kayard.png").then((r) => r.blob()).then((b) => new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(b); }));
    doc.setFillColor(232, 240, 247);
    doc.roundedRect(w - 150, 8, 136, 38, 4, 4, "F");
    doc.addImage(img, "PNG", w - 146, 10, 128, 34);
  } catch { /* sin logo */ }
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text(titulo, 24, 26);
  doc.setFontSize(9);
  doc.setTextColor(245, 166, 35);
  doc.text(subtitulo, 24, 42);
  return doc;
}

export async function exportarPDFTabla(titulo: string, subtitulo: string, columnas: string[], filas: (string | number)[][], archivo: string) {
  const doc = await encabezadoPDF(titulo, subtitulo);
  const autoTable = (await import("jspdf-autotable")).default;
  autoTable(doc, {
    startY: 66,
    head: [columnas],
    body: filas,
    styles: { fontSize: 7.5, cellPadding: 3 },
    headStyles: { fillColor: [27, 58, 92], textColor: [245, 166, 35] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { left: 20, right: 20 },
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`KTM · Kayard Transport Management · Página ${doc.getNumberOfPages()}`, 20, h - 12);
    },
  });
  doc.save(`${archivo}_${fechaArchivo()}.pdf`);
}

// Captura un elemento de la pantalla (por ejemplo un tablero) y lo pone en un PDF, partido en hojas si es largo
export async function exportarPDFElemento(el: HTMLElement, titulo: string, subtitulo: string, archivo: string, fondo = "#0F1E2E", orientacion: "horizontal" | "vertical" = "horizontal") {
  const html2canvas = (await import("html2canvas-pro")).default;
  const canvas = await html2canvas(el, { backgroundColor: fondo, scale: 2, useCORS: true });
  const doc = await encabezadoPDF(titulo, subtitulo, orientacion === "horizontal");
  const w = doc.internal.pageSize.getWidth() - 40;
  const hPag = doc.internal.pageSize.getHeight();
  const escala = w / canvas.width;
  const altoUtil = (hPag - 90) / escala; // px de canvas por página
  let y = 0;
  let primera = true;
  while (y < canvas.height) {
    const alto = Math.min(altoUtil, canvas.height - y);
    const trozo = document.createElement("canvas");
    trozo.width = canvas.width;
    trozo.height = alto;
    trozo.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, alto, 0, 0, canvas.width, alto);
    if (!primera) doc.addPage();
    doc.addImage(trozo.toDataURL("image/png"), "PNG", 20, primera ? 66 : 24, w, alto * escala);
    primera = false;
    y += alto;
  }
  doc.save(`${archivo}_${fechaArchivo()}.pdf`);
}
