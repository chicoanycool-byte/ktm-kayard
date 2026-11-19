// Pruebas de la fórmula del cotizador: kilómetros reales, rendimiento por peso,
// reposición vacía a la capital, mínimo del operador y factor de casetas.
import { calcular, CONFIG_DEFAULT as cfg, rendimientoPorPeso, type EntradaCotizacion } from "../src/lib/cotizador.ts";

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

ok("sencillo cuenta solo los km cargados", sencillo.km_total === 400);
ok("vacío completo duplica los km", vacio.km_total === 800 && vacio.km_vacios === 400);
ok("ida y vuelta cargado duplica los km cargados", cargado.km_cargados === 800 && cargado.km_vacios === 0);
ok("el vacío gasta menos combustible por km que lo cargado", vacio.combustible < sencillo.combustible * 2, `${vacio.combustible} vs ${sencillo.combustible * 2}`);
ok("ida y vuelta cargado gasta más que ida y vuelta vacío", cargado.combustible > vacio.combustible);
ok("las casetas se pagan en los dos sentidos", Math.abs(vacio.casetas - 1000 * 2 * 1.1) < 0.01, String(vacio.casetas));
ok("las casetas suben 10% sobre CAPUFE", Math.abs(sencillo.casetas - 1100) < 0.01, String(sencillo.casetas));

const conRepo = calcular(base({ km_reposicion: 120, casetas_reposicion: 300 }), cfg);
ok("la reposición a la capital suma km vacíos", conRepo.km_vacios === 120 && conRepo.km_total === 520);
ok("la reposición suma sus casetas", Math.abs(conRepo.casetas - (1000 + 300) * 1.1) < 0.01, String(conRepo.casetas));
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
ok("compatibilidad con cotizaciones guardadas (retorno_vacio)", calcular({ ...base(), retorno: undefined as unknown as EntradaCotizacion["retorno"], retorno_vacio: true }, cfg).km_total === 800);

console.log(fallas === 0 ? "\nTodo bien." : `\n${fallas} falla(s).`);
process.exit(fallas === 0 ? 0 : 1);
