"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ESTATUS, ESTATUS_INFO, REQ_OPCIONES } from "@/lib/constants";
import { fecha } from "@/lib/format";
import { linkWhatsApp, msgCliente } from "@/lib/whatsapp";
import SelectBuscable from "@/components/SelectBuscable";
import { programaExcel, programaPDF } from "@/lib/programa";
import EnVivo from "@/components/EnVivo";
import ServicioDetalle, { type ServicioV } from "@/components/ServicioDetalle";
import { Btn, Buscador, C, Campo, EstatusBadge, Grid, Modal, Seccion, Tabla, Td, Titulo, Tr, inputStyle } from "@/components/ui";

type Opcion = { id: string; nombre: string };

const VACIO = {
  cliente_id: "", tipo_unidad_id: "", tipo_carga_id: "", costo_mercancia: "",
  origen_id: "", fecha_carga: "", destino_id: "", fecha_descarga: "",
  cliente_carga_id: "", cita_carga: "", cliente_descarga_id: "", cita_descarga: "",
  req_fumigacion: "N/A", req_gps: "N/A", req_cuenta_espejo: "N/A", req_poliza_seguro: "N/A", req_sua: "N/A",
  comentarios: "",
};

export default function ServiciosView({ servicios: ini, listas, esAdmin = false }: { servicios: ServicioV[]; listas: Record<string, Opcion[]>; esAdmin?: boolean }) {
  const [servicios, setServicios] = useState(ini);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<string>("activos");
  const [fCliente, setFCliente] = useState("");
  const [fProveedor, setFProveedor] = useState("");
  const [fTrack, setFTrack] = useState("");
  const [fDesde, setFDesde] = useState("");
  const [fHasta, setFHasta] = useState("");
  const [exportando, setExportando] = useState("");
  const [form, setForm] = useState(VACIO);
  const [editando, setEditando] = useState<ServicioV | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [detalle, setDetalle] = useState<ServicioV | null>(null);
  const [recienCreado, setRecienCreado] = useState<ServicioV | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setServicios(ini);
    setDetalle((d) => (d ? ini.find((x) => x.id === d.id) || d : d));
  }, [ini]);
  const supabase = createClient();

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return servicios.filter((s) => {
      if (filtro === "activos" && ["finalizado", "cancelado"].includes(s.estatus)) return false;
      if (filtro !== "activos" && filtro !== "todos" && s.estatus !== filtro) return false;
      if (fCliente && s.cliente_id !== fCliente) return false;
      if (fProveedor && s.proveedor_id !== fProveedor) return false;
      if (fTrack && !s.id_track.toLowerCase().includes(fTrack.toLowerCase().trim())) return false;
      if (fDesde && (!s.fecha_carga || s.fecha_carga < fDesde)) return false;
      if (fHasta && (!s.fecha_carga || s.fecha_carga > fHasta)) return false;
      return [s.id_track, s.cliente, s.origen, s.destino, s.proveedor, s.operador].some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [servicios, busqueda, filtro, fCliente, fProveedor, fTrack, fDesde, fHasta]);

  const nombreDe = (lista: string, id: string) => listas[lista]?.find((o) => o.id === id)?.nombre || "";
  const subtituloPrograma = [
    fProveedor && `Transportista: ${nombreDe("proveedores", fProveedor)}`,
    fCliente && `Cliente: ${nombreDe("clientes", fCliente)}`,
    fDesde || fHasta ? `Carga del ${fDesde ? fecha(fDesde) : "inicio"} al ${fHasta ? fecha(fHasta) : "—"}` : "",
    fTrack && `ID TRACK: ${fTrack}`,
    filtro === "activos" ? "Servicios activos" : filtro === "todos" ? "Todos los estatus" : ESTATUS_INFO[filtro as keyof typeof ESTATUS_INFO]?.label,
    `${filtrados.length} servicios`,
  ].filter(Boolean).join(" · ");
  const hayFiltros = !!(fCliente || fProveedor || fTrack || fDesde || fHasta || busqueda);

  async function exportarPrograma(tipo: "pdf" | "excel") {
    const lista = [...filtrados].sort((a, b) => `${a.fecha_carga || ""}${a.cita_carga || ""}`.localeCompare(`${b.fecha_carga || ""}${b.cita_carga || ""}`));
    setExportando(tipo);
    try {
      if (tipo === "pdf") await programaPDF(lista, subtituloPrograma);
      else await programaExcel(lista);
    } finally {
      setExportando("");
    }
  }

  function abrir(s: ServicioV | null) {
    setEditando(s);
    setError("");
    setForm(s ? Object.fromEntries(Object.keys(VACIO).map((k) => [k, s[k] == null ? "" : String(s[k]).slice(0, k.startsWith("cita") ? 5 : undefined)])) as typeof VACIO : VACIO);
    setDetalle(null);
    setAbierto(true);
  }

  const set = (k: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const datos = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === "" ? null : k === "costo_mercancia" ? Number(v) : v]));
    const q = editando
      ? supabase.from("servicios").update(datos).eq("id", editando.id).select("id").single()
      : supabase.from("servicios").insert(datos).select("id").single();
    const { data, error } = await q;
    if (error || !data) {
      setLoading(false);
      setError(error?.message || "No se pudo guardar");
      return;
    }
    const { data: fila } = await supabase.from("v_servicios").select("*").eq("id", data.id).single();
    setLoading(false);
    setAbierto(false);
    if (fila) {
      setServicios(editando ? servicios.map((s) => (s.id === fila.id ? fila : s)) : [fila, ...servicios]);
      if (!editando) setRecienCreado(fila);
    }
    router.refresh();
  }

  async function cancelar(s: ServicioV) {
    if (!confirm(`¿Cancelar el servicio ${s.id_track}?`)) return;
    const { error } = await supabase.from("servicios").update({ estatus: "cancelado" }).eq("id", s.id);
    if (!error) {
      setServicios(servicios.map((x) => (x.id === s.id ? { ...x, estatus: "cancelado" } : x)));
      setDetalle(null);
    }
  }

  const sel = (k: keyof typeof VACIO, lista: string, requerido = false) => (
    <SelectBuscable requerido={requerido} value={form[k]} opciones={listas[lista] || []} onChange={(id) => setForm((f) => ({ ...f, [k]: id }))} />
  );

  return (
    <div>
      <Titulo accion={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variante="secundario" onClick={() => exportarPrograma("pdf")} disabled={!!exportando || !filtrados.length}>{exportando === "pdf" ? "Generando…" : "⬇ Programa PDF"}</Btn>
          <Btn variante="secundario" onClick={() => exportarPrograma("excel")} disabled={!!exportando || !filtrados.length}>{exportando === "excel" ? "Generando…" : "⬇ Excel"}</Btn>
          <Btn onClick={() => abrir(null)}>+ Nuevo servicio</Btn>
          <EnVivo />
        </div>
      }>Servicios</Titulo>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, alignItems: "end", background: C.card, borderRadius: 12, padding: "0.85rem", marginBottom: 12 }}>
        <Campo label="Transportista"><SelectBuscable value={fProveedor} onChange={setFProveedor} opciones={listas.proveedores || []} placeholder="Todos" /></Campo>
        <Campo label="Cliente"><SelectBuscable value={fCliente} onChange={setFCliente} opciones={listas.clientes || []} placeholder="Todos" /></Campo>
        <Campo label="ID TRACK"><input value={fTrack} onChange={(e) => setFTrack(e.target.value)} placeholder="KTL0593" style={inputStyle} /></Campo>
        <Campo label="Carga desde"><input type="date" value={fDesde} onChange={(e) => setFDesde(e.target.value)} style={inputStyle} /></Campo>
        <Campo label="Carga hasta"><input type="date" value={fHasta} onChange={(e) => setFHasta(e.target.value)} style={inputStyle} /></Campo>
        <Campo label="Estatus">
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={inputStyle}>
            <option value="activos">Activos</option>
            <option value="todos">Todos</option>
            {ESTATUS.map((e) => <option key={e} value={e}>{ESTATUS_INFO[e].label}</option>)}
          </select>
        </Campo>
        {hayFiltros && <Btn variante="secundario" onClick={() => { setFCliente(""); setFProveedor(""); setFTrack(""); setFDesde(""); setFHasta(""); setBusqueda(""); }}>Limpiar filtros</Btn>}
      </div>
      <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar también por origen, destino, operador…" />

      <Tabla columnas={["ID TRACK", "Estatus", "Cliente", "Unidad", "Origen", "Fecha carga", "Destino", "Fecha descarga", "Transporte", "Facturación"]}>
        {filtrados.map((s, i) => (
          <Tr key={s.id} i={i} onClick={() => setDetalle(s)}>
            <Td fuerte>{s.id_track}</Td>
            <Td><EstatusBadge estatus={s.estatus} /></Td>
            <Td>{s.cliente}</Td>
            <Td>{s.tipo_unidad || "—"}</Td>
            <Td>{s.origen || "—"}</Td>
            <Td>{fecha(s.fecha_carga)}</Td>
            <Td>{s.destino || "—"}</Td>
            <Td>{fecha(s.fecha_descarga)}</Td>
            <Td>{s.proveedor || <span style={{ color: C.muted }}>Sin asignar</span>}</Td>
            <Td>{s.estatus_facturacion === "facturado" ? <span style={{ color: C.green, fontWeight: 700, fontSize: 12 }}>FACTURADO</span> : s.estatus === "finalizado" ? <span style={{ color: "#F87171", fontSize: 12 }}>Por facturar</span> : "—"}</Td>
          </Tr>
        ))}
      </Tabla>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{filtrados.length} servicios</p>

      {detalle && (
        <ServicioDetalle s={detalle} esAdmin={esAdmin} onCambio={() => router.refresh()} onClose={() => setDetalle(null)} acciones={
          <>
            {(esAdmin || ["programado", "asignado"].includes(detalle.estatus)) && <Btn small href={`/asignar?id=${detalle.id}`}>{detalle.proveedor ? (esAdmin ? "Editar transporte" : "Cambiar transporte") : "Asignar transporte"}</Btn>}
            {(esAdmin || !["finalizado", "cancelado"].includes(detalle.estatus)) && <Btn small variante="secundario" onClick={() => abrir(detalle)}>Editar datos</Btn>}
            {detalle.estatus !== "cancelado" && (esAdmin || detalle.estatus !== "finalizado") && <Btn small variante="peligro" onClick={() => cancelar(detalle)}>Cancelar servicio</Btn>}
          </>
        } />
      )}

      {recienCreado && (
        <Modal titulo="Servicio registrado" onClose={() => setRecienCreado(null)} ancho={460}>
          <p style={{ color: C.text, marginTop: 0 }}>Se generó el ID TRACK <b style={{ color: C.amber, fontSize: 18 }}>{recienCreado.id_track}</b> con estatus <EstatusBadge estatus="programado" />.</p>
          <p style={{ color: C.muted, fontSize: 13 }}>Mándale la confirmación al cliente:</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn variante="verde" href={linkWhatsApp(recienCreado.cliente_telefono, msgCliente(recienCreado))} target="_blank">Enviar por WhatsApp al cliente</Btn>
            <Btn href={`/asignar?id=${recienCreado.id}`}>Asignar transporte</Btn>
          </div>
          {!recienCreado.cliente_telefono && <p style={{ color: C.red, fontSize: 12 }}>El cliente no tiene teléfono de contacto; WhatsApp te pedirá elegir el chat.</p>}
        </Modal>
      )}

      {abierto && (
        <Modal titulo={editando ? `Editar servicio ${editando.id_track}` : "Agregar nuevo servicio"} onClose={() => setAbierto(false)} ancho={860}>
          <form onSubmit={guardar}>
            <Grid cols={3}>
              <Seccion titulo="Datos generales" />
              <Campo label="Cliente *">{sel("cliente_id", "clientes", true)}</Campo>
              <Campo label="Tipo de unidad *">{sel("tipo_unidad_id", "tipos_unidad", true)}</Campo>
              <Campo label="Tipo de carga *">{sel("tipo_carga_id", "tipos_carga", true)}</Campo>
              <Campo label="Costo de mercancía"><input type="number" step="0.01" min="0" value={form.costo_mercancia} onChange={set("costo_mercancia")} style={inputStyle} /></Campo>
              <Campo label="Origen de carga *">{sel("origen_id", "poblaciones", true)}</Campo>
              <Campo label="Fecha de carga *"><input type="date" required value={form.fecha_carga} onChange={set("fecha_carga")} style={inputStyle} /></Campo>
              <Campo label="Destino de descarga *">{sel("destino_id", "poblaciones", true)}</Campo>
              <Campo label="Fecha de descarga"><input type="date" value={form.fecha_descarga} onChange={set("fecha_descarga")} style={inputStyle} /></Campo>

              <Seccion titulo="Datos de carga" />
              <Campo label="Cliente de carga">{sel("cliente_carga_id", "clientes_cd")}</Campo>
              <Campo label="Cita de carga"><input type="time" value={form.cita_carga} onChange={set("cita_carga")} style={inputStyle} /></Campo>

              <Seccion titulo="Datos de descarga" />
              <Campo label="Cliente de descarga">{sel("cliente_descarga_id", "clientes_cd")}</Campo>
              <Campo label="Cita de descarga"><input type="time" value={form.cita_descarga} onChange={set("cita_descarga")} style={inputStyle} /></Campo>

              <Seccion titulo="Requerimientos del cliente" />
              {([["req_fumigacion", "Fumigación"], ["req_gps", "GPS"], ["req_cuenta_espejo", "Cuenta espejo"], ["req_poliza_seguro", "Póliza de seguro"], ["req_sua", "SUA"]] as const).map(([k, l]) => (
                <Campo key={k} label={l}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {REQ_OPCIONES.map((o) => (
                      <button type="button" key={o} onClick={() => setForm({ ...form, [k]: o })}
                        style={{ flex: 1, padding: "0.45rem 0", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
                          border: `1px solid ${form[k] === o ? C.amber : "rgba(255,255,255,.15)"}`, background: form[k] === o ? "rgba(245,166,35,.15)" : C.input, color: form[k] === o ? C.amber : C.muted }}>
                        {o}
                      </button>
                    ))}
                  </div>
                </Campo>
              ))}
              <Campo label="Comentarios" span={3}><textarea value={form.comentarios} onChange={set("comentarios")} rows={2} style={{ ...inputStyle, resize: "vertical" }} /></Campo>
            </Grid>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>
              ¿No está el cliente de carga/descarga o la población? Agrégalo en <a href="/puntos" target="_blank" style={{ color: C.blue }}>Clientes carga/descarga</a> o <a href="/catalogos" target="_blank" style={{ color: C.blue }}>Catálogos</a>.
            </p>
            {error && <p style={{ color: C.red, fontSize: 13 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <Btn type="submit" disabled={loading} style={{ flex: 1 }}>{loading ? "Guardando…" : "Guardar servicio"}</Btn>
              <Btn variante="secundario" onClick={() => setAbierto(false)} style={{ flex: 1 }}>Cancelar</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
