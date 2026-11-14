// Consulta a "Traza tu ruta / Rutas punto a punto" de la SICT: kilómetros oficiales y costo de casetas por tipo de unidad.
// Es la herramienta pública del gobierno (app.sct.gob.mx), sin llave ni costo.

export const BASE = "http://app.sct.gob.mx/sibuac_internet/ControllerUI";

// Estados como los numera la SICT
export const ESTADOS_SICT: { id: number; nombre: string; alias?: string[] }[] = [
  { id: 1, nombre: "Aguascalientes" }, { id: 2, nombre: "Baja California" }, { id: 3, nombre: "Baja California Sur" },
  { id: 4, nombre: "Campeche" }, { id: 5, nombre: "Coahuila", alias: ["Coahuila de Zaragoza"] }, { id: 6, nombre: "Colima" },
  { id: 7, nombre: "Chiapas" }, { id: 8, nombre: "Chihuahua" }, { id: 9, nombre: "Distrito Federal", alias: ["Ciudad de México", "CDMX", "Cd. de México"] },
  { id: 10, nombre: "Durango" }, { id: 11, nombre: "Guanajuato" }, { id: 12, nombre: "Guerrero" }, { id: 13, nombre: "Hidalgo" },
  { id: 14, nombre: "Jalisco" }, { id: 15, nombre: "México", alias: ["Estado de México", "Edomex"] },
  { id: 16, nombre: "Michoacán", alias: ["Michoacán de Ocampo"] }, { id: 17, nombre: "Morelos" }, { id: 18, nombre: "Nayarit" },
  { id: 19, nombre: "Nuevo León" }, { id: 20, nombre: "Oaxaca" }, { id: 21, nombre: "Puebla" }, { id: 22, nombre: "Querétaro" },
  { id: 23, nombre: "Quintana Roo" }, { id: 24, nombre: "San Luis Potosí" }, { id: 25, nombre: "Sinaloa" }, { id: 26, nombre: "Sonora" },
  { id: 27, nombre: "Tabasco" }, { id: 28, nombre: "Tamaulipas" }, { id: 29, nombre: "Tlaxcala" },
  { id: 30, nombre: "Veracruz", alias: ["Veracruz de Ignacio de la Llave"] }, { id: 31, nombre: "Yucatán" }, { id: 32, nombre: "Zacatecas" },
];

// Tipos de vehículo de la SICT (deciden la tarifa de caseta)
export const VEHICULOS_SICT: { id: string; nombre: string }[] = [
  { id: "1", nombre: "Motocicleta" }, { id: "2", nombre: "Automóvil" }, { id: "5", nombre: "Pick Up" },
  { id: "9", nombre: "Camión 2 ejes" }, { id: "10", nombre: "Camión 3 ejes" }, { id: "11", nombre: "Camión 4 ejes" },
  { id: "12", nombre: "Camión 5 ejes" }, { id: "13", nombre: "Camión 6 ejes" }, { id: "14", nombre: "Camión 7 ejes" },
  { id: "15", nombre: "Camión 8 ejes" }, { id: "16", nombre: "Camión 9 ejes" },
];

