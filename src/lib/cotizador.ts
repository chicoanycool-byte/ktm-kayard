// Cotizador de transporte: mismas fórmulas que el Excel "Cotizador_2026", con parámetros editables desde la app.

export const UNIDADES = ["camioneta_1_5", "camioneta_3_5", "torton", "trailer", "full"] as const;
export type Unidad = (typeof UNIDADES)[number];
export const TIPOS_VIAJE = ["Local", "Regional", "Foraneo"] as const;
export type TipoViaje = (typeof TIPOS_VIAJE)[number];
// Qué hace la unidad después de descargar
export const RETORNOS = ["sencillo", "vacio", "cargado"] as const;
export type Retorno = (typeof RETORNOS)[number];
export const RETORNO_TEXTO: Record<Retorno, string> = {
  sencillo: "Sencillo (solo ida, se repone a la capital)",
  vacio: "Vacío completo (regresa vacío al origen)",
  cargado: "Ida y vuelta cargado",
};

export type ParamUnidad = {
  nombre: string;              // nombre corto
  descripcion_carta: string;   // cómo aparece en la carta de cotización
  tarimas: string;             // capacidad en tarimas (texto para la carta)
  combustible: "gasolina" | "diesel";
  capacidad_kg: number;        // carga máxima de la unidad
  rendimiento_vacio: number;   // km por litro sin carga
  rendimiento_cargado: number; // km por litro a capacidad máxima
  rendimiento?: number;        // (anterior) se conserva para configuraciones ya guardadas
  velocidad: number;           // km/h promedio
  horas_fijas: number;         // horas fijas de carga/descarga por viaje
  mantenimiento_km: number;    // $/km
  operador_local: number;      // pago fijo por viaje local
  operador_regional_km: number;
  operador_foraneo_km: number;
  operador_minimo: number;     // piso de pago al operador por viaje regional o foráneo
  dias_minimos: number;        // lo menos que se le cobra de unidad a un viaje, aunque sea corto
  costo_fijo_diario: number;   // suma de depreciación, seguros, permisos, GPS, IMSS, administración, etc.
  hora_extra: number;          // $ por hora extra (carta)
  estadia: number;             // $ por día de estadía (carta)
  sict_vehiculo: string;       // tipo de vehículo en "Traza tu ruta" de la SICT (decide la tarifa de caseta)
  equivalencias_ktm: string[]; // nombres de tipos de unidad en KTM que corresponden a esta unidad
};

export type ConfigCotizador = {
  version: number;
  empresa: { nombre: string; firma: string; ciudad: string; codigo_formato: string; version_formato: string; fecha_formato: string };
  combustible: { gasolina: number; diesel: number; fecha: string; fuente: string };
  viaticos_por_persona: number;
  dias_minimos: number;          // una unidad no se renta por menos de esto, aunque el viaje sea corto
  factor_casetas: number;        // margen sobre la tarifa de CAPUFE, que no siempre está al día
  factor_retorno_vacio: number;  // (anterior) ya no se usa: el retorno se cobra con kilómetros reales
  iva: number;                   // 0.16
  vigencia_dias: number;         // 15
  horas_libres_carga: number;    // 3
  horas_libres_descarga: number; // 3
  dias_credito: number;          // 15
  margenes: Record<Unidad, Record<TipoViaje, { proveedor: number; empresa: number }>>;
  unidades: Record<Unidad, ParamUnidad>;
  condiciones: string[];         // texto de la carta, con {variables}
};

// Márgenes por tipo de viaje. El de proveedor es el margen que deja el transportista sobre su
// costo de operación y el de empresa el que agrega Bonyard: 0.85 significa 15 % de margen.
const m = (prov: [number, number, number] = [0.8, 0.85, 0.87], emp: [number, number, number] = [0.83, 0.83, 0.83]) =>
  ({ Local: { proveedor: prov[0], empresa: emp[0] }, Regional: { proveedor: prov[1], empresa: emp[1] }, Foraneo: { proveedor: prov[2], empresa: emp[2] } });

