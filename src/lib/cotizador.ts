// Cotizador de transporte: mismas fórmulas que el Excel "Cotizador_2026", con parámetros editables desde la app.

export const UNIDADES = ["camioneta_1_5", "camioneta_3_5", "torton", "trailer", "full"] as const;
export type Unidad = (typeof UNIDADES)[number];
export const TIPOS_VIAJE = ["Local", "Regional", "Foraneo"] as const;
export type TipoViaje = (typeof TIPOS_VIAJE)[number];

export type ParamUnidad = {
  nombre: string;              // nombre corto
  descripcion_carta: string;   // cómo aparece en la carta de cotización
  tarimas: string;             // capacidad en tarimas (texto para la carta)
  combustible: "gasolina" | "diesel";
  rendimiento: number;         // km por litro cargado
  velocidad: number;           // km/h promedio
  horas_fijas: number;         // horas fijas de carga/descarga por viaje
  mantenimiento_km: number;    // $/km
  operador_local: number;      // pago fijo por viaje local
  operador_regional_km: number;
  operador_foraneo_km: number;
  costo_fijo_diario: number;   // suma de depreciación, seguros, permisos, GPS, IMSS, administración, etc.
  hora_extra: number;          // $ por hora extra (carta)
  estadia: number;             // $ por día de estadía (carta)
  equivalencias_ktm: string[]; // nombres de tipos de unidad en KTM que corresponden a esta unidad
};

export type ConfigCotizador = {
  version: number;
  empresa: { nombre: string; firma: string; ciudad: string; codigo_formato: string; version_formato: string; fecha_formato: string };
  combustible: { gasolina: number; diesel: number; fecha: string; fuente: string };
  viaticos_por_persona: number;
  factor_retorno_vacio: number;  // 1.15 en el Excel
  iva: number;                   // 0.16
  vigencia_dias: number;         // 15
  horas_libres_carga: number;    // 3
  horas_libres_descarga: number; // 3
  dias_credito: number;          // 15
  margenes: Record<Unidad, Record<TipoViaje, { proveedor: number; empresa: number }>>;
  unidades: Record<Unidad, ParamUnidad>;
  condiciones: string[];         // texto de la carta, con {variables}
};

const m = (l: number, r: number, f: number) => ({ Local: { proveedor: l, empresa: 0.7 }, Regional: { proveedor: r, empresa: 0.8 }, Foraneo: { proveedor: f, empresa: 0.9 } });