export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/^(t|cd\.?|sn\.?|san|santa)\s+/i, (m) => (/^t\s/i.test(m) ? "" : m))
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// "El Salto, Jalisco" → { municipio: "El Salto", estado: 14 }
export function partirPoblacion(nombre: string): { municipio: string; estado: number | null } {
  const i = nombre.lastIndexOf(",");
  if (i < 0) return { municipio: nombre.trim(), estado: null };
  const mun = nombre.slice(0, i).trim(), est = normalizar(nombre.slice(i + 1));
  const e = ESTADOS_SICT.find((x) => normalizar(x.nombre) === est || x.alias?.some((a) => normalizar(a) === est));
  return { municipio: mun, estado: e?.id ?? null };
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const CABECERAS = {
  "user-agent": UA,
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "es-MX,es;q=0.9",
  "referer": `${BASE}?action=cmdEscogeRuta`,
};

const cuerpo = (campos: Record<string, string>) =>
  new URLSearchParams({ tipo: "1", red: "detallada", puntosIntermedios: "null", calculaRendimiento: "null", ...campos });

// El sitio solo entrega el catálogo completo de puntos cuando hay sesión abierta,
// así que primero se pide la página y se reutiliza su cookie.
let sesion: { cookie: string; expira: number } | null = null;
async function cookieSesion(): Promise<string> {
  if (sesion && sesion.expira > Date.now()) return sesion.cookie;
  const r = await fetch(`${BASE}?action=cmdEscogeRuta`, { cache: "no-store", headers: CABECERAS });
  const set = r.headers.get("set-cookie") || "";
  const m = set.match(/JSESSIONID=[^;]+/);
  await r.arrayBuffer();
  const cookie = m ? m[0] : "";
  sesion = { cookie, expira: Date.now() + 10 * 60 * 1000 };
  return cookie;
}

async function pedir(accion: string, campos: Record<string, string>) {
  const cookie = await cookieSesion();
  const r = await fetch(`${BASE}?action=${accion}`, {
    method: "POST", body: cuerpo(campos), cache: "no-store",
    headers: { "content-type": "application/x-www-form-urlencoded", ...CABECERAS, ...(cookie ? { cookie } : {}) },
  });
  if (!r.ok) throw new Error(`La SICT respondió ${r.status}`);
  // El sitio responde en ISO-8859-1
  return new TextDecoder("iso-8859-1").decode(await r.arrayBuffer());
}

// El catálogo de puntos cambia muy poco: se guarda un rato en memoria
const cacheNodos = new Map<string, { nodos: ParNodos; expira: number }>();

export type NodoSICT = { codigo: string; nombre: string };
export type ParNodos = { origen: NodoSICT[]; destino: NodoSICT[] };

const opciones = (html: string, campo: string): NodoSICT[] => {
  const sel = html.match(new RegExp(`name="${campo}"[\\s\\S]*?</select>`));
  if (!sel) return [];
  return [...sel[0].matchAll(/<option[^>]*value="(\d+)"[^>]*>([^<]*)</g)]
    .filter((m) => m[1] !== "0")
    .map((m) => ({ codigo: m[1], nombre: m[2].replace(/&nbsp;/g, " ").trim() }));
};

// Puntos de la red federal que la SICT tiene para el estado de origen y el de destino.
// Se piden juntos, igual que lo hace su propia página, porque así devuelve el catálogo completo.
export async function nodosDeRuta(edoOrigen: number, edoDestino: number): Promise<ParNodos> {
  const clave = `${edoOrigen}-${edoDestino}`;
  const guardado = cacheNodos.get(clave);
  if (guardado && guardado.expira > Date.now()) return guardado.nodos;
  const html = await pedir("cmdEscogeRuta", {
    edoOrigen: String(edoOrigen), ciudadOrigen: "0", edoDestino: String(edoDestino), ciudadDestino: "0", vehiculos: "2",
  });
  const nodos: ParNodos = { origen: opciones(html, "ciudadOrigen"), destino: opciones(html, "ciudadDestino") };
  if (nodos.origen.length) cacheNodos.set(clave, { nodos, expira: Date.now() + 12 * 3600 * 1000 });
  return nodos;
}

// Un solo estado (para llenar la lista en pantalla)
export async function nodosDeEstado(estado: number): Promise<NodoSICT[]> {
  return (await nodosDeRuta(estado, estado)).origen;
}

// Elige el punto que mejor corresponde a un municipio
export function mejorNodo(municipio: string, nodos: NodoSICT[]): NodoSICT | null {
  const m = normalizar(municipio);
  const limpio = (n: string) => normalizar(n.replace(/^T\s+/, ""));
  return nodos.find((n) => limpio(n.nombre) === m)
    || nodos.find((n) => limpio(n.nombre).startsWith(m) || m.startsWith(limpio(n.nombre)))
    || nodos.find((n) => m.includes(limpio(n.nombre)) || limpio(n.nombre).includes(m))
    || null;
}

export type Caseta = { nombre: string; costo: number };
export type RutaSICT = { km: number; horas: string; casetas: number; detalle: Caseta[]; tramos: number; origen: string; destino: string };

const sinEtiquetas = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export async function consultarRuta(p: { edoOrigen: number; ciudadOrigen: string; edoDestino: number; ciudadDestino: string; vehiculo: string }): Promise<RutaSICT> {
  const html = await pedir("cmdSolRutas", {
    edoOrigen: String(p.edoOrigen), ciudadOrigen: p.ciudadOrigen,
    edoDestino: String(p.edoDestino), ciudadDestino: p.ciudadDestino, vehiculos: p.vehiculo,
  });
  const filas = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => sinEtiquetas(c[1])));
  const total = filas.find((f) => f.length >= 4 && /^totales$/i.test(f[0]));
  if (!total) {
    const aviso = sinEtiquetas(html).match(/no (se encontr|existe)[^.]*\./i);
    throw new Error(aviso ? aviso[0] : "La SICT no devolvió la ruta (puede que no haya camino entre esos puntos)");
  }
  const detalle: Caseta[] = [];
  let tramos = 0;
  for (const f of filas) {
    if (f.length < 7 || /^totales$/i.test(f[0])) continue;
    if (!/^\d+(\.\d+)?$/.test(f[3])) continue;
    tramos++;
    const costo = Number(f[6]);
    if (f[5] && Number.isFinite(costo) && costo > 0) detalle.push({ nombre: f[5], costo });
  }
  const enc = sinEtiquetas(html).match(/Ruta de ([^,]+) , ([^ ]+(?: [^ ]+)*?) a ([^,]+) , /);
  return {
    km: Number(total[1]) || 0,
    horas: total[2] || "",
    casetas: Number(total[total.length - 1]) || 0,
    detalle, tramos,
    origen: enc?.[1]?.trim() || "", destino: enc?.[3]?.trim() || "",
  };
}