export const CONFIG_DEFAULT: ConfigCotizador = {
  version: 1,
  empresa: { nombre: "Bonyard Servicios SC", firma: "Carlos René Hernández", ciudad: "El Salto, Jalisco, México", codigo_formato: "FCV-03", version_formato: "01", fecha_formato: "03/JUL/25" },
  combustible: { gasolina: 24, diesel: 28.89, fecha: "", fuente: "Valor inicial del Excel" },
  viaticos_por_persona: 500,
  dias_minimos: 0.5,
  factor_casetas: 1.1,
  factor_retorno_vacio: 1.15,
  iva: 0.16,
  vigencia_dias: 15,
  horas_libres_carga: 3,
  horas_libres_descarga: 3,
  dias_credito: 15,
  margenes: {
    camioneta_1_5: m([0.8, 0.85, 0.87], [0.75, 0.75, 0.75]),
    camioneta_3_5: m([0.8, 0.85, 0.87], [0.78, 0.78, 0.78]),
    torton: m([0.8, 0.85, 0.87], [0.86, 0.86, 0.86]),
    trailer: m([0.8, 0.85, 0.87], [0.83, 0.83, 0.83]),
    full: m([0.8, 0.85, 0.87], [0.85, 0.85, 0.85]),
  },
  unidades: {
    camioneta_1_5: { nombre: "Camioneta 1.5 ton", descripcion_carta: "Camioneta 1.5 ton caja seca", tarimas: "4 a piso", combustible: "gasolina", capacidad_kg: 1500, rendimiento_vacio: 10, rendimiento_cargado: 7, velocidad: 60, horas_fijas: 6, mantenimiento_km: 1.1, operador_local: 300, operador_regional_km: 1.5, operador_foraneo_km: 1.2, operador_minimo: 400, dias_minimos: 0.35, costo_fijo_diario: 600, hora_extra: 250, estadia: 1800, sict_vehiculo: "5", equivalencias_ktm: ["1.5 tons", "1,5 tons"] },
    camioneta_3_5: { nombre: "Camioneta 3.5 ton", descripcion_carta: "Camioneta 3.5 ton caja seca", tarimas: "6 a piso", combustible: "gasolina", capacidad_kg: 3500, rendimiento_vacio: 7.5, rendimiento_cargado: 5, velocidad: 60, horas_fijas: 6, mantenimiento_km: 1.55, operador_local: 400, operador_regional_km: 2.2, operador_foraneo_km: 1.8, operador_minimo: 500, dias_minimos: 0.5, costo_fijo_diario: 850, hora_extra: 300, estadia: 2200, sict_vehiculo: "9", equivalencias_ktm: ["3.5 tons", "3,5 tons"] },
    torton: { nombre: "Torton", descripcion_carta: "Torton caja seca", tarimas: "14 a piso", combustible: "diesel", capacidad_kg: 15000, rendimiento_vacio: 4.5, rendimiento_cargado: 3, velocidad: 50, horas_fijas: 8, mantenimiento_km: 3, operador_local: 500, operador_regional_km: 3.5, operador_foraneo_km: 2.8, operador_minimo: 700, dias_minimos: 0.75, costo_fijo_diario: 1550, hora_extra: 400, estadia: 3500, sict_vehiculo: "10", equivalencias_ktm: ["Torton", "Rabon", "Rabón"] },
    trailer: { nombre: "Trailer", descripcion_carta: "Trailer caja seca 53 pies", tarimas: "24 a piso", combustible: "diesel", capacidad_kg: 30000, rendimiento_vacio: 3.6, rendimiento_cargado: 2.5, velocidad: 50, horas_fijas: 16, mantenimiento_km: 4.25, operador_local: 600, operador_regional_km: 4.5, operador_foraneo_km: 3.8, operador_minimo: 900, dias_minimos: 1, costo_fijo_diario: 2300, hora_extra: 500, estadia: 4500, sict_vehiculo: "12", equivalencias_ktm: ["Trailer"] },
    full: { nombre: "Full", descripcion_carta: "Full (2 cajas secas 40 pies)", tarimas: "48 a piso", combustible: "diesel", capacidad_kg: 45000, rendimiento_vacio: 3, rendimiento_cargado: 1.9, velocidad: 40, horas_fijas: 18, mantenimiento_km: 6.5, operador_local: 800, operador_regional_km: 6, operador_foraneo_km: 5.5, operador_minimo: 1100, dias_minimos: 1, costo_fijo_diario: 2800, hora_extra: 600, estadia: 5500, sict_vehiculo: "16", equivalencias_ktm: ["Full"] },
  },
  condiciones: [
    "Tarifa aplica por viaje sencillo, ruta {ruta}.",
    "La tarifa cubre un solo reparto por viaje. Un punto de entrega adicional se cotiza por separado.",
    "A la tarifa se le suma el IVA del 16 %.",
    "La tarifa incluye combustible, casetas y operador.",
    "Carga y descarga a piso.",
    "Maniobras: $700.00 por tarima.",
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
  km: number;                   // un sentido, cargado
  retorno: Retorno;
  casetas: number;              // casetas de un sentido
  km_reposicion?: number;       // vacío del punto de descarga a la capital del estado, para buscar carga de regreso
  casetas_reposicion?: number;
  peso_kg?: number;             // peso de la mercancía; vacío = se cotiza a capacidad máxima
  personas: number;             // para viáticos
  precio_combustible: number;   // $/L usado en esta cotización
  margen_proveedor?: number;    // permite ajustar por cotización
  tarifa_proveedor_base?: number; // tarifa real de compra de KTM; si viene, manda sobre la fórmula
  margen_empresa?: number;      // margen de Bonyard; si no se captura, la venta es igual a la tarifa proveedor
  retorno_vacio?: boolean;      // (anterior) cotizaciones guardadas antes del cambio
};

export type Desglose = {
  km_cargados: number; km_vacios: number; km_total: number; rendimiento: number;
  dias: number; litros: number; combustible: number; operador: number; mantenimiento: number; viaticos: number; fijos: number; casetas: number;
  costo_operativo: number; margen_proveedor: number; tarifa_proveedor: number; margen_empresa: number; tarifa_cliente: number; iva: number; total: number;
  utilidad_proveedor: number; utilidad_empresa: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function calcular(e: EntradaCotizacion, cfg: ConfigCotizador): Desglose {
  const u = cfg.unidades[e.unidad];
  const km = Math.max(0, Number(e.km) || 0);
  const retorno: Retorno = e.retorno || (e.retorno_vacio ? "vacio" : "sencillo");

  // Kilómetros reales del ciclo: lo cargado, el regreso y el vacío para reposicionar la unidad
  const reposicion = retorno === "sencillo" ? Math.max(0, Number(e.km_reposicion) || 0) : 0;
  const km_cargados = retorno === "cargado" ? km * 2 : km;
  const km_vacios = (retorno === "vacio" ? km : 0) + reposicion;
  const km_total = km_cargados + km_vacios;

  // El rendimiento baja conforme sube el peso; los tramos vacíos rinden más
  const rend_cargado = rendimientoPorPeso(u, e.peso_kg);
  const rend_vacio = u.rendimiento_vacio || u.rendimiento || 1;
  const litros = km_cargados / (rend_cargado || 1) + km_vacios / (rend_vacio || 1);
  const combustible = litros * (Number(e.precio_combustible) || 0);

  const dias = Math.max(u.dias_minimos || cfg.dias_minimos || 0, Math.round(((km_total / u.velocidad + u.horas_fijas) / 24) * 100) / 100);
  const operador = e.tipo_viaje === "Local"
    ? u.operador_local
    : Math.max(u.operador_minimo || 0, (e.tipo_viaje === "Regional" ? u.operador_regional_km : u.operador_foraneo_km) * km_total);
  const mantenimiento = u.mantenimiento_km * km_total;
  const viaticos = dias * cfg.viaticos_por_persona * Math.max(1, Number(e.personas) || 1);
  const fijos = dias * u.costo_fijo_diario;

  // Las casetas se pagan en cada sentido recorrido, más las del tramo de reposición,
  // y se suben un poco porque la tarifa publicada de CAPUFE no siempre está al día.
  const vueltas = retorno === "sencillo" ? 1 : 2;
  const casetas = ((Number(e.casetas) || 0) * vueltas + (Number(e.casetas_reposicion) || 0)) * (cfg.factor_casetas || 1);

  const costo_operativo = combustible + operador + mantenimiento + viaticos + fijos + casetas;
  const mp = e.margen_proveedor ?? cfg.margenes[e.unidad][e.tipo_viaje].proveedor;
  const me = e.margen_empresa;
  const base = Number(e.tarifa_proveedor_base) || 0;
  const tarifa_proveedor = base > 0 ? base : costo_operativo / (mp || 1);
  // Margen de Bonyard: solo se suma si se capturó
  const tarifa_cliente = me && me > 0 && me < 1 ? tarifa_proveedor / me : tarifa_proveedor;
  const iva = tarifa_cliente * cfg.iva;
  return {
    km_cargados: r2(km_cargados), km_vacios: r2(km_vacios), km_total: r2(km_total), rendimiento: r2(rend_cargado),
    dias, litros: r2(litros), combustible: r2(combustible), operador: r2(operador), mantenimiento: r2(mantenimiento), viaticos: r2(viaticos), fijos: r2(fijos), casetas: r2(casetas),
    costo_operativo: r2(costo_operativo),
    margen_proveedor: base > 0 ? r2(1 - costo_operativo / base) : mp,
    tarifa_proveedor: r2(tarifa_proveedor), margen_empresa: me ?? 1, tarifa_cliente: r2(tarifa_cliente),
    iva: r2(iva), total: r2(tarifa_cliente + iva), utilidad_proveedor: r2(tarifa_proveedor - costo_operativo), utilidad_empresa: r2(tarifa_cliente - tarifa_proveedor),
  };
}

// El rendimiento va de "vacío" a "cargado" según qué tan llena va la unidad.
// Sin peso capturado se cotiza a capacidad máxima, que es el caso más caro.
export function rendimientoPorPeso(u: ParamUnidad, peso_kg?: number | null): number {
  const vacio = u.rendimiento_vacio || u.rendimiento || 1;
  const cargado = u.rendimiento_cargado || u.rendimiento || vacio;
  const cap = u.capacidad_kg || 0;
  if (!cap) return cargado;
  const peso = peso_kg == null || !(Number(peso_kg) > 0) ? cap : Math.min(Number(peso_kg), cap);
  return vacio - (vacio - cargado) * (peso / cap);
}

// Margen de venta que sugiere el historial de KTM para esa unidad (en % sobre la venta)
export function margenSugerido(cfg: ConfigCotizador, unidad: Unidad, tipo: TipoViaje): number {
  const e = cfg.margenes[unidad]?.[tipo]?.empresa;
  return e && e > 0 && e < 1 ? Math.round((1 - e) * 1000) / 10 : 0;
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
