"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import SelectBuscable from "@/components/SelectBuscable";
import { ESTATUS_INFO, type Estatus } from "@/lib/constants";
import { exportarExcel, exportarPDFElemento } from "@/lib/exportar";
import { Btn, C, Campo, Card, Grid, Modal, Titulo, inputStyle } from "@/components/ui";
import Grafica from "./Grafica";
import {
  DIMENSIONES, DIM_TIEMPO, METRICAS, TIPOS, WIDGETS_INICIALES, calcular, formatear,
  type Dimension, type Metrica, type ServM, type TipoGrafica, type Widget,
} from "./metricas";

const CLAVE = "ktm_metricas_widgets_v1";
const nuevoId = () => Math.random().toString(36).slice(2, 9);

export default function MetricasView({ servicios, listas }: { servicios: ServM[]; listas: Record<string, { id: string; nombre: string }[]> }) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cliente, setCliente] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [conCancelados, setConCancelados] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>(WIDGETS_INICIALES);
  const [editando, setEditando] = useState<Widget | null>(null);
  const [ocupado, setOcupado] = useState("");
  const tablero = useRef<HTMLDivElement>(null);

  // El tablero de cada usuario se guarda en su navegador
  useEffect(() => {
    try {
      const g = localStorage.getItem(CLAVE);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (g) setWidgets(JSON.parse(g));
    } catch { /* usa el inicial */ }
  }, []);
  function guardar(ws: Widget[]) {
    setWidgets(ws);
    try { localStorage.setItem(CLAVE, JSON.stringify(ws)); } catch { /* sin almacenamiento */ }
  }

  const datos = useMemo(() => servicios.filter((s) => {
    const f = s.fecha_carga || s.fecha;
    if (desde && f < desde) return false;
    if (hasta && f > hasta) return false;
    if (cliente && s.cliente_id !== cliente) return false;
    if (proveedor && s.proveedor_id !== proveedor) return false;
    if (!conCancelados && s.estatus === "cancelado") return false;
    return true;
  }), [servicios, desde, hasta, cliente, proveedor, conCancelados]);

  const kpi = useMemo(() => {
    const venta = datos.reduce((a, s) => a + Number(s.total_venta || 0), 0);
    const costo = datos.reduce((a, s) => a + Number(s.total_costo || 0), 0);
    const fin = datos.filter((s) => s.estatus === "finalizado").length;
    const activos = datos.filter((s) => !["finalizado", "cancelado"].includes(s.estatus)).length;
    const conCosto = datos.filter((s) => Number(s.total_venta || 0) > 0).length;
    return { viajes: datos.length, fin, activos, venta, costo, util: venta - costo, margen: venta ? ((venta - costo) / venta) * 100 : 0, ticket: conCosto ? venta / conCosto : 0, conCosto };
  }, [datos]);

  const tarjetas = [
    { l: "Viajes", v: kpi.viajes.toLocaleString("es-MX"), c: "white" },
    { l: "Finalizados", v: kpi.fin.toLocaleString("es-MX"), c: C.green },
    { l: "En proceso", v: kpi.activos.toLocaleString("es-MX"), c: C.blue },
    { l: "Venta", v: formatear(kpi.venta, "venta"), c: C.amber },
    { l: "Costo", v: formatear(kpi.costo, "costo"), c: C.blue },
    { l: "Utilidad", v: formatear(kpi.util, "utilidad"), c: kpi.util < 0 ? C.red : C.green },
    { l: "Margen", v: `${kpi.margen.toFixed(1)}%`, c: "white" },
    { l: "Venta promedio por viaje", v: formatear(kpi.ticket, "ticket"), c: C.amber },
  ];

  const nombreDe = (lista: string, id: string) => listas[lista]?.find((o) => o.id === id)?.nombre;
  const subtitulo = [
    desde || hasta ? `Carga del ${desde || "inicio"} al ${hasta || "hoy"}` : "Todo el periodo",
    cliente && `Cliente: ${nombreDe("clientes", cliente)}`,
    proveedor && `Transportista: ${nombreDe("proveedores", proveedor)}`,
    conCancelados ? "Incluye cancelados" : "Sin cancelados",
    `${datos.length} viajes`,
  ].filter(Boolean).join(" · ");

  function mover(i: number, d: -1 | 1) {
    const ws = [...widgets];
    const j = i + d;
    if (j < 0 || j >= ws.length) return;
    [ws[i], ws[j]] = [ws[j], ws[i]];
    guardar(ws);
  }

  async function exportar(tipo: "pdf" | "excel") {
    setOcupado(tipo);
    try {
      if (tipo === "pdf" && tablero.current) {
        await exportarPDFElemento(tablero.current, "Métricas KTM", subtitulo, "Metricas_KTM");
      } else {
        const hojas = [
          { nombre: "Resumen", filas: [{ Filtros: subtitulo }, ...tarjetas.map((t) => ({ Filtros: t.l, Valor: t.v }))] },
          ...widgets.map((w) => ({
            nombre: w.titulo,
            filas: calcular(datos, w).map((f) => ({ [DIMENSIONES[w.dimension]]: f.nombre, ...Object.fromEntries(w.metricas.map((m) => [METRICAS[m].label, f[m]])) })),
          })),
          {
            nombre: "Datos",
            filas: datos.map((s) => ({
              "ID TRACK": s.id_track, Estatus: ESTATUS_INFO[s.estatus as Estatus]?.label || s.estatus, "Fecha carga": s.fecha_carga,
              Cliente: s.cliente, Transportista: s.proveedor || "", Operador: s.operador || "", Origen: s.origen || "", Destino: s.destino || "",
              Unidad: s.tipo_unidad || "", Carga: s.tipo_carga || "", Costo: Number(s.total_costo || 0), Venta: Number(s.total_venta || 0), Utilidad: Number(s.utilidad || 0),
            })),
          },
        ];
        await exportarExcel(hojas, "Metricas_KTM");
      }
    } finally {
      setOcupado("");
    }
  }

  return (
    <div>
      <Titulo accion={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn onClick={() => setEditando({ id: "", titulo: "", metricas: ["viajes"], dimension: "mes", tipo: "barras", top: 12, ancho: 1 })}>+ Nueva gráfica</Btn>
          <Btn variante="secundario" onClick={() => exportar("excel")} disabled={!!ocupado}>{ocupado === "excel" ? "Generando…" : "⬇ Excel"}</Btn>
          <Btn variante="secundario" onClick={() => exportar("pdf")} disabled={!!ocupado}>{ocupado === "pdf" ? "Generando…" : "⬇ PDF"}</Btn>
        </div>
      }>Métricas</Titulo>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, alignItems: "end" }}>
          <Campo label="Carga desde"><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Carga hasta"><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Cliente"><SelectBuscable value={cliente} onChange={setCliente} opciones={listas.clientes || []} placeholder="Todos" /></Campo>
          <Campo label="Transportista"><SelectBuscable value={proveedor} onChange={setProveedor} opciones={listas.proveedores || []} placeholder="Todos" /></Campo>
          <label style={{ color: C.text, fontSize: 13, display: "flex", gap: 6, alignItems: "center", paddingBottom: 8 }}>
            <input type="checkbox" checked={conCancelados} onChange={(e) => setConCancelados(e.target.checked)} /> Incluir cancelados
          </label>
          <Btn variante="secundario" onClick={() => { setDesde(""); setHasta(""); setCliente(""); setProveedor(""); setConCancelados(false); }}>Limpiar filtros</Btn>
        </div>
      </Card>

      <div ref={tablero} style={{ padding: 4 }}>
        <p style={{ color: C.muted, fontSize: 12, margin: "0 0 10px" }}>{subtitulo}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
          {tarjetas.map((t) => (
            <Card key={t.l} style={{ padding: "0.85rem 1rem" }}>
              <p style={{ margin: 0, color: C.muted, fontSize: 11 }}>{t.l}</p>
              <p style={{ margin: "4px 0 0", color: t.c, fontSize: 20, fontWeight: 700 }}>{t.v}</p>
            </Card>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 460px), 1fr))", gap: 14 }}>
          {widgets.map((w, i) => (
            <Card key={w.id} style={{ gridColumn: w.ancho === 2 ? "1 / -1" : undefined, padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
                <h3 style={{ color: "white", fontSize: 14, margin: 0 }}>{w.titulo}</h3>
                <div data-html2canvas-ignore style={{ display: "flex", gap: 4 }}>
                  {[["↑", () => mover(i, -1)], ["↓", () => mover(i, 1)], ["✎", () => setEditando(w)], ["🗑", () => confirm(`¿Quitar "${w.titulo}"?`) && guardar(widgets.filter((x) => x.id !== w.id))]].map(([t, f]) => (
                    <button key={t as string} onClick={f as () => void} style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.text, borderRadius: 6, cursor: "pointer", fontSize: 12, padding: "2px 7px" }}>{t as string}</button>
                  ))}
                </div>
              </div>
              <Grafica filas={calcular(datos, w)} metricas={w.metricas} tipo={w.tipo} />
            </Card>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14, textAlign: "right" }}>
        <Btn small variante="secundario" onClick={() => confirm("¿Volver al tablero original? Se quitan las gráficas que hayas creado.") && guardar(WIDGETS_INICIALES)}>Restablecer tablero</Btn>
      </div>

      {editando && (
        <Constructor inicial={editando} datos={datos} onClose={() => setEditando(null)}
          onGuardar={(w) => { guardar(w.id ? widgets.map((x) => (x.id === w.id ? w : x)) : [...widgets, { ...w, id: nuevoId() }]); setEditando(null); }} />
      )}
    </div>
  );
}

