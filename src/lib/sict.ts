// Kilómetros y casetas desde "Rutas Punto a Punto" de la SICT (app.sct.gob.mx), el mismo
// servicio oficial que publica las tarifas de peaje por tipo de vehículo.
const BASE = "https://app.sct.gob.mx/sibuac_internet/ControllerUI";

// Tipo de vehículo en la SICT según la unidad del cotizador
export const VEHICULO_SICT: Record<string, { codigo: string; etiqueta: string }> = {
  camioneta_1_5: { codigo: "5", etiqueta: "Pick Up" },
  camioneta_3_5: { codigo: "9", etiqueta: "Camión 2 ejes" },
  torton: { codigo: "10", etiqueta: "Camión 3 ejes" },
  trailer: { codigo: "12", etiqueta: "Camión 5 ejes" },
  full: { codigo: "15", etiqueta: "Camión 8 ejes" },
};

export const ESTADOS_SICT: Record<number, string> = {
  1: "Aguascalientes", 2: "Baja California", 3: "Baja California Sur", 4: "Campeche", 5: "Coahuila",
  6: "Colima", 7: "Chiapas", 8: "Chihuahua", 9: "Distrito Federal", 10: "Durango", 11: "Guanajuato",
  12: "Guerrero", 13: "Hidalgo", 14: "Jalisco", 15: "México", 16: "Michoacán", 17: "Morelos",
  18: "Nayarit", 19: "Nuevo León", 20: "Oaxaca", 21: "Puebla", 22: "Querétaro", 23: "Quintana Roo",
  24: "San Luis Potosí", 25: "Sinaloa", 26: "Sonora", 27: "Tabasco", 28: "Tamaulipas", 29: "Tlaxcala",
  30: "Veracruz", 31: "Yucatán", 32: "Zacatecas",
};

export const limpiar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// "Peribán, Michoacán de Ocampo" → 16
export function estadoSict(nombrePoblacion: string): number | null {
  const partes = nombrePoblacion.split(",");
  if (partes.length < 2) return null;
  let edo = limpiar(partes[partes.length - 1]);
  const alias: Record<string, string> = {
    "michoacan de ocampo": "michoacan", "veracruz de ignacio de la llave": "veracruz",
    "coahuila de zaragoza": "coahuila", "ciudad de mexico": "distrito federal", "cdmx": "distrito federal",
    "estado de mexico": "mexico", "queretaro de arteaga": "queretaro",
  };
  edo = alias[edo] || edo;
  for (const [k, v] of Object.entries(ESTADOS_SICT)) if (limpiar(v) === edo) return Number(k);
  return null;
}

export const municipio = (nombrePoblacion: string) => nombrePoblacion.split(",")[0].trim();

async function traer(url: string) {
  const r = await fetch(url, { headers: { "user-agent": "KTM-Kayard/1.0" }, next: { revalidate: 86400 } });
  if (!r.ok) throw new Error(`SICT respondió ${r.status}`);
  // El sitio responde en ISO-8859-1
  return Buffer.from(await r.arrayBuffer()).toString("latin1");
}

export type PuntoSict = { id: string; nombre: string };

// Catálogo de puntos de un estado (se cachea 24 h)
export async function puntosDeEstado(estado: number): Promise<PuntoSict[]> {
  const html = await traer(`${BASE}?action=cmdEscogeRuta&edoOrigen=${estado}&edoDestino=${estado}`);
  const sel = html.match(/<select[^>]*name="ciudadOrigen"[\s\S]*?<\/select>/i);
  if (!sel) return [];
  const puntos: PuntoSict[] = [];
  const re = /<option[^>]*value="(\d+)"[^>]*>([^<]*)</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sel[0]))) {
    const nombre = m[2].replace(/&nbsp;/g, " ").trim();
    if (m[1] !== "0" && nombre && nombre !== "Seleccionar") puntos.push({ id: m[1], nombre });
  }
  return puntos;
}

// Mejor coincidencia del nombre del municipio dentro del catálogo del estado
export function mejorPunto(nombre: string, puntos: PuntoSict[]): PuntoSict | null {
  const n = limpiar(nombre);
  const exacto = puntos.find((p) => limpiar(p.nombre) === n);
  if (exacto) return exacto;
  const empieza = puntos.find((p) => limpiar(p.nombre).startsWith(n) || n.startsWith(limpiar(p.nombre)));
  if (empieza) return empieza;
  const contiene = puntos.find((p) => limpiar(p.nombre).includes(n) || n.includes(limpiar(p.nombre)));
  return contiene || null;
}

export type RutaSict = {
  km: number; horas: string; casetas: number; vehiculo: string;
  tramos: { tramo: string; carretera: string; km: number; caseta: string; costo: number }[];
};

const aNumero = (s: string) => Number(String(s).replace(/[^\d.-]/g, "")) || 0;

// Consulta la ruta entre dos puntos del catálogo para el tipo de vehículo indicado
export async function rutaSict(edoOrigen: number, origen: string, edoDestino: number, destino: string, vehiculo: string): Promise<RutaSict> {
  const q = new URLSearchParams({
    action: "cmdSolRutas", tipo: "1", red: "simplificada",
    edoOrigen: String(edoOrigen), ciudadOrigen: origen, edoDestino: String(edoDestino), ciudadDestino: destino,
    vehiculos: vehiculo, tamanioVehiculo: "2", rendimiento: "2", combustible: "1",
  });
  const html = await traer(`${BASE}?${q}`);
  const filas = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((f) =>
    [...f[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => c[1].replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim())
  );
  const encabezado = filas.find((f) => f[0] === "Nombre");
  const totales = filas.find((f) => f[0]?.startsWith("Totales"));
  if (!totales) throw new Error("La SICT no devolvió la ruta (revisa los puntos elegidos)");
  const tramos = filas
    .filter((f) => f.length >= 7 && f[0] !== "Nombre" && !f[0].startsWith("Totales") && aNumero(f[3]) > 0)
    .map((f) => ({ tramo: f[0], carretera: f[2], km: aNumero(f[3]), caseta: f[5], costo: aNumero(f[6]) }));
  return {
    km: aNumero(totales[1]),
    horas: totales[2] || "",
    casetas: aNumero(totales[totales.length - 1]),
    vehiculo: encabezado?.[6] || "",
    tramos,
  };
}