export const CONFIG_DEFAULT: ConfigCotizador = {
  version: 1,
  empresa: { nombre: "Bonyard Servicios SC", firma: "Carlos René Hernández", ciudad: "El Salto, Jalisco, México", codigo_formato: "FCV-03", version_formato: "01", fecha_formato: "03/JUL/25" },
  combustible: { gasolina: 24, diesel: 28.89, fecha: "", fuente: "Valor inicial del Excel" },
  viaticos_por_persona: 500,
  factor_retorno_vacio: 1.15,
  iva: 0.16,
  vigencia_dias: 15,
  horas_libres_carga: 3,
  horas_libres_descarga: 3,
  dias_credito: 15,
  margenes: {
    camioneta_1_5: { Local: { proveedor: 0.55, empresa: 0.8 }, Regional: { proveedor: 0.65, empresa: 0.85 }, Foraneo: { proveedor: 0.7, empresa: 0.9 } },
    camioneta_3_5: m(0.6, 0.65, 0.7),
    torton: m(0.6, 0.65, 0.7),
    trailer: m(0.6, 0.65, 0.7),
    full: m(0.6, 0.65, 0.7),
  },
  unidades: {
    camioneta_1_5: { nombre: "Camioneta 1.5 ton", descripcion_carta: "Camioneta 1.5 ton caja seca", tarimas: "4 a piso", combustible: "gasolina", rendimiento: 6.5, velocidad: 60, horas_fijas: 6, mantenimiento_km: 1.1, operador_local: 300, operador_regional_km: 1.5, operador_foraneo_km: 1.2, costo_fijo_diario: 775, hora_extra: 100, estadia: 1200, equivalencias_ktm: ["1.5 tons", "1,5 tons"] },
    camioneta_3_5: { nombre: "Camioneta 3.5 ton", descripcion_carta: "Camioneta 3.5 ton caja seca", tarimas: "6 a piso", combustible: "gasolina", rendimiento: 4, velocidad: 60, horas_fijas: 6, mantenimiento_km: 1.55, operador_local: 400, operador_regional_km: 2.2, operador_foraneo_km: 1.8, costo_fijo_diario: 1105, hora_extra: 120, estadia: 1500, equivalencias_ktm: ["3.5 tons", "3,5 tons"] },
    torton: { nombre: "Torton", descripcion_carta: "Torton caja seca", tarimas: "14 a piso", combustible: "diesel", rendimiento: 3, velocidad: 50, horas_fijas: 8, mantenimiento_km: 3, operador_local: 500, operador_regional_km: 3.5, operador_foraneo_km: 2.8, costo_fijo_diario: 1945, hora_extra: 150, estadia: 2000, equivalencias_ktm: ["Torton", "Rabon", "Rabón"] },
    trailer: { nombre: "Trailer", descripcion_carta: "Trailer caja seca 53 pies", tarimas: "24 a piso", combustible: "diesel", rendimiento: 2, velocidad: 50, horas_fijas: 16, mantenimiento_km: 4.25, operador_local: 600, operador_regional_km: 4.5, operador_foraneo_km: 3.8, costo_fijo_diario: 3537.22, hora_extra: 150, estadia: 2300, equivalencias_ktm: ["Trailer"] },
    full: { nombre: "Full", descripcion_carta: "Full (2 cajas secas 40 pies)", tarimas: "48 a piso", combustible: "diesel", rendimiento: 1.8, velocidad: 40, horas_fijas: 18, mantenimiento_km: 6.5, operador_local: 800, operador_regional_km: 6, operador_foraneo_km: 5.5, costo_fijo_diario: 4207.22, hora_extra: 200, estadia: 3000, equivalencias_ktm: ["Full"] },
  },
  condiciones: [
    "Tarifa aplica por viaje sencillo, ruta {ruta}.",
    "A la tarifa se le suma el IVA del 16 %.",
    "La tarifa incluye combustible, casetas y operador.",
    "Tiempo de espera en carga: {horas_carga} horas libres, contadas desde la llegada de la unidad a la planta o bodega de origen.",
    "Tiempo de espera en descarga: {horas_descarga} horas libres, contadas desde la llegada de la unidad al punto de entrega. Se toma la hora registrada en la caseta.",
    "Pasadas las horas libres se cobra hora extra por cada hora o fracción. Las horas de espera se validan con la hora de llegada y salida registrada en la carta porte o bitácora del operador.",
    "Estadía de más de 1 día natural en espera de carga o descarga se cobra tarifa de estadía por día.",
    "Condiciones de pago: crédito a {dias_credito} días vía transferencia electrónica, previa validación de documentación de entrega.",
    "Cualquier maniobra especial, custodia, seguro de carga adicional o ruta fuera de la cotizada se cotiza por separado.",
    "Disponibilidad de unidades sujeta a programación con 24 horas de anticipación.",
    "Vigencia de la cotización: {vigencia} días naturales a partir de la fecha de emisión.",
  ],
};

// Mezcla lo guardado con los valores por defecto (por si se agregan parámetros nuevos)
export function mezclarConfig(guardado: unknown): ConfigCotizador {
  const g = (guardado && typeof guardado === "object" ? guardado : {}) as Partial<ConfigCotizador>;
  const unidades = { ...CONFIG_DEFAULT.unidades } as Record<Unidad, ParamUnidad>;
  for (const u of UNIDADES) unidades[u] = { ...CONFIG_DEFAULT.unidades[u], ...(g.unidades?.[u] || {}) };
  const margenes = { ...CONFIG_DEFAULT.margenes } as ConfigCotizador["margenes"];
  for (const u of UNIDADES) margenes[u] = { ...CONFIG_DEFAULT.margenes[u], ...(g.margenes?.[u] || {}) };
  return {
    ...CONFIG_DEFAULT, ...g,
    empresa: { ...CONFIG_DEFAULT.empresa, ...(g.empresa || {}) },
    combustible: { ...CONFIG_DEFAULT.combustible, ...(g.combustible || {}) },
    unidades, margenes,
    condiciones: g.condiciones && g.condiciones.length ? g.condiciones : CONFIG_DEFAULT.condiciones,
  };
}

export type EntradaCotizacion = {
  unidad: Unidad;
  tipo_viaje: TipoViaje;
  km: number;              // un sentido
  retorno_vacio: boolean;
  casetas: number;         // ida
  personas: number;        // para viáticos
  precio_combustible: number; // $/L usado en esta cotización
  margen_proveedor?: number;  // permite ajustar por cotización
  margen_empresa?: number;
};

