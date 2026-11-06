"use client";
import { useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PanelFiltros, useFiltrosTiempos, type Listas } from "@/components/FiltrosTiempos";
import { exportarPDFElemento } from "@/lib/exportar";
import { fecha } from "@/lib/format";
import { duracion, horaMx, pctOnTime, porPeriodo, promedio, retraso, type RegT, type ServT } from "@/lib/tiempos";
import { Btn, C, Titulo } from "@/components/ui";

// Paleta clara para presentar al cliente
const B = { fondo: "#FFFFFF", tinta: "#0F1E2E", gris: "#64748B", linea: "#E2E8F0", suave: "#F8FAFC", navy: "#1B3A5C", ambar: "#F5A623", verde: "#16A34A", rojo: "#DC2626", azul: "#2A6DA8" };
const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toFixed(1)}%`);

export default function EjecutivoView({ servicios, registros, listas }: { servicios: ServT[]; registros: RegT[]; listas: Listas }) {
  const f = useFiltrosTiempos(servicios, registros, listas, 95);
  const [ocupado, setOcupado] = useState(false);
  const [filasTabla, setFilasTabla] = useState(25);
  const reporte = useRef<HTMLDivElement>(null);
  const rs = f.resultados;

  const k = useMemo(() => {
    const g = pctOnTime(rs, "onTime");
    return {
      servicios: rs.length, finalizados: rs.filter((r) => r.s.estatus === "finalizado").length,
      global: g, carga: pctOnTime(rs, "onTimeCarga"), entrega: pctOnTime(rs, "onTimeEntrega"),
      transito: promedio(rs.map((r) => r.horas.transito).filter((x): x is number => x !== undefined)),
      p2p: promedio(rs.map((r) => r.horas.puerta_a_puerta).filter((x): x is number => x !== undefined)),
    };
  }, [rs]);
  const periodos = useMemo(() => porPeriodo(rs, f.agrupar), [rs, f.agrupar]);
  const rutas = useMemo(() => {
    const m = new Map<string, { ruta: string; servicios: number; aTiempo: number; evaluados: number; transito: number[] }>();
    for (const r of rs) {
      const ruta = `${r.s.origen || "—"} → ${r.s.destino || "—"}`;
      const a = m.get(ruta) || { ruta, servicios: 0, aTiempo: 0, evaluados: 0, transito: [] };
      a.servicios++;
      if (r.onTime !== null) { a.evaluados++; if (r.onTime) a.aTiempo++; }
      if (r.horas.transito !== undefined) a.transito.push(r.horas.transito);
      m.set(ruta, a);
    }
    return [...m.values()].sort((a, b) => b.servicios - a.servicios).slice(0, 8);
  }, [rs]);
  const servs = useMemo(() => [...rs].sort((a, b) => (b.s.fecha_carga || "").localeCompare(a.s.fecha_carga || "")), [rs]);
  const dona = [
    { nombre: "A tiempo", valor: k.global.aTiempo, color: B.verde },
    { nombre: "Con retraso", valor: k.global.evaluados - k.global.aTiempo, color: B.rojo },
  ];
  const cumple = k.global.pct !== null && k.global.pct >= f.meta;
  const titulo = f.nombreCliente ? `Reporte de desempeño · ${f.nombreCliente}` : "Reporte de desempeño logístico";

  async function pdf() {
    if (!reporte.current) return;
    setOcupado(true);
    try {
      await exportarPDFElemento(reporte.current, titulo, f.subtitulo, `Dashboard_ejecutivo${f.nombreCliente ? "_" + f.nombreCliente.replace(/\s+/g, "_") : ""}`, "#FFFFFF", "vertical");
    } finally {
      setOcupado(false);
    }
  }

  const tarjeta = (l: string, v: string, d: string, color = B.tinta) => (
    <div style={{ background: B.suave, border: `1px solid ${B.linea}`, borderRadius: 12, padding: "14px 16px" }}>
      <p style={{ margin: 0, color: B.gris, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</p>
      <p style={{ margin: "6px 0 2px", color, fontSize: 28, fontWeight: 800 }}>{v}</p>
      <p style={{ margin: 0, color: B.gris, fontSize: 12 }}>{d}</p>
    </div>
  );
  const seccion = (t: string) => <h3 style={{ color: B.navy, fontSize: 15, margin: "0 0 10px", borderLeft: `4px solid ${B.ambar}`, paddingLeft: 10 }}>{t}</h3>;
  const ejes = { stroke: B.gris, fontSize: 11 };

  return (
    <div>
      <Titulo accion={
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={pdf} disabled={ocupado || !rs.length}>{ocupado ? "Generando PDF…" : "⬇ Descargar PDF para cliente"}</Btn>
        </div>
      }>Dashboard ejecutivo</Titulo>
      <PanelFiltros f={f} listas={listas} conMeta />
      <p style={{ color: C.muted, fontSize: 12, margin: "0 0 10px" }}>Esta vista no muestra costos ni ventas. Así se verá el PDF que le mandas al cliente:</p>

      <div ref={reporte} style={{ background: B.fondo, color: B.tinta, borderRadius: 14, padding: 28, maxWidth: 1100, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `2px solid ${B.linea}`, paddingBottom: 14, marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, color: B.ambar, fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Kayard Transportes</p>
            <h2 style={{ margin: "4px 0", fontSize: 22, color: B.navy }}>{titulo}</h2>
            <p style={{ margin: 0, color: B.gris, fontSize: 13 }}>{f.subtitulo} · {k.servicios} servicios</p>
          </div>
          <img src="/logo-kayard.png" alt="Kayard" style={{ height: 54 }} />
        </div>

        {!rs.length ? (
          <p style={{ color: B.gris, textAlign: "center", padding: "40px 0" }}>No hay servicios con seguimiento para este filtro.</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 22 }}>
              {tarjeta("On-time global", pct(k.global.pct), `${k.global.aTiempo} de ${k.global.evaluados} servicios · meta ${f.meta}%`, k.global.pct === null ? B.tinta : cumple ? B.verde : B.rojo)}
              {tarjeta("Carga a tiempo", pct(k.carga.pct), `${k.carga.aTiempo} de ${k.carga.evaluados} llegadas`)}
              {tarjeta("Entrega a tiempo", pct(k.entrega.pct), `${k.entrega.aTiempo} de ${k.entrega.evaluados} entregas`)}
              {tarjeta("Servicios realizados", String(k.servicios), `${k.finalizados} finalizados`)}
              {tarjeta("Tránsito promedio", duracion(k.transito), "Salida → llegada a destino")}
              {tarjeta("Puerta a puerta", duracion(k.p2p), "Llegada a carga → entrega")}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 22 }}>
              <div style={{ border: `1px solid ${B.linea}`, borderRadius: 12, padding: 14 }}>
                {seccion(`Cumplimiento On-time por ${f.agrupar}`)}
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={periodos}>
                    <CartesianGrid stroke={B.linea} vertical={false} />
                    <XAxis dataKey="nombre" {...ejes} />
                    <YAxis domain={[0, 100]} {...ejes} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(v, n) => [`${v}%`, n]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={f.meta} stroke={B.ambar} strokeDasharray="6 4" label={{ value: `Meta ${f.meta}%`, fill: B.ambar, fontSize: 11, position: "insideTopLeft" }} />
                    <Bar dataKey="onTime" name="On-time global" fill={B.navy} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      <LabelList dataKey="onTime" position="top" fontSize={10} fill={B.tinta} formatter={(v: unknown) => (v === null || v === undefined ? "" : `${Math.round(Number(v))}%`)} />
                    </Bar>
                    <Line dataKey="onTimeEntrega" name="Entrega a tiempo" stroke={B.verde} strokeWidth={2} dot={{ r: 2 }} connectNulls isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div style={{ border: `1px solid ${B.linea}`, borderRadius: 12, padding: 14 }}>
                {seccion("Servicios a tiempo")}
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={dona} dataKey="valor" nameKey="nombre" innerRadius="55%" outerRadius="85%" isAnimationActive={false}
                      label={({ value }) => (value ? String(value) : "")}>
                      {dona.map((d) => <Cell key={d.nombre} fill={d.color} />)}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
              <div style={{ border: `1px solid ${B.linea}`, borderRadius: 12, padding: 14 }}>
                {seccion(`Servicios por ${f.agrupar}`)}
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={periodos}>
                    <CartesianGrid stroke={B.linea} vertical={false} />
                    <XAxis dataKey="nombre" {...ejes} />
                    <YAxis {...ejes} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="servicios" name="Servicios" fill={B.azul} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      <LabelList dataKey="servicios" position="top" fontSize={10} fill={B.tinta} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ border: `1px solid ${B.linea}`, borderRadius: 12, padding: 14 }}>
                {seccion("Principales rutas")}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr>{["Ruta", "Servicios", "On-time", "Tránsito prom."].map((h, i) => <th key={h} style={{ textAlign: i ? "right" : "left", padding: "6px 4px", color: B.gris, borderBottom: `1px solid ${B.linea}` }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {rutas.map((r) => (
                      <tr key={r.ruta}>
                        <td style={{ padding: "6px 4px", borderBottom: `1px solid ${B.linea}` }}>{r.ruta}</td>
                        <td style={{ padding: "6px 4px", textAlign: "right", borderBottom: `1px solid ${B.linea}` }}>{r.servicios}</td>
                        <td style={{ padding: "6px 4px", textAlign: "right", borderBottom: `1px solid ${B.linea}`, fontWeight: 700, color: r.evaluados ? (r.aTiempo / r.evaluados * 100 >= f.meta ? B.verde : B.rojo) : B.gris }}>{r.evaluados ? pct((r.aTiempo / r.evaluados) * 100) : "—"}</td>
                        <td style={{ padding: "6px 4px", textAlign: "right", borderBottom: `1px solid ${B.linea}` }}>{duracion(promedio(r.transito))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ border: `1px solid ${B.linea}`, borderRadius: 12, padding: 14 }}>
              {seccion("Detalle de servicios")}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                <thead>
                  <tr style={{ background: B.navy }}>
                    {["ID TRACK", "Fecha", "Ruta", "Cita carga", "Llegada", "Carga", "Cita entrega", "Llegada", "Entrega", "Tránsito"].map((h, i) => (
                      <th key={i} style={{ textAlign: "left", padding: "7px 6px", color: "white", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {servs.slice(0, filasTabla).map((r, i) => (
                    <tr key={r.s.id} style={{ background: i % 2 ? B.suave : B.fondo }}>
                      <td style={{ padding: "6px", fontWeight: 700 }}>{r.s.id_track}</td>
                      <td style={{ padding: "6px" }}>{fecha(r.s.fecha_carga)}</td>
                      <td style={{ padding: "6px" }}>{r.s.origen} → {r.s.destino}</td>
                      <td style={{ padding: "6px" }}>{horaMx(r.citaCarga)}</td>
                      <td style={{ padding: "6px" }}>{horaMx(r.llegadaCarga)}</td>
                      <td style={{ padding: "6px", color: r.onTimeCarga === null ? B.gris : r.onTimeCarga ? B.verde : B.rojo, fontWeight: 700 }} title={retraso(r.retrasoCargaMin)}>{r.onTimeCarga === null ? "—" : r.onTimeCarga ? "✓" : "✗"}</td>
                      <td style={{ padding: "6px" }}>{horaMx(r.citaEntrega)}</td>
                      <td style={{ padding: "6px" }}>{horaMx(r.llegadaEntrega)}</td>
                      <td style={{ padding: "6px", color: r.onTimeEntrega === null ? B.gris : r.onTimeEntrega ? B.verde : B.rojo, fontWeight: 700 }} title={retraso(r.retrasoEntregaMin)}>{r.onTimeEntrega === null ? "—" : r.onTimeEntrega ? "✓" : "✗"}</td>
                      <td style={{ padding: "6px" }}>{duracion(r.horas.transito)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {servs.length > filasTabla && (
                <p data-html2canvas-ignore style={{ textAlign: "center", margin: "10px 0 0" }}>
                  <button onClick={() => setFilasTabla(servs.length)} style={{ border: `1px solid ${B.linea}`, background: B.suave, borderRadius: 6, padding: "4px 12px", cursor: "pointer", color: B.navy }}>Mostrar los {servs.length} servicios</button>
                </p>
              )}
            </div>
            <p style={{ color: B.gris, fontSize: 10.5, marginTop: 14 }}>
              On-time: el transporte llegó a cargar y a entregar dentro de la hora de cita{f.tolerancia ? ` (tolerancia de ${f.tolerancia} min)` : ""}. Información registrada en tiempo real por el operador desde su dispositivo.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
