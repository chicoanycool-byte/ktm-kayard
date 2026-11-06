"use client";
// Descarga de fotos de evidencia (una o todas en .zip)

export type Foto = { foto_path: string; tipo?: string; created_at?: string };

const url = (path: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/evidencias/${path}`;

export function nombresFotos(idTrack: string, fotos: Foto[]) {
  const cuenta: Record<string, number> = {};
  return fotos.map((f) => {
    const tipo = f.tipo === "documentos" ? "documento" : "evidencia";
    cuenta[tipo] = (cuenta[tipo] || 0) + 1;
    const ext = (f.foto_path.split(".").pop() || "jpg").toLowerCase();
    return `${idTrack}_${tipo}_${cuenta[tipo]}.${ext}`;
  });
}

function guardarBlob(blob: Blob, nombre: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function descargarFoto(path: string, nombre: string) {
  const r = await fetch(url(path));
  if (!r.ok) throw new Error("No se pudo descargar la foto");
  guardarBlob(await r.blob(), nombre);
}

export async function descargarTodas(idTrack: string, fotos: Foto[]) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const nombres = nombresFotos(idTrack, fotos);
  await Promise.all(fotos.map(async (f, i) => {
    const r = await fetch(url(f.foto_path));
    if (r.ok) zip.file(nombres[i], await r.blob());
  }));
  guardarBlob(await zip.generateAsync({ type: "blob" }), `${idTrack}_fotos.zip`);
}
