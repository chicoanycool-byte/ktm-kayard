// Pruebas de la fórmula del cotizador: kilómetros reales, rendimiento por peso,
// reposición vacía a la capital, mínimo del operador y factor de casetas.
import { calcular, CONFIG_DEFAULT as cfg, margenEnPorcentaje, porcentajeAMargen, rendimientoPorPeso, type EntradaCotizacion } from "../src/lib/cotizador.ts";

const EXTRA = cfg.km_extra.Foraneo; // los casos base son foráneos
let fallas = 0;
const ok = (nombre: string, cond: boolean, extra = "") => {
  if (!cond) { fallas++; console.log(`  ✗ ${nombre} ${extra}`); } else console.log(`  ✓ ${nombre}`);
};
const base = (p: Partial<EntradaCotizacion> = {}): EntradaCotizacion => ({
  unidad: "trailer", tipo_viaje: "Foraneo", km: 400, retorno: "sencillo", casetas: 1000, personas: 1, precio_combustible: 27, ...p,
});

const sencillo = calcular(base(), cfg);
const vacio = calcular(base({ retorno: "vacio" }), cfg);
const cargado = calcular(base({ retorno: "cargado" }), cfg);

ok("sencillo cuenta solo los km cargados", sencillo.km_total === 400 + EXTRA);
ok("vacío completo duplica los km", vacio.km_total === 800 + EXTRA && vacio.km_vacios === 400);
ok("ida y vuelta cargado duplica los km cargados", cargado.km_cargados === 800 + EXTRA && cargado.km_vacios === 0);
ok("el vacío gasta menos combustible por km que lo cargado", vacio.combustible < sencillo.combustible * 2, `${vacio.combustible} vs ${sencillo.combustible * 2}`);
ok("ida y vuelta cargado gasta más que ida y vuelta vacío", cargado.combustible > vacio.combustible);
ok("las casetas se pagan en los dos sentidos", vacio.casetas === Math.ceil(1000 * 2 * 1.1), String(vacio.casetas));
ok("las casetas suben 10% sobre CAPUFE", sencillo.casetas === 1100, String(sencillo.casetas));

const conRepo = calcular(base({ km_reposicion: 120, casetas_reposicion: 300 }), cfg);
ok("la reposición a la capital suma km vacíos", conRepo.km_vacios === 120 && conRepo.km_total === 520 + EXTRA);
ok("la reposición suma sus casetas", conRepo.casetas === Math.ceil((1000 + 300) * 1.1), String(conRepo.casetas));
ok("la reposición encarece el viaje", conRepo.costo_operativo > sencillo.costo_operativo);
ok("la reposición no aplica si regresa vacío al origen", calcular(base({ retorno: "vacio", km_reposicion: 120 }), cfg).km_vacios === 400);

const u = cfg.unidades.trailer;
ok("sin peso se cotiza a capacidad máxima", rendimientoPorPeso(u) === u.rendimiento_cargado);
ok("peso en 0 se toma como no capturado (capacidad máxima)", rendimientoPorPeso(u, 0) === u.rendimiento_cargado);
ok("media carga rinde entre vacío y cargado", rendimientoPorPeso(u, u.capacidad_kg / 2) > u.rendimiento_cargado && rendimientoPorPeso(u, u.capacidad_kg / 2) < u.rendimiento_vacio);
ok("sobrepeso no rinde menos que cargado", rendimientoPorPeso(u, u.capacidad_kg * 3) === u.rendimiento_cargado);
const ligero = calcular(base({ peso_kg: 5000 }), cfg);
ok("menos peso, menos combustible", ligero.combustible < sencillo.combustible, `${ligero.combustible} vs ${sencillo.combustible}`);

const corto = calcular(base({ km: 50, casetas: 0 }), cfg);
ok("el operador cobra su mínimo en viajes cortos", corto.operador === u.operador_minimo, String(corto.operador));
ok("ningún viaje baja de los días mínimos", corto.dias >= cfg.dias_minimos);
const local = calcular(base({ unidad: "camioneta_1_5", tipo_viaje: "Local", km: 30, casetas: 0 }), cfg);
ok("el viaje local paga el fijo del operador", local.operador === cfg.unidades.camioneta_1_5.operador_local);

ok("la tarifa al cliente siempre cubre el costo", [sencillo, vacio, cargado, conRepo, corto, local].every((d) => d.tarifa_cliente > d.costo_operativo));
ok("compatibilidad con cotizaciones guardadas (retorno_vacio)", calcular({ ...base(), retorno: undefined as unknown as EntradaCotizacion["retorno"], retorno_vacio: true }, cfg).km_total === 800 + EXTRA);

// Margen de Bonyard: solo suma si se captura
const sinMargen = calcular(base(), cfg);
ok("sin margen propio la venta es igual a la tarifa del transportista", sinMargen.tarifa_cliente === sinMargen.tarifa_proveedor);
ok("sin margen propio no hay utilidad de venta", sinMargen.utilidad_empresa === 0);
const conMargen = calcular(base({ margen_empresa: 0.83 }), cfg);
ok("con margen de 17% la venta sube", conMargen.tarifa_cliente > conMargen.tarifa_proveedor);
ok("el margen capturado es 17% de la venta", Math.abs(conMargen.utilidad_empresa / conMargen.tarifa_cliente - 0.17) < 0.002, String(conMargen.utilidad_empresa / conMargen.tarifa_cliente));

