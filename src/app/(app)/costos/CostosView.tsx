"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FACTURACION_NOMBRE, FACTURACION_WHATSAPP } from "@/lib/constants";
import { fecha, money, pct } from "@/lib/format";
import { linkWhatsApp, msgFacturar } from "@/lib/whatsapp";
import type { ServicioV } from "@/components/ServicioDetalle";
import { Btn, Buscador, C, Campo, Card, EstatusBadge, Grid, Modal, Seccion, Tabla, Td, Titulo, Tr, inputStyle } from "@/components/ui";

const CONCEPTOS = [
  { k: "flete", label: "Transporte (flete)" },
  { k: "maniobra", label: "Maniobras" },
  { k: "estadias", label: "Estadías" },
  { k: "seguro", label: "Seguro" },
] as const;

const FACT: Record<string, { label: string; color: string }> = {
  por_facturar: { label: "Por facturar", color: "#F87171" },
  enviado: { label: "Enviado a facturar", color: "#F5A623" },
  facturado: { label: "Facturado", color: "#22C55E" },
};

type Form = Record<string, string>;

export default function CostosView({ servicios: ini }: { servicios: ServicioV[] }) {
  const [servicios, setServicios] = useState(ini);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [sel, setSel] = useState<ServicioV | null>(null);
  const [form, setForm] = useState<Form>({});
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(false);
  const [telFact, setTelFact] = useState(FACTURACION_WHATSAPP);
  const [nomFact, setNomFact] = useState(FACTURACION_NOMBRE);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTelFact(localStorage.getItem("ktm_fact_tel") || FACTURACION_WHATSAPP);
      setNomFact(localStorage.getItem("ktm_fact_nombre") || FACTURACION_NOMBRE);
    } catch {}
  }, []);

  const filtrados = useMemo(() => servicios.filter((s) => {
    if (filtro !== "todos" && (s.estatus_facturacion || "por_facturar") !== filtro) return false;
    const q = busqueda.toLowerCase();
    return [s.id_track, s.cliente, s.proveedor, s.factura_kayard, s.factura_proveedor].some((v) => (v || "").toLowerCase().includes(q));
  }), [servicios, busqueda, filtro]);

  const tot = useMemo(() => filtrados.reduce((a, s) => ({
    costo: a.costo + Number(s.total_costo || 0), venta: a.venta + Number(s.total_venta || 0), util: a.util + Number(s.utilidad || 0),
  }), { costo: 0, venta: 0, util: 0 }), [filtrados]);

  function abrir(s: ServicioV) {
    setSel(s);
    setAviso("");
    const f: Form = {};
    CONCEPTOS.forEach(({ k }) => { f[`costo_${k}`] = String(s[`costo_${k}`] ?? 0); f[`venta_${k}`] = String(s[`venta_${k}`] ?? 0); });
    f.factura_kayard = s.factura_kayard || "";
    f.factura_proveedor = s.factura_proveedor || "";
    f.estatus_pago = s.estatus_pago || "pendiente";
    f.estatus_facturacion = s.estatus_facturacion || "por_facturar";
    setForm(f);
  }

  async function traerTarifas() {
    if (!sel) return;
    const { data, error } = await supabase.rpc("tarifas_para_servicio", { p_servicio: sel.id });
    const t = Array.isArray(data) ? data[0] : data;
    if (error || !t) return setAviso("No se pudieron consultar las tarifas.");
    const f = { ...form };
    if (t.tiene_compra) CONCEPTOS.forEach(({ k }) => (f[`costo_${k}`] = String(t[`costo_${k}`] ?? 0)));
    if (t.tiene_venta) CONCEPTOS.forEach(({ k }) => (f[`venta_${k}`] = String(t[`venta_${k}`] ?? 0)));
    setForm(f);
    setAviso([
      t.tiene_compra ? "✔ Tarifa de compra encontrada" : "✖ No hay tarifa de compra para este transportista/ruta/unidad/carga",
      t.tiene_venta ? "✔ Tarifa de venta encontrada" : "✖ No hay tarifa de venta para este cliente/ruta/unidad/carga",
    ].join(" · "));
  }

  async function guardar(e?: React.FormEvent, extra: Record<string, unknown> = {}) {
    e?.preventDefault();
    if (!sel) return null;
    setLoading(true);
    const datos: Record<string, unknown> = { servicio_id: sel.id, updated_at: new Date().toISOString(), ...extra };
    Object.entries(form).forEach(([k, v]) => (datos[k] = k.startsWith("costo_") || k.startsWith("venta_") ? Number(v || 0) : v || null));
    Object.assign(datos, extra);
    const { error } = await supabase.from("costos_venta").upsert(datos);
    if (error) { setLoading(false); setAviso(error.message); return null; }
    const { data: fila } = await supabase.from("v_servicios").select("*").eq("id", sel.id).single();
    setLoading(false);
    if (fila) setServicios(servicios.map((s) => (s.id === fila.id ? fila : s)));
    router.refresh();
    return fila as ServicioV | null;
  }

  async function mandarFacturar() {
    if (!telFact) {
      const t = prompt("WhatsApp de quien factura (10 dígitos):", "") || "";
      const n = prompt("Nombre de quien factura:", "") || "";
      if (!t) return;
      try { localStorage.setItem("ktm_fact_tel", t); localStorage.setItem("ktm_fact_nombre", n); } catch {}
      setTelFact(t); setNomFact(n);
      return;
    }
    const ventana = window.open("about:blank", "_blank");
    const fila = await guardar(undefined, { estatus_facturacion: "enviado", enviado_facturar_at: new Date().toISOString() });
    if (fila && ventana) ventana.location.href = linkWhatsApp(telFact, msgFacturar(fila, nomFact));
    else ventana?.close();
    setSel(null);
  }

  const num = (k: string) => Number(form[k] || 0);

  return (
    <div>
      <Titulo>Costos y venta</Titulo>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Card><p style={{ margin: 0, color: C.muted, fontSize: 12 }}>Venta</p><p style={{ margin: 0, color: C.amber, fontSize: 22, fontWeight: 700 }}>{money(tot.venta)}</p></Card>
        <Card><p style={{ margin: 0, color: C.muted, fontSize: 12 }}>Costo</p><p style={{ margin: 0, color: C.blue, fontSize: 22, fontWeight: 700 }}>{money(tot.costo)}</p></Card>
        <Card><p style={{ margin: 0, color: C.muted, fontSize: 12 }}>Utilidad</p><p style={{ margin: 0, color: tot.util >= 0 ? C.green : C.red, fontSize: 22, fontWeight: 700 }}>{money(tot.util)}</p></Card>
        <Card><p style={{ margin: 0, color: C.muted, fontSize: 12 }}>Margen</p><p style={{ margin: 0, color: "white", fontSize: 22, fontWeight: 700 }}>{tot.venta ? pct((tot.util / tot.venta) * 100) : "—"}</p></Card>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar ID TRACK, cliente, transportista, factura…" />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ ...inputStyle, maxWidth: 220, backgroundColor: C.card }}>
          <option value="todos">Todos</option>
          {Object.entries(FACT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <Tabla columnas={["ID TRACK", "Fecha", "Cliente", "Transportista", "Ruta", "Estatus", "Costo", "Venta", "Utilidad", "Margen", "Facturación", "Pago proveedor"]}>
        {filtrados.map((s, i) => (
          <Tr key={s.id} i={i} onClick={() => abrir(s)}>
            <Td fuerte>{s.id_track}</Td>
            <Td>{fecha(s.fecha_carga)}</Td>
            <Td>{s.cliente}</Td>
            <Td>{s.proveedor}</Td>
            <Td>{s.origen} → {s.destino}</Td>
            <Td><EstatusBadge estatus={s.estatus} /></Td>
            <Td>{money(s.total_costo)}</Td>
            <Td>{money(s.total_venta)}</Td>
            <Td style={{ color: Number(s.utilidad) < 0 ? C.red : C.green, fontWeight: 600 }}>{money(s.utilidad)}</Td>
            <Td>{pct(s.margen_pct)}</Td>
            <Td><span style={{ color: FACT[s.estatus_facturacion || "por_facturar"]?.color, fontWeight: 600, fontSize: 12 }}>{FACT[s.estatus_facturacion || "por_facturar"]?.label}</span></Td>
            <Td>{s.estatus_pago === "pagado" ? "Pagado" : "Pendiente"}</Td>
          </Tr>
        ))}
      </Tabla>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{filtrados.length} servicios · los costos y ventas se llenan solos desde las tarifas al asignar el transporte</p>

      {sel && (
        <Modal titulo={`Costos y venta · ${sel.id_track}`} onClose={() => setSel(null)} ancho={760}>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 0 }}>{sel.cliente} · {sel.proveedor} · {sel.origen} → {sel.destino} · {sel.tipo_unidad} / {sel.tipo_carga}</p>
          <form onSubmit={guardar}>
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr 0.8fr", gap: 8, alignItems: "center", fontSize: 13 }}>
              {["Concepto", "Costo", "Venta", "Utilidad", "Margen"].map((h) => <b key={h} style={{ color: C.amber }}>{h}</b>)}
              {CONCEPTOS.map(({ k, label }) => {
                const u = num(`venta_${k}`) - num(`costo_${k}`);
                return [
                  <span key={k + "l"} style={{ color: "white" }}>{label}</span>,
                  <input key={k + "c"} type="number" step="0.01" value={form[`costo_${k}`]} onChange={(e) => setForm({ ...form, [`costo_${k}`]: e.target.value })} style={inputStyle} />,
                  <input key={k + "v"} type="number" step="0.01" value={form[`venta_${k}`]} onChange={(e) => setForm({ ...form, [`venta_${k}`]: e.target.value })} style={inputStyle} />,
                  <span key={k + "u"} style={{ color: u < 0 ? C.red : C.green }}>{money(u)}</span>,
                  <span key={k + "m"} style={{ color: C.text }}>{num(`venta_${k}`) ? pct((u / num(`venta_${k}`)) * 100) : "—"}</span>,
                ];
              })}
              {(() => {
                const tc = CONCEPTOS.reduce((a, { k }) => a + num(`costo_${k}`), 0);
                const tv = CONCEPTOS.reduce((a, { k }) => a + num(`venta_${k}`), 0);
                return [
                  <b key="t" style={{ color: "white" }}>Total</b>, <b key="tc" style={{ color: "white" }}>{money(tc)}</b>, <b key="tv" style={{ color: "white" }}>{money(tv)}</b>,
                  <b key="tu" style={{ color: tv - tc < 0 ? C.red : C.green }}>{money(tv - tc)}</b>, <b key="tm" style={{ color: "white" }}>{tv ? pct(((tv - tc) / tv) * 100) : "—"}</b>,
                ];
              })()}
            </div>
            <div style={{ marginTop: 10 }}><Btn small variante="secundario" onClick={traerTarifas}>↻ Volver a traer de tarifas</Btn></div>
            {aviso && <p style={{ fontSize: 12, color: C.text }}>{aviso}</p>}
            <div style={{ marginTop: 12 }}>
              <Grid>
                <Seccion titulo="Facturación" />
                <Campo label="Factura Kayard (al cliente)"><input value={form.factura_kayard} onChange={(e) => setForm({ ...form, factura_kayard: e.target.value })} style={inputStyle} /></Campo>
                <Campo label="Factura del proveedor"><input value={form.factura_proveedor} onChange={(e) => setForm({ ...form, factura_proveedor: e.target.value })} style={inputStyle} /></Campo>
                <Campo label="Estatus facturación">
                  <select value={form.estatus_facturacion} onChange={(e) => setForm({ ...form, estatus_facturacion: e.target.value })} style={inputStyle}>
                    {Object.entries(FACT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </Campo>
                <Campo label="Pago al proveedor">
                  <select value={form.estatus_pago} onChange={(e) => setForm({ ...form, estatus_pago: e.target.value })} style={inputStyle}>
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                  </select>
                </Campo>
              </Grid>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <Btn type="submit" disabled={loading} style={{ flex: 1 }}>{loading ? "Guardando…" : "Guardar"}</Btn>
              <Btn variante="verde" onClick={mandarFacturar} disabled={loading} style={{ flex: 1 }}>{telFact ? `Mandar a facturar${nomFact ? ` (${nomFact})` : ""}` : "Configurar WhatsApp de facturación"}</Btn>
            </div>
            {telFact && <p style={{ fontSize: 11, color: C.muted }}>Facturación: {telFact} · <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => { try { localStorage.removeItem("ktm_fact_tel"); } catch {} setTelFact(""); }}>cambiar</span></p>}
          </form>
        </Modal>
      )}
    </div>
  );
}
