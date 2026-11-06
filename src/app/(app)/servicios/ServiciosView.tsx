"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ESTATUS, ESTATUS_INFO, REQ_OPCIONES } from "@/lib/constants";
import { fecha } from "@/lib/format";
import { linkWhatsApp, msgCliente } from "@/lib/whatsapp";
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

export default function ServiciosView({ servicios: ini, listas }: { servicios: ServicioV[]; listas: Record<string, Opcion[]> }) {
  const [servicios, setServicios] = useState(ini);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<string>("activos");
  const [form, setForm] = useState(VACIO);
  const [editando, setEditando] = useState<ServicioV | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [detalle, setDetalle] = useState<ServicioV | null>(null);
  const [recienCreado, setRecienCreado] = useState<ServicioV | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return servicios.filter((s) => {
      if (filtro === "activos" && ["finalizado", "cancelado"].includes(s.estatus)) return false;
      if (filtro !== "activos" && filtro !== "todos" && s.estatus !== filtro) return false;
      return [s.id_track, s.cliente, s.origen, s.destino, s.proveedor, s.operador].some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [servicios, busqueda, filtro]);

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
    <select required={requerido} value={form[k]} onChange={set(k)} style={inputStyle}>
      <option value="">Selecciona…</option>
      {(listas[lista] || []).map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
    </select>
  );

  return (
    <div>
      <Titulo accion={<Btn onClick={() => abrir(null)}>+ Nuevo servicio</Btn>}>Servicios</Titulo>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar ID TRACK, cliente, origen, destino…" />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ ...inputStyle, maxWidth: 220, backgroundColor: C.card }}>
          <option value="activos">Activos</option>
          <option value="todos">Todos</option>
          {ESTATUS.map((e) => <option key={e} value={e}>{ESTATUS_INFO[e].label}</option>)}
        </select>
      </div>

      <Tabla columnas={["ID TRACK", "Estatus", "Cliente", "Unidad", "Origen", "Fecha carga", "Destino", "Fecha descarga", "Transporte"]}>
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
          </Tr>
        ))}
      </Tabla>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{filtrados.length} servicios</p>

      {detalle && (
        <ServicioDetalle s={detalle} onClose={() => setDetalle(null)} acciones={
          <>
            {["programado", "asignado"].includes(detalle.estatus) && <Btn small href={`/asignar?id=${detalle.id}`}>{detalle.proveedor ? "Cambiar transporte" : "Asignar transporte"}</Btn>}
            {!["finalizado", "cancelado"].includes(detalle.estatus) && <Btn small variante="secundario" onClick={() => abrir(detalle)}>Editar</Btn>}
            {!["finalizado", "cancelado"].includes(detalle.estatus) && <Btn small variante="peligro" onClick={() => cancelar(detalle)}>Cancelar servicio</Btn>}
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