function Constructor({ inicial, datos, onClose, onGuardar }: { inicial: Widget; datos: ServM[]; onClose: () => void; onGuardar: (w: Widget) => void }) {
  const [w, setW] = useState<Widget>(inicial);
  const set = <K extends keyof Widget>(k: K, v: Widget[K]) => setW((x) => ({ ...x, [k]: v }));
  const tituloAuto = `${w.metricas.map((m) => METRICAS[m].label).join(" y ")} por ${DIMENSIONES[w.dimension].toLowerCase()}`;

  function toggleMetrica(m: Metrica) {
    const tiene = w.metricas.includes(m);
    const nuevas = tiene ? w.metricas.filter((x) => x !== m) : [...w.metricas, m];
    if (!nuevas.length) return;
    set("metricas", w.tipo === "pastel" ? [m] : nuevas);
  }

  return (
    <Modal titulo={inicial.id ? "Editar gráfica" : "Nueva gráfica"} onClose={onClose} ancho={880}>
      <Grid>
        <Campo label="¿Qué quieres medir?" span={2}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(Object.keys(METRICAS) as Metrica[]).map((m) => (
              <button key={m} type="button" onClick={() => toggleMetrica(m)}
                style={{ padding: "0.35rem 0.7rem", borderRadius: 999, fontSize: 12, cursor: "pointer", fontWeight: 600,
                  border: `1px solid ${w.metricas.includes(m) ? C.amber : "rgba(255,255,255,.15)"}`, background: w.metricas.includes(m) ? "rgba(245,166,35,.15)" : C.input, color: w.metricas.includes(m) ? C.amber : C.muted }}>
                {METRICAS[m].label}
              </button>
            ))}
          </div>
        </Campo>
        <Campo label="Agrupado por">
          <select value={w.dimension} onChange={(e) => { const d = e.target.value as Dimension; setW((x) => ({ ...x, dimension: d, top: DIM_TIEMPO.includes(d) ? 12 : 10 })); }} style={inputStyle}>
            {(Object.keys(DIMENSIONES) as Dimension[]).map((d) => <option key={d} value={d}>{DIMENSIONES[d]}</option>)}
          </select>
        </Campo>
        <Campo label="Tipo de gráfica">
          <select value={w.tipo} onChange={(e) => { const t = e.target.value as TipoGrafica; setW((x) => ({ ...x, tipo: t, metricas: t === "pastel" ? [x.metricas[0]] : x.metricas })); }} style={inputStyle}>
            {(Object.keys(TIPOS) as TipoGrafica[]).map((t) => <option key={t} value={t}>{TIPOS[t]}</option>)}
          </select>
        </Campo>
        <Campo label={DIM_TIEMPO.includes(w.dimension) ? "Últimos periodos a mostrar (0 = todos)" : "Mostrar los primeros (0 = todos)"}>
          <input type="number" min={0} value={w.top} onChange={(e) => set("top", Math.max(0, Number(e.target.value)))} style={inputStyle} />
        </Campo>
        <Campo label="Tamaño">
          <select value={w.ancho} onChange={(e) => set("ancho", Number(e.target.value) as 1 | 2)} style={inputStyle}>
            <option value={1}>Mitad del ancho</option>
            <option value={2}>Ancho completo</option>
          </select>
        </Campo>
        <Campo label="Título" span={2}>
          <input value={w.titulo} placeholder={tituloAuto} onChange={(e) => set("titulo", e.target.value)} style={inputStyle} />
        </Campo>
      </Grid>
      {w.tipo === "pastel" && <p style={{ color: C.muted, fontSize: 12 }}>La gráfica de pastel muestra una sola medida.</p>}
      <div style={{ marginTop: 14, background: C.bg, borderRadius: 10, padding: 12 }}>
        <p style={{ color: C.muted, fontSize: 11, margin: "0 0 6px" }}>Vista previa con los filtros actuales</p>
        <Grafica filas={calcular(datos, w)} metricas={w.metricas} tipo={w.tipo} alto={240} />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <Btn onClick={() => onGuardar({ ...w, titulo: w.titulo.trim() || tituloAuto })} style={{ flex: 1 }}>{inicial.id ? "Guardar cambios" : "Agregar al tablero"}</Btn>
        <Btn variante="secundario" onClick={onClose} style={{ flex: 1 }}>Cancelar</Btn>
      </div>
    </Modal>
  );
}