// Base del historial de KTM
const conBase = calcular(base({ tarifa_proveedor_base: 7000, margen_empresa: 0.83 }), cfg);
ok("la tarifa real de KTM manda sobre la fórmula", conBase.tarifa_proveedor === 7000);
ok("la venta se calcula sobre la tarifa real", conBase.tarifa_cliente === Math.ceil(7000 / 0.83), String(conBase.tarifa_cliente));
ok("el margen del transportista se reporta contra el costo estimado", Math.abs(conBase.margen_proveedor - (1 - conBase.costo_operativo / 7000)) < 0.01);

// Días mínimos por unidad
const tramoCorto = calcular(base({ unidad: "trailer", tipo_viaje: "Local", km: 60, casetas: 0 }), cfg);
ok("un tráiler local cobra el día completo de unidad", tramoCorto.dias >= 1, String(tramoCorto.dias));
ok("una camioneta local no cobra el día completo", calcular(base({ unidad: "camioneta_1_5", tipo_viaje: "Local", km: 30, casetas: 0 }), cfg).dias < 1);

// Redondeo hacia arriba de los gastos
const entero = (n: number) => Number.isInteger(n);
for (const caso of [base(), base({ retorno: "vacio", peso_kg: 7777 }), base({ unidad: "camioneta_3_5", tipo_viaje: "Regional", km: 123.4, casetas: 357, margen_empresa: 0.83 })]) {
  const d = calcular(caso, cfg);
  ok(`gastos en entero (${caso.unidad} ${caso.retorno})`, [d.combustible, d.operador, d.mantenimiento, d.viaticos, d.fijos, d.casetas, d.costo_operativo, d.tarifa_proveedor, d.tarifa_cliente].every(entero),
    JSON.stringify({ c: d.combustible, o: d.operador, m: d.mantenimiento, v: d.viaticos, f: d.fijos, ca: d.casetas, co: d.costo_operativo }));
  ok(`los renglones suman el costo operativo (${caso.unidad})`, d.combustible + d.operador + d.mantenimiento + d.viaticos + d.fijos + d.casetas === d.costo_operativo);
}
const redondeo = calcular(base({ km: 333.33, casetas: 777.77 }), cfg);
ok("nada se redondea para abajo", redondeo.casetas >= 777.77 * 1.1 && redondeo.casetas < 777.77 * 1.1 + 1, String(redondeo.casetas));
ok("el IVA queda exacto sobre la base", Math.abs(redondeo.iva - redondeo.tarifa_cliente * cfg.iva) < 0.005);
ok("el total es base más IVA", Math.abs(redondeo.total - (redondeo.tarifa_cliente + redondeo.iva)) < 0.005);

// Márgenes capturados como porcentaje
for (const [divisor, pct] of [[0.6, 40], [0.7, 30], [0.74, 26], [0.83, 17], [0.75, 25], [0.86, 14]] as const) {
  ok(`${divisor} se muestra como ${pct}%`, margenEnPorcentaje(divisor) === pct, String(margenEnPorcentaje(divisor)));
  ok(`${pct}% se guarda como ${divisor}`, Math.abs(porcentajeAMargen(pct) - divisor) < 1e-9, String(porcentajeAMargen(pct)));
}
ok("un margen de 40% deja 40% de la tarifa como utilidad", (() => {
  const d = calcular(base({ margen_proveedor: porcentajeAMargen(40) }), cfg);
  return Math.abs(d.utilidad_proveedor / d.tarifa_proveedor - 0.4) < 0.001;
})());
ok("capturar 0% equivale a no poner margen", porcentajeAMargen(0) === 1);
ok("el porcentaje se topa en 90", porcentajeAMargen(150) === porcentajeAMargen(90));

// Kilómetros extra por recorrido urbano
for (const [tipo, extra] of [["Local", 20], ["Regional", 40], ["Foraneo", 50]] as const) {
  const d = calcular(base({ tipo_viaje: tipo, km: 100 }), cfg);
  ok(`${tipo} suma ${extra} km`, d.km_cargados === 100 + extra && d.km_extra === extra, `${d.km_cargados} / ${d.km_extra}`);
}
ok("los km extra no se cobran dos veces en ida y vuelta", calcular(base({ tipo_viaje: "Foraneo", km: 100, retorno: "cargado" }), cfg).km_cargados === 250);
ok("los km extra sí gastan combustible", calcular(base({ tipo_viaje: "Foraneo", km: 100 }), cfg).combustible > calcular(base({ tipo_viaje: "Local", km: 100 }), cfg).combustible);
ok("los km extra no suman casetas", calcular(base({ tipo_viaje: "Foraneo", km: 100, casetas: 500 }), cfg).casetas === Math.ceil(500 * 1.1));

console.log(fallas === 0 ? "\nTodo bien." : `\n${fallas} falla(s).`);
process.exit(fallas === 0 ? 0 : 1);
