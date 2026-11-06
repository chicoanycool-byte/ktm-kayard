"use client";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money, pct } from "@/lib/format";
import type { ServicioV } from "@/components/ServicioDetalle";
import { Btn, C, Campo, Card, Tabla, Td, Titulo, Tr, inputStyle } from "@/components/ui";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function agrupar(servicios: ServicioV[], clave: (s: ServicioV) => string) {
  const m = new Map<string, { nombre: string; viajes: number; venta: number; costo: number; utilidad: number }>();
  for (const s of servicios) {
    const k = clave(s) || "—";
    const a = m.get(k) || { nombre: k, viajes: 0, venta: 0, costo: 0, utilidad: 0 };
    a.viajes++; a.venta += Number(s.total_venta || 0); a.costo += Number(s.total_costo || 0); a.utilidad += Number(s.utilidad || 0);
    m.set(k, a);
  }
  return [...m.values()];
}

export default function IndicadoresView({ servicios, listas, filtros }: {
  servicios: ServicioV[]; listas: Record<string, { id: string; nombre: string }[]>; filtros: Record<string, string | undefined>;
}) {
  const tot = useMemo(() => {
    const venta = servicios.reduce((a, s) => a + Number(s.total_venta || 0), 0);
    const costo = servicios.reduce((a, s) => a + Number(s.total_costo || 0), 0);
    const fin = servicios.filter((s) => s.estatus === "finalizado").length;
    return { viajes: servicios.length, fin, venta, costo, util: venta - costo };
  }, [servicios]);

  const porMes = useMemo(() => agrupar([...servicios].sort((a, b) => (a.anio * 100 + a.mes) - (b.anio * 100 + b.mes)), (s) => `${MESES[(s.mes || 1) - 1]} ${String(s.anio).slice(2)}`), [servicios]);
  const porCliente = useMemo(() => agrupar(servicios, (s) => s.cliente).sort((a, b) => b.venta - a.venta), [servicios]);
  const porProveedor = useMemo(() => agrupar(servicios, (s) => s.proveedor || "Sin asignar").sort((a, b) => b.viajes - a.viajes), [servicios]);
  const porRuta = useMemo(() => agrupar(servicios, (s) => `${s.origen} → ${s.destino}`).sort((a, b) => b.viajes - a.viajes).slice(0, 10), [servicios]);

  const kpi = (l: string, v: string, color: string) => (
    <Card><p style={{ margin: 0, color: C.muted, fontSize: 12 }}>{l}</p><p style={{ margin: "4px 0 0", color, fontSize: 24, fontWeight: 700 }}>{v}</p></Card>
  );

  const tablaGrupo = (titulo: string, filas: ReturnType<typeof agrupar>) => (
    <div>
      <h3 style={{ color: "white", fontSize: 15 }}>{titulo}</h3>
      <Tabla columnas={["", "Viajes", "Venta", "Costo", "Utilidad", "Margen"]}>
        {filas.map((f, i) => (
          <Tr key={f.nombre} i={i}>
            <Td fuerte>{f.nombre}</Td><Td>{f.viajes}</Td><Td>{money(f.venta)}</Td><Td>{money(f.costo)}</Td>
            <Td style={{ color: f.utilidad < 0 ? C.red : C.green }}>{money(f.utilidad)}</Td><Td>{f.venta ? pct((f.utilidad / f.venta) * 100) : "—"}</Td>
          </Tr>
        ))}
      </Tabla>
    </div>
  );

  return (
    <div>
      <Titulo>Indicadores</Titulo>
      <Card style={{ marginBottom: 16 }}>
        <form method="get" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, alignItems: "end" }}>
          <Campo label="Fecha inicial"><input type="date" name="desde" defaultValue={filtros.desde} style={inputStyle} /></Campo>
          <Campo label="Fecha final"><input type="date" name="hasta" defaultValue={filtros.hasta} style={inputStyle} /></Campo>
          <Campo label="Año"><input type="number" name="anio" defaultValue={filtros.anio} placeholder="2026" style={inputStyle} /></Campo>
          <Campo label="Mes">
            <select name="mes" defaultValue={filtros.mes || ""} style={inputStyle}>
              <option value="">Todos</option>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </Campo>
          <Campo label="Cliente">
            <select name="cliente" defaultValue={filtros.cliente || ""} style={inputStyle}>
              <option value="">Todos</option>
              {listas.clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Transportista">
            <select name="proveedor" defaultValue={filtros.proveedor || ""} style={inputStyle}>
              <option value="">Todos</option>
              {listas.proveedores.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Campo>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn type="submit">Filtrar</Btn>
            <Btn variante="secundario" href="/indicadores">Limpiar</Btn>
          </div>
        </form>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 16 }}>
        {kpi("Viajes", String(tot.viajes), "white")}
        {kpi("Finalizados", String(tot.fin), C.green)}
        {kpi("Venta", money(tot.venta), C.amber)}
        {kpi("Costo", money(tot.costo), C.blue)}
        {kpi("Utilidad", money(tot.util), tot.util < 0 ? C.red : C.green)}
        {kpi("Margen", tot.venta ? pct((tot.util / tot.venta) * 100) : "—", "white")}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ color: "white", fontSize: 15, marginTop: 0 }}>Venta y utilidad por mes</h3>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={porMes} margin={{ left: 10 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="nombre" stroke="rgba(255,255,255,0.5)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ background: C.side, border: `1px solid ${C.line}`, color: "white" }} />
              <Bar dataKey="venta" name="Venta" fill={C.amber} radius={[4, 4, 0, 0]} />
              <Bar dataKey="utilidad" name="Utilidad" fill={C.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div style={{ display: "grid", gap: 16 }}>
        {tablaGrupo("Por cliente", porCliente)}
        {tablaGrupo("Por transportista", porProveedor)}
        {tablaGrupo("Rutas más usadas", porRuta)}
      </div>
    </div>
  );
}
