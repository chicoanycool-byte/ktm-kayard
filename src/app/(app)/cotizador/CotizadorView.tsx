"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fecha, money } from "@/lib/format";
import { Btn, C, Campo, Card, Dato, Grid, Modal, Tabla, Td, Titulo, Tr, inputStyle } from "@/components/ui";
import SelectBuscable from "@/components/SelectBuscable";
import {
  UNIDADES, TIPOS_VIAJE, calcular, condicionesTexto, referenciaKTM, tipoViajeSugerido,
  type ComparativoKTM, type ConfigCotizador, type Desglose, type TipoViaje, type Unidad,
} from "@/lib/cotizador";
import { descargarBlob, generarCartaCotizacion } from "@/lib/cartaCotizacion";

export type Cotizacion = {
  id: string; folio: string; fecha: string; vigencia_dias: number; cliente_id: string | null; cliente_nombre: string; contacto: string | null;
  origen_id: string | null; destino_id: string | null; origen: string; destino: string; tipo_viaje: TipoViaje; unidad: Unidad; unidad_descripcion: string | null;
  tarimas: string | null; km: number; retorno_vacio: boolean; casetas: number; personas: number; precio_combustible: number | null; combustible_fuente: string | null;
  desglose: Desglose; costo_operativo: number; margen_proveedor: number; tarifa_proveedor: number; margen_empresa: number; tarifa_cliente: number;
  hora_extra: number; estadia: number; comparativo: ComparativoKTM | null; condiciones: string[]; notas: string | null; estatus: string; created_at: string;
};

type Pob = { id: string; nombre: string };
type Cli = { id: string; nombre: string; contacto_nombre: string | null };

const hoy = () => new Date(Date.now() - 6 * 3600e3).toISOString().slice(0, 10);
const num = (v: string) => (v === "" ? 0 : Number(v.replace(/,/g, "")) || 0);

