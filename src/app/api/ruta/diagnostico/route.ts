import { NextResponse } from "next/server";
import { consultarRuta, mejorNodo, nodosDeRuta } from "@/lib/sict";

// Comprobación temporal: ¿el servidor alcanza el servicio de rutas de la SICT?
export const maxDuration = 60;

export async function GET() {
  const out: Record<string, unknown> = {};
  try {
    const pares = await nodosDeRuta(14, 14);
    out.puntos_jalisco = pares.origen.length;
    out.busca_el_salto = mejorNodo("El Salto", pares.origen);
    out.busca_acatic = mejorNodo("Acatic", pares.origen);
    out.muestra = pares.origen.slice(0, 5).map((n) => n.nombre);
  } catch (e) { out.puntos_error = String(e); }
  try {
    out.ruta_gdl_tepa = await consultarRuta({ edoOrigen: 14, ciudadOrigen: "14160", edoDestino: 14, ciudadDestino: "14690", vehiculo: "12" });
  } catch (e) { out.ruta_error = String(e); }
  return NextResponse.json(out);
}
