"use client";
import { useMemo, useState } from "react";
import { analizar, type RegT, type ServT } from "@/lib/tiempos";
import SelectBuscable from "./SelectBuscable";
import { Btn, C, Campo, Card, inputStyle } from "./ui";

export type Listas = Record<string, { id: string; nombre: string }[]>;

// Filtros compartidos por Tiempos y Dashboard ejecutivo
export function useFiltrosTiempos(servicios: ServT[], registros: RegT[], listas: Listas, inicialMeta = 95) {
  const [cliente, setCliente] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [tolerancia, setTolerancia] = useState(0);
  const [agrupar, setAgrupar] = useState<"semana" | "mes">("semana");
  const [soloConDatos, setSoloConDatos] = useState(true);
  const [meta, setMeta] = useState(inicialMeta);

  const filtrados = useMemo(() => servicios.filter((s) => {
    const f = s.fecha_carga || s.fecha;
    if (cliente && s.cliente_id !== cliente) return false;
    if (proveedor && s.proveedor_id !== proveedor) return false;
    if (desde && f < desde) return false;
    if (hasta && f > hasta) return false;
    return true;
  }), [servicios, cliente, proveedor, desde, hasta]);

  const todos = useMemo(() => analizar(filtrados, registros, tolerancia), [filtrados, registros, tolerancia]);
  const resultados = useMemo(() => (soloConDatos ? todos.filter((r) => r.onTime !== null || Object.keys(r.horas).some((k) => k !== "ciclo" && k !== "asignacion")) : todos), [todos, soloConDatos]);

  const nombre = (lista: string, id: string) => listas[lista]?.find((o) => o.id === id)?.nombre || "";
  const fmt = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
  const subtitulo = [
    cliente ? `Cliente: ${nombre("clientes", cliente)}` : "Todos los clientes",
    proveedor && `Transportista: ${nombre("proveedores", proveedor)}`,
    desde || hasta ? `Periodo: ${desde ? fmt(desde) : "inicio"} al ${hasta ? fmt(hasta) : "hoy"}` : "Todo el periodo",
    tolerancia ? `Tolerancia ${tolerancia} min` : "Sin tolerancia",
  ].filter(Boolean).join(" · ");

  return {
    cliente, setCliente, proveedor, setProveedor, desde, setDesde, hasta, setHasta, tolerancia, setTolerancia,
    agrupar, setAgrupar, soloConDatos, setSoloConDatos, meta, setMeta, resultados, todos, subtitulo,
    nombreCliente: cliente ? nombre("clientes", cliente) : "",
  };
}

type F = ReturnType<typeof useFiltrosTiempos>;

export function PanelFiltros({ f, listas, conMeta = false }: { f: F; listas: Listas; conMeta?: boolean }) {
  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, alignItems: "end" }}>
        <Campo label="Cliente"><SelectBuscable value={f.cliente} onChange={f.setCliente} opciones={listas.clientes || []} placeholder="Todos" /></Campo>
        <Campo label="Transportista"><SelectBuscable value={f.proveedor} onChange={f.setProveedor} opciones={listas.proveedores || []} placeholder="Todos" /></Campo>
        <Campo label="Carga desde"><input type="date" value={f.desde} onChange={(e) => f.setDesde(e.target.value)} style={inputStyle} /></Campo>
        <Campo label="Carga hasta"><input type="date" value={f.hasta} onChange={(e) => f.setHasta(e.target.value)} style={inputStyle} /></Campo>
        <Campo label="Agrupar por">
          <select value={f.agrupar} onChange={(e) => f.setAgrupar(e.target.value as "semana" | "mes")} style={inputStyle}>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
          </select>
        </Campo>
        <Campo label="Tolerancia (minutos)"><input type="number" min={0} step={5} value={f.tolerancia} onChange={(e) => f.setTolerancia(Math.max(0, Number(e.target.value)))} style={inputStyle} /></Campo>
        {conMeta && <Campo label="Meta On-time (%)"><input type="number" min={0} max={100} value={f.meta} onChange={(e) => f.setMeta(Math.min(100, Math.max(0, Number(e.target.value))))} style={inputStyle} /></Campo>}
        <label style={{ color: C.text, fontSize: 12, display: "flex", gap: 6, alignItems: "center", paddingBottom: 8 }}>
          <input type="checkbox" checked={f.soloConDatos} onChange={(e) => f.setSoloConDatos(e.target.checked)} /> Solo servicios con seguimiento
        </label>
        <Btn variante="secundario" onClick={() => { f.setCliente(""); f.setProveedor(""); f.setDesde(""); f.setHasta(""); f.setTolerancia(0); }}>Limpiar</Btn>
      </div>
    </Card>
  );
}
