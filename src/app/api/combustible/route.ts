import { NextResponse } from "next/server";

// Precio del combustible del día a partir de la publicación oficial de precios de la CRE
// (acuerdo A/041/2018: cada estación reporta sus precios; aquí se promedian).
// Fuente: https://publicacionexterna.azurewebsites.net/publicaciones/prices  (+ /places para ubicar estaciones)
const URL_PRECIOS = "https://publicacionexterna.azurewebsites.net/publicaciones/prices";
const URL_LUGARES = "https://publicacionexterna.azurewebsites.net/publicaciones/places";
// Caja aproximada de Jalisco para el promedio estatal
const JAL = { latMin: 18.9, latMax: 22.8, lonMin: -105.7, lonMax: -101.5 };

export const revalidate = 21600; // 6 horas
export const maxDuration = 60;

type Prom = { regular: number | null; premium: number | null; diesel: number | null; estaciones: number };

function promedio(vals: number[]) {
  const v = vals.filter((x) => x > 5 && x < 60); // descarta capturas erróneas
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : null;
}

export async function GET() {
  try {
    const [rp, rl] = await Promise.all([
      fetch(URL_PRECIOS, { next: { revalidate }, headers: { "user-agent": "KTM-Kayard/1.0" } }),
      fetch(URL_LUGARES, { next: { revalidate }, headers: { "user-agent": "KTM-Kayard/1.0" } }).catch(() => null),
    ]);
    if (!rp.ok) throw new Error(`CRE respondió ${rp.status}`);
    const xml = await rp.text();

    // Estaciones dentro de Jalisco (por coordenadas)
    const enJal = new Set<string>();
    if (rl && rl.ok) {
      const lugares = await rl.text();
      const re = /<place[^>]*place_id="(\d+)"[^>]*>[\s\S]*?<x>(-?[\d.]+)<\/x>[\s\S]*?<y>(-?[\d.]+)<\/y>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(lugares))) {
        const lon = parseFloat(m[2]), lat = parseFloat(m[3]);
        if (lat >= JAL.latMin && lat <= JAL.latMax && lon >= JAL.lonMin && lon <= JAL.lonMax) enJal.add(m[1]);
      }
    }

    const nac: Record<string, number[]> = { regular: [], premium: [], diesel: [] };
    const jal: Record<string, number[]> = { regular: [], premium: [], diesel: [] };
    const rePlace = /<place[^>]*place_id="(\d+)"[^>]*>([\s\S]*?)<\/place>/g;
    const rePrecio = /<gas_price[^>]*type="(regular|premium|diesel)"[^>]*>([\d.]+)<\/gas_price>/g;
    let p: RegExpExecArray | null;
    let estaciones = 0;
    while ((p = rePlace.exec(xml))) {
      estaciones++;
      let q: RegExpExecArray | null;
      while ((q = rePrecio.exec(p[2]))) {
        const v = parseFloat(q[2]);
        nac[q[1]].push(v);
        if (enJal.has(p[1])) jal[q[1]].push(v);
      }
    }
    const nacional: Prom = { regular: promedio(nac.regular), premium: promedio(nac.premium), diesel: promedio(nac.diesel), estaciones };
    const jalisco: Prom = { regular: promedio(jal.regular), premium: promedio(jal.premium), diesel: promedio(jal.diesel), estaciones: enJal.size };
    if (!nacional.diesel || !nacional.regular) throw new Error("La publicación no trajo precios");
    return NextResponse.json({ ok: true, fecha: new Date().toISOString(), fuente: "CRE – precios reportados por las estaciones (publicación oficial)", nacional, jalisco });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "No se pudo consultar el precio" }, { status: 502 });
  }
}
