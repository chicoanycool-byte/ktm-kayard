"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Btn, C, Campo, Card, Grid, Tabla, Td, Titulo, Tr, inputStyle } from "@/components/ui";
import { CONFIG_DEFAULT, TIPOS_VIAJE, UNIDADES, type ConfigCotizador, type ParamUnidad, type Unidad } from "@/lib/cotizador";

const n = (v: string) => Number(v.replace(/,/g, "")) || 0;

export default function ConfigView({ config }: { config: ConfigCotizador }) {
  const supabase = createClient();
  const [cfg, setCfg] = useState<ConfigCotizador>(config);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  const setUnidad = (u: Unidad, campo: keyof ParamUnidad, valor: string | number) =>
    setCfg((c) => ({ ...c, unidades: { ...c.unidades, [u]: { ...c.unidades[u], [campo]: valor } } }));
  const setMargen = (u: Unidad, tv: (typeof TIPOS_VIAJE)[number], quien: "proveedor" | "empresa", valor: number) =>
    setCfg((c) => ({ ...c, margenes: { ...c.margenes, [u]: { ...c.margenes[u], [tv]: { ...c.margenes[u][tv], [quien]: valor } } } }));

  const guardar = async () => {
    setGuardando(true); setMsg("");
    const { error } = await supabase.from("cotizador_config").update({ datos: cfg, updated_at: new Date().toISOString() }).eq("id", 1);
    setMsg(error ? error.message : "Parámetros guardados");
    setGuardando(false);
  };

  const campoNum = (valor: number, onChange: (v: number) => void, ancho = 92) => (
    <input value={String(valor)} onChange={(e) => onChange(n(e.target.value))} inputMode="decimal"
      style={{ ...inputStyle, width: ancho, padding: "0.3rem 0.5rem", textAlign: "right" }} />
  );

  return (
    <div>
      <Titulo accion={<div style={{ display: "flex", gap: 8 }}>
        <Btn variante="secundario" href="/cotizador">← Volver</Btn>
        <Btn onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar parámetros"}</Btn>
      </div>}>Parámetros del cotizador</Titulo>
      {msg && <p style={{ color: msg.includes("guardados") ? C.green : C.red, marginTop: -8 }}>{msg}</p>}

      <Card style={{ marginBottom: "1rem" }}>
        <p style={{ margin: "0 0 0.85rem", color: C.amber, fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>GENERALES</p>
        <Grid cols={3}>
          <Campo label="Viáticos por persona / día"><input value={String(cfg.viaticos_por_persona)} onChange={(e) => setCfg({ ...cfg, viaticos_por_persona: n(e.target.value) })} style={inputStyle} /></Campo>
          <Campo label="Factor retorno en vacío"><input value={String(cfg.factor_retorno_vacio)} onChange={(e) => setCfg({ ...cfg, factor_retorno_vacio: n(e.target.value) })} style={inputStyle} /></Campo>
          <Campo label="IVA (0.16)"><input value={String(cfg.iva)} onChange={(e) => setCfg({ ...cfg, iva: n(e.target.value) })} style={inputStyle} /></Campo>
          <Campo label="Vigencia (días)"><input value={String(cfg.vigencia_dias)} onChange={(e) => setCfg({ ...cfg, vigencia_dias: n(e.target.value) })} style={inputStyle} /></Campo>
          <Campo label="Horas libres carga"><input value={String(cfg.horas_libres_carga)} onChange={(e) => setCfg({ ...cfg, horas_libres_carga: n(e.target.value) })} style={inputStyle} /></Campo>
          <Campo label="Horas libres descarga"><input value={String(cfg.horas_libres_descarga)} onChange={(e) => setCfg({ ...cfg, horas_libres_descarga: n(e.target.value) })} style={inputStyle} /></Campo>
          <Campo label="Días de crédito"><input value={String(cfg.dias_credito)} onChange={(e) => setCfg({ ...cfg, dias_credito: n(e.target.value) })} style={inputStyle} /></Campo>
          <Campo label="Gasolina de respaldo ($/L)"><input value={String(cfg.combustible.gasolina)} onChange={(e) => setCfg({ ...cfg, combustible: { ...cfg.combustible, gasolina: n(e.target.value) } })} style={inputStyle} /></Campo>
          <Campo label="Diésel de respaldo ($/L)"><input value={String(cfg.combustible.diesel)} onChange={(e) => setCfg({ ...cfg, combustible: { ...cfg.combustible, diesel: n(e.target.value) } })} style={inputStyle} /></Campo>
        </Grid>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>Los precios de respaldo solo se usan si no se puede consultar el precio oficial del día.</p>
      </Card>

      <Card style={{ marginBottom: "1rem" }}>
        <p style={{ margin: "0 0 0.85rem", color: C.amber, fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>DATOS DE LA CARTA</p>
        <Grid cols={3}>
          <Campo label="Empresa"><input value={cfg.empresa.nombre} onChange={(e) => setCfg({ ...cfg, empresa: { ...cfg.empresa, nombre: e.target.value } })} style={inputStyle} /></Campo>
          <Campo label="Firma"><input value={cfg.empresa.firma} onChange={(e) => setCfg({ ...cfg, empresa: { ...cfg.empresa, firma: e.target.value } })} style={inputStyle} /></Campo>
          <Campo label="Ciudad"><input value={cfg.empresa.ciudad} onChange={(e) => setCfg({ ...cfg, empresa: { ...cfg.empresa, ciudad: e.target.value } })} style={inputStyle} /></Campo>
          <Campo label="Código del formato"><input value={cfg.empresa.codigo_formato} onChange={(e) => setCfg({ ...cfg, empresa: { ...cfg.empresa, codigo_formato: e.target.value } })} style={inputStyle} /></Campo>
          <Campo label="Versión"><input value={cfg.empresa.version_formato} onChange={(e) => setCfg({ ...cfg, empresa: { ...cfg.empresa, version_formato: e.target.value } })} style={inputStyle} /></Campo>
          <Campo label="Fecha del formato"><input value={cfg.empresa.fecha_formato} onChange={(e) => setCfg({ ...cfg, empresa: { ...cfg.empresa, fecha_formato: e.target.value } })} style={inputStyle} /></Campo>
        </Grid>
        <Campo label="Condiciones comerciales (una por línea; {ruta}, {vigencia}, {horas_carga}, {horas_descarga}, {dias_credito} se sustituyen solas)">
          <textarea value={cfg.condiciones.join("\n")} onChange={(e) => setCfg({ ...cfg, condiciones: e.target.value.split("\n").filter(Boolean) })}
            rows={11} style={{ ...inputStyle, fontFamily: "inherit", lineHeight: 1.5 }} />
        </Campo>
      </Card>

      <Card style={{ marginBottom: "1rem", overflowX: "auto" }}>
        <p style={{ margin: "0 0 0.85rem", color: C.amber, fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>UNIDADES</p>
        <Tabla columnas={["Unidad", "Combustible", "Rend. km/L", "Vel. km/h", "Hrs fijas", "Mtto $/km", "Op. local", "Op. regional $/km", "Op. foráneo $/km", "Fijo diario", "Hora extra", "Estadía"]}>
          {UNIDADES.map((u, i) => (
            <Tr key={u} i={i}>
              <Td fuerte>{cfg.unidades[u].nombre}</Td>
              <Td><select value={cfg.unidades[u].combustible} onChange={(e) => setUnidad(u, "combustible", e.target.value)} style={{ ...inputStyle, width: 100, padding: "0.3rem" }}><option value="diesel">diésel</option><option value="gasolina">gasolina</option></select></Td>
              <Td>{campoNum(cfg.unidades[u].rendimiento, (v) => setUnidad(u, "rendimiento", v), 70)}</Td>
              <Td>{campoNum(cfg.unidades[u].velocidad, (v) => setUnidad(u, "velocidad", v), 70)}</Td>
              <Td>{campoNum(cfg.unidades[u].horas_fijas, (v) => setUnidad(u, "horas_fijas", v), 70)}</Td>
              <Td>{campoNum(cfg.unidades[u].mantenimiento_km, (v) => setUnidad(u, "mantenimiento_km", v), 80)}</Td>
              <Td>{campoNum(cfg.unidades[u].operador_local, (v) => setUnidad(u, "operador_local", v))}</Td>
              <Td>{campoNum(cfg.unidades[u].operador_regional_km, (v) => setUnidad(u, "operador_regional_km", v), 80)}</Td>
              <Td>{campoNum(cfg.unidades[u].operador_foraneo_km, (v) => setUnidad(u, "operador_foraneo_km", v), 80)}</Td>
              <Td>{campoNum(cfg.unidades[u].costo_fijo_diario, (v) => setUnidad(u, "costo_fijo_diario", v), 100)}</Td>
              <Td>{campoNum(cfg.unidades[u].hora_extra, (v) => setUnidad(u, "hora_extra", v))}</Td>
              <Td>{campoNum(cfg.unidades[u].estadia, (v) => setUnidad(u, "estadia", v))}</Td>
            </Tr>
          ))}
        </Tabla>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>
          El costo fijo diario es la suma de depreciación, seguros, permisos, placas, GPS, IMSS, administración, financiamiento, fumigaciones y tiempo muerto, como en tu Excel.
        </p>
      </Card>

      <Card style={{ marginBottom: "1rem", overflowX: "auto" }}>
        <p style={{ margin: "0 0 0.85rem", color: C.amber, fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>MÁRGENES (0.70 = la tarifa se divide entre 0.70)</p>
        <Tabla columnas={["Unidad", ...TIPOS_VIAJE.flatMap((t) => [`${t} · proveedor`, `${t} · venta`])]}>
          {UNIDADES.map((u, i) => (
            <Tr key={u} i={i}>
              <Td fuerte>{cfg.unidades[u].nombre}</Td>
              {TIPOS_VIAJE.flatMap((t) => [
                <Td key={t + "p"}>{campoNum(cfg.margenes[u][t].proveedor, (v) => setMargen(u, t, "proveedor", v), 70)}</Td>,
                <Td key={t + "e"}>{campoNum(cfg.margenes[u][t].empresa, (v) => setMargen(u, t, "empresa", v), 70)}</Td>,
              ])}
            </Tr>
          ))}
        </Tabla>
      </Card>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar parámetros"}</Btn>
        <Btn variante="secundario" onClick={() => setCfg(CONFIG_DEFAULT)}>Restaurar valores del Excel</Btn>
      </div>
    </div>
  );
}
