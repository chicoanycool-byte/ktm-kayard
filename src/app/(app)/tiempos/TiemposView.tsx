"use client";
import { useMemo, useRef, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PanelFiltros, useFiltrosTiempos, type Listas } from "@/components/FiltrosTiempos";
import { exportarExcel, exportarPDFElemento, exportarPDFTabla } from "@/lib/exportar";
import { fecha } from "@/lib/format";
import {
  ETAPAS, ETAPAS_TOTALES, duracion, horaMx, pctOnTime, porCliente, porPeriodo, promedio, retraso,
  type RegT, type ResultadoServicio, type ServT,
} from "@/lib/tiempos";
import { Btn, C, Card, Tabla, Td, Titulo, Tr } from "@/components/ui";

const TODAS = [...ETAPAS, ...ETAPAS_TOTALES];
const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toFixed(1)}%`);
const colorPct = (n: number | null | undefined) => (n === null || n === undefined ? C.muted : n >= 95 ? C.green : n >= 85 ? C.amber : C.red);

function Marca({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span style={{ color: C.muted }}>—</span>;
  return <span style={{ color: ok ? C.green : C.red, fontWeight: 700 }}>{ok ? "✓ A tiempo" : "✗ Tarde"}</span>;
}

export default function TiemposView({ servicios, registros, listas }: { servicios: ServT[]; registros: RegT[]; listas: Listas }) {
  const f = useFiltrosTiempos(servicios, registros, listas);
  const [vista, setVista] = useState<"cliente" | "servicio">("cliente");
  const [limite, setLimite] = useState(200);
  const [ocupado, setOcupado] = useState("");
  const resumen = useRef<HTMLDivElement>(null);
  const rs = f.resultados;

  const kpi = useMemo(() => ({
    total: pctOnTime(rs, "onTime"), carga: pctOnTime(rs, "onTimeCarga"), entrega: pctOnTime(rs, "onTimeEntrega"),
    transito: promedio(rs.map((r) => r.horas.transito).filter((x): x is number => x !== undefined)),
    p2p: promedio(rs.map((r) => r.horas.puerta_a_puerta).filter((x): x is number => x !== undefined)),
  }), [rs]);
  const periodos = useMemo(() => porPeriodo(rs, f.agrupar), [rs, f.agrupar]);
  const clientes = useMemo(() => porCliente(rs), [rs]);
  const ordenados = useMemo(() => [...rs].sort((a, b) => (b.s.fecha_carga || "").localeCompare(a.s.fecha_carga || "")), [rs]);

  const filaServicio = (r: ResultadoServicio) => ({
    "ID TRACK": r.s.id_track, Cliente: r.s.cliente, Transportista: r.s.proveedor || "", Ruta: `${r.s.origen || "—"} → ${r.s.destino || "—"}`,
    "Fecha carga": fecha(r.s.fecha_carga), "Cita carga": horaMx(r.citaCarga), "Llegada a carga": horaMx(r.llegadaCarga),
    "On-time carga": r.onTimeCarga === null ? "" : r.onTimeCarga ? "A tiempo" : "Tarde", "Diferencia carga": retraso(r.retrasoCargaMin),
    "Cita entrega": horaMx(r.citaEntrega), "Llegada a descarga": horaMx(r.llegadaEntrega),
    "On-time entrega": r.onTimeEntrega === null ? "" : r.onTimeEntrega ? "A tiempo" : "Tarde", "Diferencia entrega": retraso(r.retrasoEntregaMin),
    ...Object.fromEntries(TODAS.map((e) => [`${e.label} (h)`, r.horas[e.clave] !== undefined ? Number(r.horas[e.clave]!.toFixed(2)) : ""])),
  });

  async function exportar(tipo: "excel" | "pdf" | "pdf_detalle") {
    setOcupado(tipo);
    try {
      if (tipo === "excel") {
        await exportarExcel([
          { nombre: "Por cliente", filas: clientes.map((c) => ({ Cliente: c.cliente, Servicios: c.servicios, "Con seguimiento": c.evaluados, "On-time %": c.onTime ?? "", "On-time carga %": c.onTimeCarga ?? "", "On-time entrega %": c.onTimeEntrega ?? "", ...Object.fromEntries(TODAS.map((e) => [`${e.label} (h prom)`, c[e.clave] ?? ""])) })) },
          { nombre: `Por ${f.agrupar}`, filas: periodos.map((p) => ({ Periodo: p.nombre, Servicios: p.servicios, "Con seguimiento": p.evaluados, "On-time %": p.onTime ?? "", "On-time carga %": p.onTimeCarga ?? "", "On-time entrega %": p.onTimeEntrega ?? "", "Tránsito prom (h)": p.transito ?? "" })) },
          { nombre: "Por servicio", filas: ordenados.map(filaServicio) },
        ], "Tiempos_y_OnTime");
      } else if (tipo === "pdf" && resumen.current) {
        await exportarPDFElemento(resumen.current, "Tiempos y On-time", f.subtitulo, "Tiempos_y_OnTime");
      } else {
        const cols = ["ID TRACK", "Cliente", "Ruta", "Fecha carga", "Cita carga", "Llegada a carga", "On-time carga", "Cita entrega", "Llegada a descarga", "On-time entrega"];
        const extra = ["Carga (h)", "Espera de documentos (h)", "Tránsito (h)", "Descarga (h)"];
        const filas = ordenados.map(filaServicio);
        await exportarPDFTabla("Tiempos por servicio", f.subtitulo, [...cols, ...extra.map((x) => x.replace(" (h)", ""))],
          filas.map((x) => [...cols.map((c) => String(x[c as keyof typeof x] ?? "")), ...extra.map((c) => { const v = (x as Record<string, unknown>)[c]; return v === "" || v === undefined ? "—" : duracion(Number(v)); })]),
          "Tiempos_por_servicio");
      }
    } finally {
      setOcupado("");
    }
  }

  return (
    <div>
      <Titulo accion={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variante="secundario" onClick={() => exportar("excel")} disabled={!!ocupado}>{ocupado === "excel" ? "Generando…" : "⬇ Excel"}</Btn>
          <Btn variante="secundario" onClick={() => exportar("pdf")} disabled={!!ocupado}>{ocupado === "pdf" ? "Generando…" : "⬇ PDF resumen"}</Btn>
          <Btn variante="secundario" onClick={() => exportar("pdf_detalle")} disabled={!!ocupado}>{ocupado === "pdf_detalle" ? "Generando…" : "⬇ PDF por servicio"}</Btn>
        </div>
      }>Tiempos y On-time</Titulo>
      <PanelFiltros f={f} listas={listas} />

      <div ref={resumen} style={{ padding: 4 }}>
        <p style={{ color: C.muted, fontSize: 12, margin: "0 0 10px" }}>{f.subtitulo} · {rs.length} servicios</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 14 }}>
          {[
            { l: "On-time global", v: pct(kpi.total.pct), c: colorPct(kpi.total.pct), d: `${kpi.total.aTiempo} de ${kpi.total.evaluados} servicios` },
            { l: "On-time de carga", v: pct(kpi.carga.pct), c: colorPct(kpi.carga.pct), d: `${kpi.carga.aTiempo} de ${kpi.carga.evaluados}` },
            { l: "On-time de entrega", v: pct(kpi.entrega.pct), c: colorPct(kpi.entrega.pct), d: `${kpi.entrega.aTiempo} de ${kpi.entrega.evaluados}` },
            { l: "Tránsito promedio", v: duracion(kpi.transito), c: C.blue, d: "Salida → llegada a descarga" },
            { l: "Puerta a puerta promedio", v: duracion(kpi.p2p), c: C.amber, d: "Llegada a carga → finalizado" },
          ].map((k) => (
            <Card key={k.l} style={{ padding: "0.85rem 1rem" }}>
              <p style={{ margin: 0, color: C.muted, fontSize: 11 }}>{k.l}</p>
              <p style={{ margin: "4px 0 2px", color: k.c, fontSize: 22, fontWeight: 700 }}>{k.v}</p>
              <p style={{ margin: 0, color: C.muted, fontSize: 11 }}>{k.d}</p>
            </Card>
          ))}
        </div>

        <Card style={{ marginBottom: 14 }}>
          <h3 style={{ color: "white", fontSize: 14, marginTop: 0 }}>On-time por {f.agrupar}</h3>
          {periodos.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={periodos}>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="nombre" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                <YAxis yAxisId="p" domain={[0, 100]} stroke="rgba(255,255,255,0.5)" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <YAxis yAxisId="n" orientation="right" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                <Tooltip contentStyle={{ background: C.side, border: `1px solid ${C.line}`, color: "white", fontSize: 12 }} formatter={(v, n) => [n === "Servicios" ? v : `${v}%`, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="n" dataKey="servicios" name="Servicios" fill="rgba(91,163,217,0.35)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Line yAxisId="p" dataKey="onTime" name="On-time global" stroke={C.green} strokeWidth={2.5} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
                <Line yAxisId="p" dataKey="onTimeCarga" name="On-time carga" stroke={C.amber} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
                <Line yAxisId="p" dataKey="onTimeEntrega" name="On-time entrega" stroke="#A78BFA" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : <p style={{ color: C.muted, fontSize: 13 }}>Sin servicios con seguimiento en este filtro.</p>}
        </Card>

        <h3 style={{ color: "white", fontSize: 15 }}>Tiempo promedio entre estatus por cliente</h3>
        <Tabla columnas={["Cliente", "Servicios", "On-time", "Carga a tiempo", "Entrega a tiempo", ...TODAS.map((e) => e.label)]} vacio="Sin datos">
          {clientes.map((c, i) => (
            <Tr key={String(c.cliente)} i={i}>
              <Td fuerte>{c.cliente}</Td>
              <Td>{c.servicios}</Td>
              <Td style={{ color: colorPct(c.onTime as number | null), fontWeight: 700 }}>{pct(c.onTime as number | null)}</Td>
              <Td>{pct(c.onTimeCarga as number | null)}</Td>
              <Td>{pct(c.onTimeEntrega as number | null)}</Td>
              {TODAS.map((e) => <Td key={e.clave}>{duracion(c[e.clave] as number | null)}</Td>)}
            </Tr>
          ))}
        </Tabla>
      </div>

      <div style={{ display: "flex", gap: 8, margin: "22px 0 10px", alignItems: "center" }}>
        <h3 style={{ color: "white", fontSize: 15, margin: 0, flex: 1 }}>Detalle por servicio</h3>
        <Btn small variante={vista === "servicio" ? "primario" : "secundario"} onClick={() => setVista(vista === "servicio" ? "cliente" : "servicio")}>{vista === "servicio" ? "Ocultar detalle" : "Ver detalle"}</Btn>
      </div>
      {vista === "servicio" && (
        <>
          <Tabla columnas={["ID TRACK", "Cliente", "Ruta", "Cita carga", "Llegada", "Carga", "Cita entrega", "Llegada", "Entrega", ...ETAPAS.slice(1).map((e) => e.label)]}>
            {ordenados.slice(0, limite).map((r, i) => (
              <Tr key={r.s.id} i={i}>
                <Td fuerte>{r.s.id_track}</Td>
                <Td>{r.s.cliente}</Td>
                <Td>{r.s.origen} → {r.s.destino}</Td>
                <Td>{horaMx(r.citaCarga)}</Td>
                <Td>{horaMx(r.llegadaCarga)}</Td>
                <Td><Marca ok={r.onTimeCarga} /></Td>
                <Td>{horaMx(r.citaEntrega)}</Td>
                <Td>{horaMx(r.llegadaEntrega)}</Td>
                <Td><Marca ok={r.onTimeEntrega} /></Td>
                {ETAPAS.slice(1).map((e) => <Td key={e.clave}>{duracion(r.horas[e.clave])}</Td>)}
              </Tr>
            ))}
          </Tabla>
          {ordenados.length > limite && <div style={{ textAlign: "center", marginTop: 10 }}><Btn variante="secundario" onClick={() => setLimite(limite + 300)}>Ver más</Btn></div>}
        </>
      )}
      <p style={{ color: C.muted, fontSize: 11, marginTop: 14 }}>
        Carga a tiempo: el operador marcó “Llegué a cargar” antes de la cita de carga (+ tolerancia). Entrega a tiempo: marcó “Llegué a descargar” antes de la cita de descarga (+ tolerancia). Sin cita, se toma el fin del día. On-time global: carga y entrega a tiempo.
      </p>
    </div>
  );
}