export default function CotizadorView({ config, poblaciones, clientes, cotizaciones: ini, esAdmin }: {
  config: ConfigCotizador; poblaciones: Pob[]; clientes: Cli[]; cotizaciones: Cotizacion[]; esAdmin: boolean;
}) {
  const supabase = createClient();
  const [cfg] = useState(config);
  const [cotizaciones, setCotizaciones] = useState(ini);

  // ── Formulario
  const [clienteId, setClienteId] = useState("");
  const [clienteTexto, setClienteTexto] = useState("");
  const [contacto, setContacto] = useState("");
  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [unidad, setUnidad] = useState<Unidad>("trailer");
  const [tipoViaje, setTipoViaje] = useState<TipoViaje>("Foraneo");
  const [km, setKm] = useState("");
  const [casetas, setCasetas] = useState("");
  const [retorno, setRetorno] = useState(true);
  const [personas, setPersonas] = useState("1");
  const [notas, setNotas] = useState("");
  const [tarimas, setTarimas] = useState(config.unidades.trailer.tarimas);
  const [descUnidad, setDescUnidad] = useState(config.unidades.trailer.descripcion_carta);
  const [ajusteProv, setAjusteProv] = useState("");
  const [ajusteEmp, setAjusteEmp] = useState("");

  // ── Precio de combustible del día
  const [combustible, setCombustible] = useState<{ gasolina: number; diesel: number; fuente: string; fecha: string } | null>(null);
  const [precioManual, setPrecioManual] = useState("");
  const [cargandoComb, setCargandoComb] = useState(true);
  const [errorComb, setErrorComb] = useState("");

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const j = await (await fetch("/api/combustible")).json();
        if (!vivo) return;
        if (j.ok) {
          const g = j.jalisco?.regular ?? j.nacional.regular, d = j.jalisco?.diesel ?? j.nacional.diesel;
          setCombustible({ gasolina: g, diesel: d, fuente: `${j.fuente} · promedio ${j.jalisco?.diesel ? "Jalisco" : "nacional"}`, fecha: j.fecha.slice(0, 10) });
        } else setErrorComb(j.error || "No se pudo consultar");
      } catch (e) { if (vivo) setErrorComb(String(e)); }
      if (vivo) setCargandoComb(false);
    })();
    return () => { vivo = false; };
  }, []);

  const u = cfg.unidades[unidad];
  const precioAuto = combustible ? (u.combustible === "diesel" ? combustible.diesel : combustible.gasolina) : cfg.combustible[u.combustible];
  const precio = precioManual !== "" ? num(precioManual) : precioAuto;


  const origen = poblaciones.find((p) => p.id === origenId)?.nombre || "";
  const destino = poblaciones.find((p) => p.id === destinoId)?.nombre || "";
  const ruta = origen && destino ? `${origen} → ${destino}` : "";
  const nombreCliente = clientes.find((c) => c.id === clienteId)?.nombre || clienteTexto;

  const d = useMemo(() => calcular({
    unidad, tipo_viaje: tipoViaje, km: num(km), retorno_vacio: retorno, casetas: num(casetas), personas: num(personas) || 1,
    precio_combustible: precio, margen_proveedor: ajusteProv ? num(ajusteProv) / 100 : undefined, margen_empresa: ajusteEmp ? num(ajusteEmp) / 100 : undefined,
  }, cfg), [unidad, tipoViaje, km, retorno, casetas, personas, precio, ajusteProv, ajusteEmp, cfg]);

  // ── Comparativo con lo real de KTM
  const [comp, setComp] = useState<ComparativoKTM | null>(null);
  const [cargandoComp, setCargandoComp] = useState(false);
  useEffect(() => {
    if (!origenId || !destinoId) return;
    let vivo = true;
    (async () => {
      setCargandoComp(true);
      const { data } = await supabase.rpc("cotizador_comparativo", { p_origen: origenId, p_destino: destinoId, p_unidades: u.equivalencias_ktm, p_cliente: clienteId || null });
      if (!vivo) return;
      setComp((data as ComparativoKTM) || null);
      setCargandoComp(false);
    })();
    return () => { vivo = false; };
  }, [origenId, destinoId, unidad, clienteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // mientras no haya ruta completa no se muestra el comparativo anterior
  const comparativo = origenId && destinoId ? comp : null;
  const ref = referenciaKTM(comparativo);
  const difRef = ref && ref.costo > 0 ? ((d.tarifa_proveedor - ref.costo) / ref.costo) * 100 : null;

  // ── Distancia por Google (si hay clave)
  const [calcKm, setCalcKm] = useState(false);
  const [avisoKm, setAvisoKm] = useState("");
  const calcularRuta = async () => {
    if (!origen || !destino) return;
    setCalcKm(true); setAvisoKm("");
    try {
      const r = await fetch("/api/distancia", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ origen, destino }) });
      const j = await r.json();
      if (j.ok) {
        setKm(String(j.km));
        if (j.casetas) setCasetas(String(Math.round(j.casetas)));
        setTipoViaje(tipoViajeSugerido(j.km));
        setAvisoKm(j.nota || "");
      } else setAvisoKm(j.error);
    } catch (e) { setAvisoKm(String(e)); }
    setCalcKm(false);
  };

  // ── Guardar y carta
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [detalle, setDetalle] = useState<Cotizacion | null>(null);
  const listo = nombreCliente && origenId && destinoId && num(km) > 0;

  const condiciones = useMemo(() => condicionesTexto(cfg, { ruta, vigencia: cfg.vigencia_dias }), [cfg, ruta]);

  const guardar = async () => {
    if (!listo) return;
    setGuardando(true); setError("");
    const fila = {
      fecha: hoy(), vigencia_dias: cfg.vigencia_dias, cliente_id: clienteId || null, cliente_nombre: nombreCliente, contacto: contacto || null,
      origen_id: origenId, destino_id: destinoId, origen, destino, tipo_viaje: tipoViaje, unidad, unidad_descripcion: descUnidad, tarimas,
      km: num(km), retorno_vacio: retorno, casetas: num(casetas), personas: num(personas) || 1,
      precio_combustible: precio, combustible_fuente: precioManual !== "" ? "Capturado a mano" : combustible?.fuente || cfg.combustible.fuente,
      desglose: d, costo_operativo: d.costo_operativo, margen_proveedor: d.margen_proveedor, tarifa_proveedor: d.tarifa_proveedor,
      margen_empresa: d.margen_empresa, tarifa_cliente: d.tarifa_cliente, hora_extra: u.hora_extra, estadia: u.estadia,
      comparativo: comp, condiciones, notas: notas || null,
    };
    const { data, error: e } = await supabase.from("cotizaciones").insert(fila).select().single();
    if (e) setError(e.message);
    else { setCotizaciones((c) => [data as Cotizacion, ...c]); setDetalle(data as Cotizacion); }
    setGuardando(false);
  };

  const carta = useCallback(async (c: Cotizacion) => {
    const blob = await generarCartaCotizacion({
      folio: c.folio, fecha: c.fecha, cliente: c.cliente_nombre, contacto: c.contacto, ruta: `${c.origen} → ${c.destino}`,
      unidad_descripcion: c.unidad_descripcion || cfg.unidades[c.unidad]?.descripcion_carta || c.unidad,
      tarimas: c.tarimas || "", tarifa: Number(c.tarifa_cliente), hora_extra: Number(c.hora_extra), estadia: Number(c.estadia),
      condiciones: c.condiciones?.length ? c.condiciones : condicionesTexto(cfg, { ruta: `${c.origen} → ${c.destino}`, vigencia: c.vigencia_dias }),
      cfg,
    });
    descargarBlob(blob, `${cfg.empresa.codigo_formato}_Cotizacion_${c.folio}_${c.cliente_nombre.replace(/[^\w]+/g, "_")}.docx`);
  }, [cfg]);

  const cambiarEstatus = async (c: Cotizacion, estatus: string) => {
    const { error: e } = await supabase.from("cotizaciones").update({ estatus }).eq("id", c.id);
    if (!e) { setCotizaciones((l) => l.map((x) => (x.id === c.id ? { ...x, estatus } : x))); setDetalle((x) => (x && x.id === c.id ? { ...x, estatus } : x)); }
  };

  const fila = (label: string, valor: string, o: { fuerte?: boolean; color?: string } = {}) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "0.32rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ color: o.fuerte ? "white" : C.muted, fontWeight: o.fuerte ? 700 : 400, fontSize: o.fuerte ? 14 : 13 }}>{label}</span>
      <span style={{ color: o.color || (o.fuerte ? C.amber : C.text), fontWeight: o.fuerte ? 700 : 500, fontSize: o.fuerte ? 15 : 13, whiteSpace: "nowrap" }}>{valor}</span>
    </div>
  );

  return (
    <div>
      <Titulo accion={esAdmin ? <Btn variante="secundario" href="/cotizador/configuracion">⚙️ Parámetros</Btn> : undefined}>Cotizador de transporte</Titulo>

      {/* Precio del combustible del día */}
      <Card style={{ marginBottom: "1rem", padding: "0.85rem 1.1rem", backgroundColor: C.card2 }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
          <span style={{ color: C.amber, fontWeight: 700 }}>⛽ Combustible del día</span>
          {cargandoComb ? <span style={{ color: C.muted }}>Consultando precios oficiales…</span> : combustible ? (
            <>
              <span>Gasolina <b style={{ color: "white" }}>${combustible.gasolina.toFixed(2)}</b></span>
              <span>Diésel <b style={{ color: "white" }}>${combustible.diesel.toFixed(2)}</b></span>
              <span style={{ color: C.muted }}>{combustible.fuente} · {fecha(combustible.fecha)}</span>
            </>
          ) : <span style={{ color: C.red }}>No se pudo consultar ({errorComb}). Se usa el valor guardado: ${precioAuto.toFixed(2)}</span>}
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: C.muted }}>Precio usado ({u.combustible})</span>
            <input value={precioManual} onChange={(e) => setPrecioManual(e.target.value)} placeholder={precioAuto.toFixed(2)}
              style={{ ...inputStyle, width: 90, padding: "0.3rem 0.5rem", textAlign: "right" }} />
            {precioManual !== "" && <button onClick={() => setPrecioManual("")} style={{ background: "none", border: "none", color: C.amber, cursor: "pointer" }}>usar el del día</button>}
          </span>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, 1fr)", gap: "1rem", alignItems: "start" }}>
        {/* ── Datos */}
        <Card>
          <p style={{ margin: "0 0 0.85rem", color: C.amber, fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>DATOS DE LA COTIZACIÓN</p>
          <Grid>
            <Campo label="Cliente">
              <SelectBuscable opciones={clientes} value={clienteId} placeholder="Cliente registrado…" onChange={(id) => {
                setClienteId(id);
                const c = clientes.find((x) => x.id === id);
                if (c?.contacto_nombre) setContacto(c.contacto_nombre);
              }} />
            </Campo>
            <Campo label="…o escribe un cliente nuevo">
              <input value={clienteTexto} onChange={(e) => setClienteTexto(e.target.value)} disabled={!!clienteId} placeholder="Nombre del prospecto" style={{ ...inputStyle, opacity: clienteId ? 0.5 : 1 }} />
            </Campo>
            <Campo label="Contacto (a quién va dirigida)">
              <input value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Nombre del contacto" style={inputStyle} />
            </Campo>
            <Campo label="Tipo de unidad">
              <select value={unidad} onChange={(e) => {
                const k = e.target.value as Unidad;
                setUnidad(k); setTarimas(cfg.unidades[k].tarimas); setDescUnidad(cfg.unidades[k].descripcion_carta);
              }} style={inputStyle}>
                {UNIDADES.map((k) => <option key={k} value={k}>{cfg.unidades[k].nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Origen" span={1}>
              <SelectBuscable opciones={poblaciones} value={origenId} onChange={setOrigenId} requerido />
            </Campo>
            <Campo label="Destino" span={1}>
              <SelectBuscable opciones={poblaciones} value={destinoId} onChange={setDestinoId} requerido />
            </Campo>
            <Campo label="Kilómetros (un sentido)">
              <div style={{ display: "flex", gap: 6 }}>
                <input value={km} onChange={(e) => { setKm(e.target.value); if (num(e.target.value) > 0) setTipoViaje(tipoViajeSugerido(num(e.target.value))); }} inputMode="decimal" placeholder="0" style={inputStyle} />
                <Btn small variante="secundario" onClick={calcularRuta} disabled={!origen || !destino || calcKm}>{calcKm ? "…" : "🗺️"}</Btn>
              </div>
            </Campo>
            <Campo label="Casetas ida (MXN)">
              <input value={casetas} onChange={(e) => setCasetas(e.target.value)} inputMode="decimal" placeholder="0" style={inputStyle} />
            </Campo>
            <Campo label="Tipo de viaje">
              <select value={tipoViaje} onChange={(e) => setTipoViaje(e.target.value as TipoViaje)} style={inputStyle}>
                {TIPOS_VIAJE.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Campo>
            <Campo label="Personas (viáticos)">
              <input value={personas} onChange={(e) => setPersonas(e.target.value)} inputMode="numeric" style={inputStyle} />
            </Campo>
            <Campo label="Retorno en vacío">
              <select value={retorno ? "si" : "no"} onChange={(e) => setRetorno(e.target.value === "si")} style={inputStyle}>
                <option value="si">Sí (+{Math.round((cfg.factor_retorno_vacio - 1) * 100)}%)</option>
                <option value="no">No</option>
              </select>
            </Campo>
            <Campo label="Cap. tarimas (en la carta)">
              <input value={tarimas} onChange={(e) => setTarimas(e.target.value)} style={inputStyle} />
            </Campo>
            <Campo label="Descripción de la unidad (en la carta)" span={2}>
              <input value={descUnidad} onChange={(e) => setDescUnidad(e.target.value)} style={inputStyle} />
            </Campo>
            <Campo label={`Margen proveedor % (base ${Math.round(cfg.margenes[unidad][tipoViaje].proveedor * 100)})`}>
              <input value={ajusteProv} onChange={(e) => setAjusteProv(e.target.value)} placeholder={String(Math.round(cfg.margenes[unidad][tipoViaje].proveedor * 100))} inputMode="decimal" style={inputStyle} />
            </Campo>
            <Campo label={`Margen ${cfg.empresa.nombre.split(" ")[0]} % (base ${Math.round(cfg.margenes[unidad][tipoViaje].empresa * 100)})`}>
              <input value={ajusteEmp} onChange={(e) => setAjusteEmp(e.target.value)} placeholder={String(Math.round(cfg.margenes[unidad][tipoViaje].empresa * 100))} inputMode="decimal" style={inputStyle} />
            </Campo>
            <Campo label="Notas internas" span={2}>
              <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="No aparecen en la carta" style={inputStyle} />
            </Campo>
          </Grid>
          {avisoKm && <p style={{ fontSize: 12, color: avisoKm.includes("Sin clave") ? C.muted : C.blue, marginTop: 8 }}>{avisoKm}</p>}
        </Card>

        {/* ── Resultado */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Card>
            <p style={{ margin: "0 0 0.5rem", color: C.amber, fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>COSTO OPERATIVO</p>
            {fila(`Combustible (${d.litros.toFixed(0)} L a $${precio.toFixed(2)})`, money(d.combustible))}
            {fila("Pago operador", money(d.operador))}
            {fila("Mantenimiento", money(d.mantenimiento))}
            {fila(`Viáticos (${d.dias} días)`, money(d.viaticos))}
            {fila("Gastos fijos de la unidad", money(d.fijos))}
            {fila(`Casetas${retorno ? " (con vacío)" : ""}`, money(d.casetas))}
            {fila("Costo total operativo", money(d.costo_operativo), { fuerte: true })}
            <div style={{ height: 10 }} />
            <p style={{ margin: "0 0 0.5rem", color: C.amber, fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>PROPUESTA</p>
            {fila(`Tarifa proveedor (margen ${Math.round(d.margen_proveedor * 100)}%)`, money(d.tarifa_proveedor))}
            {fila(`Tarifa cliente (margen ${Math.round(d.margen_empresa * 100)}%)`, money(d.tarifa_cliente), { fuerte: true })}
            {fila(`IVA ${Math.round(cfg.iva * 100)}%`, money(d.iva))}
            {fila("Total a facturar", money(d.total), { fuerte: true, color: C.green })}
            <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 12, color: C.muted }}>
              <span>Utilidad proveedor: <b style={{ color: C.green }}>{money(d.utilidad_proveedor)}</b></span>
              <span>Utilidad venta: <b style={{ color: C.green }}>{money(d.utilidad_empresa)}</b></span>
            </div>
          </Card>

          {/* Comparativo con lo real */}
          <Card style={{ backgroundColor: C.card2 }}>
            <p style={{ margin: "0 0 0.5rem", color: C.amber, fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>LO QUE PAGAS HOY EN ESTA RUTA (KTM)</p>
            {!origenId || !destinoId ? <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Elige origen y destino.</p>
              : cargandoComp ? <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Consultando…</p>
              : !ref ? <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>No hay servicios ni tarifas registradas en esta ruta con esta unidad.</p> : (
              <>
                {comparativo!.servicios.n > 0 && fila(`Servicios finalizados (${comparativo!.servicios.n})`, `${money(comparativo!.servicios.costo_min)} – ${money(comparativo!.servicios.costo_max)}`)}
                {fila(`Referencia (${ref.origen})`, money(ref.costo), { fuerte: true })}
                {comparativo!.servicios.venta_prom ? fila("Venta promedio al cliente", money(comparativo!.servicios.venta_prom)) : null}
                {comparativo!.tarifas_compra.slice(0, 3).map((t) => fila(`Tarifa de ${t.proveedor}`, money(t.costo)))}
                {difRef !== null && (
                  <p style={{ margin: "10px 0 0", fontSize: 13, padding: "0.5rem 0.7rem", borderRadius: 8, lineHeight: 1.4,
                    backgroundColor: Math.abs(difRef) <= 10 ? "rgba(34,197,94,0.12)" : "rgba(245,166,35,0.12)", color: Math.abs(difRef) <= 10 ? C.green : C.amber }}>
                    La tarifa proveedor calculada está <b>{difRef > 0 ? "+" : ""}{difRef.toFixed(0)}%</b> {difRef >= 0 ? "arriba" : "abajo"} de lo que pagas hoy.
                    {Math.abs(difRef) > 15 && " Revisa km, casetas o márgenes antes de enviarla."}
                  </p>
                )}
                {comparativo!.servicios.ultimo && <p style={{ margin: "8px 0 0", fontSize: 12, color: C.muted }}>Último: {comparativo!.servicios.ultimo.id_track} · {comparativo!.servicios.ultimo.proveedor} · {money(comparativo!.servicios.ultimo.costo)} · {fecha(comparativo!.servicios.ultimo.fecha)}</p>}
              </>
            )}
          </Card>

          <Btn onClick={guardar} disabled={!listo || guardando} style={{ width: "100%", padding: "0.75rem" }}>
            {guardando ? "Guardando…" : "Guardar cotización y generar carta"}
          </Btn>
          {!listo && <p style={{ fontSize: 12, color: C.muted, margin: 0, textAlign: "center" }}>Falta cliente, origen, destino o kilómetros.</p>}
          {error && <p style={{ fontSize: 13, color: C.red, margin: 0 }}>{error}</p>}
        </div>
      </div>

      {/* ── Historial */}
      <div style={{ marginTop: "2rem" }}>
        <Titulo>Cotizaciones</Titulo>
        <Tabla columnas={["Folio", "Fecha", "Cliente", "Ruta", "Unidad", "Tarifa cliente", "Estatus", "Carta"]} vacio="Aún no hay cotizaciones">
          {cotizaciones.map((c, i) => (
            <Tr key={c.id} i={i} onClick={() => setDetalle(c)}>
              <Td fuerte>{c.folio}</Td>
              <Td>{fecha(c.fecha)}</Td>
              <Td>{c.cliente_nombre}</Td>
              <Td>{c.origen} → {c.destino}</Td>
              <Td>{cfg.unidades[c.unidad]?.nombre || c.unidad}</Td>
              <Td fuerte>{money(c.tarifa_cliente)}</Td>
              <Td><span style={{ color: c.estatus === "aceptada" ? C.green : c.estatus === "rechazada" ? C.red : C.amber, fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>{c.estatus}</span></Td>
              <Td><span onClick={(e) => e.stopPropagation()}><Btn small variante="secundario" onClick={() => carta(c)}>📄 Word</Btn></span></Td>
            </Tr>
          ))}
        </Tabla>
      </div>

      {detalle && (
        <Modal titulo={`Cotización ${detalle.folio}`} onClose={() => setDetalle(null)} ancho={720}>
          <Grid cols={3}>
            <Dato label="Cliente" valor={detalle.cliente_nombre} />
            <Dato label="Contacto" valor={detalle.contacto} />
            <Dato label="Fecha" valor={fecha(detalle.fecha)} />
            <Dato label="Ruta" valor={`${detalle.origen} → ${detalle.destino}`} />
            <Dato label="Unidad" valor={detalle.unidad_descripcion} />
            <Dato label="Tipo de viaje" valor={`${detalle.tipo_viaje} · ${detalle.km} km`} />
            <Dato label="Costo operativo" valor={money(detalle.costo_operativo)} />
            <Dato label="Tarifa proveedor" valor={money(detalle.tarifa_proveedor)} />
            <Dato label="Tarifa cliente" valor={money(detalle.tarifa_cliente)} />
            <Dato label="Combustible" valor={`${money(detalle.precio_combustible)}/L`} />
            <Dato label="Hora extra" valor={money(detalle.hora_extra)} />
            <Dato label="Estadía" valor={money(detalle.estadia)} />
          </Grid>
          {detalle.notas && <p style={{ color: C.muted, fontSize: 13, marginTop: 12 }}>Notas: {detalle.notas}</p>}
          <p style={{ color: C.muted, fontSize: 12, marginTop: 10 }}>Precio de combustible: {detalle.combustible_fuente}</p>
          <div style={{ display: "flex", gap: 8, marginTop: "1.2rem", flexWrap: "wrap" }}>
            <Btn onClick={() => carta(detalle)}>📄 Descargar carta en Word</Btn>
            {detalle.estatus !== "aceptada" && <Btn variante="verde" onClick={() => cambiarEstatus(detalle, "aceptada")}>Marcar aceptada</Btn>}
            {detalle.estatus !== "rechazada" && <Btn variante="peligro" onClick={() => cambiarEstatus(detalle, "rechazada")}>Marcar rechazada</Btn>}
          </div>
        </Modal>
      )}
    </div>
  );
}
