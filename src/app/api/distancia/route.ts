import { NextResponse } from "next/server";

// Kilómetros y casetas de la ruta con Google Routes API (requiere GOOGLE_MAPS_API_KEY en Vercel).
// Sin la clave, el cotizador pide los km y casetas a mano.
export async function POST(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "Sin clave de Google Maps (GOOGLE_MAPS_API_KEY). Captura los km y casetas a mano." }, { status: 501 });
  const { origen, destino } = await req.json();
  if (!origen || !destino) return NextResponse.json({ ok: false, error: "Falta origen o destino" }, { status: 400 });
  try {
    const r = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: { "content-type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.travelAdvisory.tollInfo" },
      body: JSON.stringify({
        origin: { address: `${origen}, México` }, destination: { address: `${destino}, México` },
        travelMode: "DRIVE", routingPreference: "TRAFFIC_UNAWARE", extraComputations: ["TOLLS"],
        routeModifiers: { vehicleInfo: { emissionType: "DIESEL" }, tollPasses: [] }, languageCode: "es-MX", units: "METRIC",
      }),
    });
    const j = await r.json();
    const ruta = j.routes?.[0];
    if (!ruta) return NextResponse.json({ ok: false, error: j.error?.message || "Google no encontró la ruta" }, { status: 502 });
    const km = Math.round((ruta.distanceMeters / 1000) * 10) / 10;
    const precio = ruta.travelAdvisory?.tollInfo?.estimatedPrice?.[0];
    const casetas = precio ? Number(precio.units || 0) + Number(precio.nanos || 0) / 1e9 : null;
    const horas = ruta.duration ? Math.round((parseInt(ruta.duration) / 3600) * 10) / 10 : null;
    return NextResponse.json({ ok: true, km, casetas, horas, nota: casetas === null ? "Google no reportó casetas para esta ruta (auto). Captúralas a mano." : "Casetas estimadas por Google para automóvil; ajusta según ejes de la unidad." });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Error al consultar Google" }, { status: 502 });
  }
}
