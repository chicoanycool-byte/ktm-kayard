"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { C } from "@/components/ui";
import { METRICAS, PALETA, formatear, type Fila, type Metrica, type TipoGrafica } from "./metricas";

const eje = { stroke: "rgba(255,255,255,0.5)", fontSize: 11 };
const tip = { contentStyle: { background: C.side, border: `1px solid ${C.line}`, borderRadius: 8, color: "white", fontSize: 12 }, labelStyle: { color: C.amber } };

function corto(v: number, met: Metrica) {
  const t = METRICAS[met].tipo;
  if (t === "pct") return `${v}%`;
  if (Math.abs(v) >= 1_000_000) return `${t === "dinero" ? "$" : ""}${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `${t === "dinero" ? "$" : ""}${(v / 1000).toFixed(0)}k`;
  return `${t === "dinero" ? "$" : ""}${v}`;
}

export default function Grafica({ filas, metricas, tipo, alto = 260 }: { filas: Fila[]; metricas: Metrica[]; tipo: TipoGrafica; alto?: number }) {
  if (!filas.length) return <p style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "2rem 0" }}>Sin datos para este filtro</p>;
  const m0 = metricas[0];
  const fmt = (v: unknown, name: unknown) => {
    const met = (Object.keys(METRICAS) as Metrica[]).find((k) => METRICAS[k].label === name) || m0;
    return [formatear(Number(v), met), String(name)] as [string, string];
  };

  if (tipo === "tabla") {
    return (
      <div style={{ overflowX: "auto", maxHeight: alto + 60, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>{["", ...metricas.map((m) => METRICAS[m].label)].map((h, i) => (
              <th key={i} style={{ textAlign: i ? "right" : "left", padding: "6px 8px", color: C.amber, borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, background: C.card }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={f.clave} style={{ background: i % 2 ? C.card2 : "transparent" }}>
                <td style={{ padding: "5px 8px", color: "white" }}>{f.nombre}</td>
                {metricas.map((m) => (
                  <td key={m} style={{ padding: "5px 8px", textAlign: "right", color: m === "utilidad" && f[m] < 0 ? C.red : C.text }}>{formatear(f[m], m)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (tipo === "pastel") {
    return (
      <ResponsiveContainer width="100%" height={alto}>
        <PieChart>
          <Pie data={filas} dataKey={m0} nameKey="nombre" innerRadius="45%" outerRadius="80%" paddingAngle={1} isAnimationActive={false}
            label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
            {filas.map((f, i) => <Cell key={f.clave} fill={PALETA[i % PALETA.length]} stroke="none" />)}
          </Pie>
          <Tooltip {...tip} formatter={(v) => formatear(Number(v), m0)} />
          <Legend wrapperStyle={{ fontSize: 11, color: C.text }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const series = metricas.map((m, i) => ({ m, color: PALETA[i % PALETA.length], name: METRICAS[m].label }));

  if (tipo === "barras_h") {
    return (
      <ResponsiveContainer width="100%" height={Math.max(alto, filas.length * 28 + 40)}>
        <BarChart data={filas} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.07)" horizontal={false} />
          <XAxis type="number" {...eje} tickFormatter={(v) => corto(v, m0)} />
          <YAxis type="category" dataKey="nombre" {...eje} width={140} tick={{ fontSize: 11, fill: "rgba(255,255,255,0.7)" }} />
          <Tooltip {...tip} formatter={fmt} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {series.map((s) => <Bar key={s.m} dataKey={s.m} name={s.name} fill={s.color} radius={[0, 4, 4, 0]} isAnimationActive={false} />)}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const comun = (
    <>
      <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
      <XAxis dataKey="nombre" {...eje} interval="preserveStartEnd" />
      <YAxis {...eje} tickFormatter={(v) => corto(v, m0)} width={60} />
      <Tooltip {...tip} formatter={fmt} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
      {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
    </>
  );

  if (tipo === "linea") {
    return (
      <ResponsiveContainer width="100%" height={alto}>
        <LineChart data={filas}>{comun}
          {series.map((s) => <Line key={s.m} dataKey={s.m} name={s.name} stroke={s.color} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />)}
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (tipo === "area") {
    return (
      <ResponsiveContainer width="100%" height={alto}>
        <AreaChart data={filas}>{comun}
          {series.map((s) => <Area key={s.m} dataKey={s.m} name={s.name} stroke={s.color} fill={s.color} fillOpacity={0.25} strokeWidth={2} isAnimationActive={false} />)}
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={filas}>{comun}
        {series.map((s) => <Bar key={s.m} dataKey={s.m} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} isAnimationActive={false} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}