export type Desglose = {
  dias: number; litros: number; combustible: number; operador: number; mantenimiento: number; viaticos: number; fijos: number; casetas: number;
  costo_operativo: number; margen_proveedor: number; tarifa_proveedor: number; margen_empresa: number; tarifa_cliente: number; iva: number; total: number;
  utilidad_proveedor: number; utilidad_empresa: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function calcular(e: EntradaCotizacion, cfg: ConfigCotizador): Desglose {
  const u = cfg.unidades[e.unidad];
  const km = Math.max(0, Number(e.km) || 0);
  const dias = Math.round(((km / u.velocidad + u.horas_fijas) / 24) * 100) / 100;
  const litros = km / u.rendimiento;
  const combustible = litros * (Number(e.precio_combustible) || 0);
  const operador = e.tipo_viaje === "Local" ? u.operador_local : e.tipo_viaje === "Regional" ? u.operador_regional_km * km : u.operador_foraneo_km * km;
  const mantenimiento = u.mantenimiento_km * km;
  const viaticos = dias * cfg.viaticos_por_persona * Math.max(1, Number(e.personas) || 1);
  const fijos = dias * u.costo_fijo_diario;
  const casetas = (Number(e.casetas) || 0) * (e.retorno_vacio ? cfg.factor_retorno_vacio : 1);
  const costo_operativo = combustible + operador + mantenimiento + viaticos + fijos + casetas;
  const mp = e.margen_proveedor ?? cfg.margenes[e.unidad][e.tipo_viaje].proveedor;
  const me = e.margen_empresa ?? cfg.margenes[e.unidad][e.tipo_viaje].empresa;
  const tarifa_proveedor = (costo_operativo / (mp || 1)) * (e.retorno_vacio ? cfg.factor_retorno_vacio : 1);
  const tarifa_cliente = tarifa_proveedor / (me || 1);
  const iva = tarifa_cliente * cfg.iva;
  return {
    dias, litros: r2(litros), combustible: r2(combustible), operador: r2(operador), mantenimiento: r2(mantenimiento), viaticos: r2(viaticos), fijos: r2(fijos), casetas: r2(casetas),
    costo_operativo: r2(costo_operativo), margen_proveedor: mp, tarifa_proveedor: r2(tarifa_proveedor), margen_empresa: me, tarifa_cliente: r2(tarifa_cliente),
    iva: r2(iva), total: r2(tarifa_cliente + iva), utilidad_proveedor: r2(tarifa_proveedor - costo_operativo), utilidad_empresa: r2(tarifa_cliente - tarifa_proveedor),
  };
}

// Sugerencia de tipo de viaje por distancia (el usuario puede cambiarla)
export function tipoViajeSugerido(km: number): TipoViaje {
  if (km <= 60) return "Local";
  if (km <= 250) return "Regional";
  return "Foraneo";
}

export function condicionesTexto(cfg: ConfigCotizador, vars: { ruta: string; vigencia: number }) {
  const rep: Record<string, string> = {
    ruta: vars.ruta, vigencia: String(vars.vigencia), horas_carga: String(cfg.horas_libres_carga), horas_descarga: String(cfg.horas_libres_descarga),
    dias_credito: String(cfg.dias_credito), iva: String(Math.round(cfg.iva * 100)),
  };
  return cfg.condiciones.map((c) => c.replace(/\{(\w+)\}/g, (_, k) => rep[k] ?? `{${k}}`));
}

export type ComparativoKTM = {
  tarifas_compra: { proveedor: string; costo: number }[];
  tarifas_venta: { cliente: string; venta: number }[];
  servicios: { n: number; costo_min: number | null; costo_prom: number | null; costo_max: number | null; venta_prom: number | null; ultimo: { id_track: string; proveedor: string; costo: number; venta: number; fecha: string } | null };
};

// Referencia real de KTM para comparar la tarifa proveedor calculada
export function referenciaKTM(c: ComparativoKTM | null): { costo: number; origen: string } | null {
  if (!c) return null;
  if (c.servicios.n > 0 && c.servicios.costo_prom) return { costo: Number(c.servicios.costo_prom), origen: `promedio de ${c.servicios.n} servicio(s) finalizado(s)` };
  if (c.tarifas_compra.length) {
    const prom = c.tarifas_compra.reduce((a, t) => a + Number(t.costo), 0) / c.tarifas_compra.length;
    return { costo: prom, origen: `promedio de ${c.tarifas_compra.length} tarifa(s) de compra` };
  }
  return null;
}
