"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fecha, hora } from "@/lib/format";
import { linkWhatsApp, msgOperador, msgProveedor } from "@/lib/whatsapp";
import SelectBuscable from "@/components/SelectBuscable";
import { linkOperador, type ServicioV } from "@/components/ServicioDetalle";
import { AvisoBloqueo, EtiquetaBloqueo } from "@/components/BloqueoCliente";
import type { ClienteBloqueado } from "@/lib/bloqueos";
import { Btn, C, Campo, Card, Dato, EstatusBadge, Grid, Modal, Seccion, Tabla, Td, Titulo, Tr, inputStyle } from "@/components/ui";

type Proveedor = { id: string; nombre: string; contacto_nombre?: string; contacto_telefono?: string };
type Operador = { id: string; nombre: string; telefono?: string; folio_licencia?: string; proveedor_id?: string };

const VACIO = { proveedor_id: "", operador_id: "", placas_unidad: "", economico_unidad: "", placas_caja: "", economico_caja: "", folio_licencia: "" };

export default function AsignarView({ servicios: ini, proveedores, operadores, seleccionadoId, bloqueados = [] }: {
  servicios: ServicioV[]; proveedores: Proveedor[]; operadores: Operador[]; seleccionadoId?: string;
  bloqueados?: ClienteBloqueado[];
}) {
  const bloqueoDe = (id: string | null | undefined) => bloqueados.find((b) => b.id === id) || null;
  const [servicios, setServicios] = useState(ini);
  const [provs, setProvs] = useState(proveedores);
  const [opers, setOpers] = useState(operadores);
  // Alta rápida desde el propio buscador: "proveedor" u "operador", con lo que se alcanzó a escribir
  const [alta, setAlta] = useState<{ tipo: "proveedor" | "operador"; nombre: string; telefono: string; contacto: string; folio: string } | null>(null);
  const [guardandoAlta, setGuardandoAlta] = useState(false);
  const [errorAlta, setErrorAlta] = useState("");
  const inicial = ini.find((s) => s.id === seleccionadoId) || null;
  const [sel, setSel] = useState<ServicioV | null>(inicial);
  const bloqueoSel = bloqueoDe(sel?.cliente_id);
  const [form, setForm] = useState(inicial ? cargar(inicial) : VACIO);
  const [listo, setListo] = useState<ServicioV | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  function cargar(s: ServicioV) {
    return Object.fromEntries(Object.keys(VACIO).map((k) => [k, s[k] ?? ""])) as typeof VACIO;
  }

  function elegir(s: ServicioV) {
    setSel(s);
    setForm(cargar(s));
    setError("");
  }

  const opsProveedor = useMemo(() => opers.filter((o) => !form.proveedor_id || o.proveedor_id === form.proveedor_id), [opers, form.proveedor_id]);

  const abrirAlta = (tipo: "proveedor" | "operador", nombre: string) => {
    setErrorAlta("");
    setAlta({ tipo, nombre, telefono: "", contacto: "", folio: "" });
  };

  // Da de alta la línea o el operador y lo deja seleccionado en el formulario
  async function guardarAlta(e: React.FormEvent) {
    e.preventDefault();
    if (!alta || !alta.nombre.trim()) return;
    setGuardandoAlta(true);
    setErrorAlta("");
    if (alta.tipo === "proveedor") {
      const { data, error } = await supabase.from("proveedores")
        .insert({ nombre: alta.nombre.trim(), contacto_nombre: alta.contacto.trim() || null, contacto_telefono: alta.telefono.trim() || null, activo: true })
        .select("id, nombre").single();
      setGuardandoAlta(false);
      if (error || !data) { setErrorAlta(error?.message || "No se pudo guardar"); return; }
      setProvs((p) => [...p, data].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      setForm((f) => ({ ...f, proveedor_id: data.id, operador_id: "" }));
    } else {
      if (!form.proveedor_id) { setGuardandoAlta(false); setErrorAlta("Primero elige la línea de transporte."); return; }
      const { data, error } = await supabase.from("operadores")
        .insert({ nombre: alta.nombre.trim(), telefono: alta.telefono.trim() || null, folio_licencia: alta.folio.trim() || null, proveedor_id: form.proveedor_id, activo: true })
        .select("id, nombre, telefono, folio_licencia, proveedor_id").single();
      setGuardandoAlta(false);
      if (error || !data) { setErrorAlta(error?.message || "No se pudo guardar"); return; }
      setOpers((o) => [...o, data].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      setForm((f) => ({ ...f, operador_id: data.id, folio_licencia: data.folio_licencia || f.folio_licencia }));
    }
    setAlta(null);
    router.refresh();
  }

  function elegirOperador(id: string) {
    const o = opers.find((x) => x.id === id);
    setForm({ ...form, operador_id: id, folio_licencia: o?.folio_licencia || form.folio_licencia, proveedor_id: o?.proveedor_id || form.proveedor_id });
  }

  const set = (k: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value.toUpperCase() });

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!sel) return;
    if (bloqueoSel) { setError(`${bloqueoSel.nombre} está bloqueado (${bloqueoSel.bloqueo_motivo || "cartera vencida"}). Finanzas tiene que liberar la cuenta antes de asignar transporte.`); return; }
    setLoading(true);
    setError("");
    const datos: Record<string, unknown> = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === "" ? null : v]));
    // Solo avanza a "Asignado" si estaba Programado; si ya iba más adelante, conserva su estatus
    if (sel.estatus === "programado") datos.estatus = "asignado";
    if (!sel.asignado_at) datos.asignado_at = new Date().toISOString();
    const { error } = await supabase.from("servicios").update(datos).eq("id", sel.id);
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    const { data: fila } = await supabase.from("v_servicios").select("*").eq("id", sel.id).single();
    setLoading(false);
    if (fila) {
      setServicios(servicios.map((s) => (s.id === fila.id ? fila : s)));
      setListo(fila);
    }
    setSel(null);
    router.refresh();
  }

  return (
    <div>
      <Titulo>Asignar transporte al servicio</Titulo>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.25rem", alignItems: "start" }}>
        <div>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 0 }}>Selecciona el ID TRACK al que le vas a asignar transporte:</p>
          <Tabla columnas={["ID TRACK", "Estatus", "Cliente", "Ruta", "Carga"]} vacio="No hay servicios programados">
            {servicios.map((s, i) => (
              <Tr key={s.id} i={i} onClick={() => elegir(s)}>
                <Td fuerte style={{ color: sel?.id === s.id ? C.amber : undefined }}>{s.id_track}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <EstatusBadge estatus={s.estatus} />
                    {bloqueoDe(s.cliente_id) && <EtiquetaBloqueo motivo={bloqueoDe(s.cliente_id)!.bloqueo_motivo} />}
                  </div>
                </Td>
                <Td>{s.cliente}</Td>
                <Td>{s.origen} → {s.destino}</Td>
                <Td>{fecha(s.fecha_carga)}</Td>
              </Tr>
            ))}
          </Tabla>
        </div>

        {sel ? (
          <Card>
            <h3 style={{ color: "white", marginTop: 0 }}>{sel.id_track} <span style={{ fontSize: 13, color: C.muted, fontWeight: 400 }}>· {sel.cliente}</span></h3>
            {bloqueoSel && <AvisoBloqueo nombre={bloqueoSel.nombre} motivo={bloqueoSel.bloqueo_motivo} />}
            <Grid cols={3}>
              <Dato label="Unidad" valor={sel.tipo_unidad} />
              <Dato label="Carga" valor={sel.tipo_carga} />
              <Dato label="Origen" valor={`${sel.origen || "—"} · ${fecha(sel.fecha_carga)} ${hora(sel.cita_carga)}`} />
              <Dato label="Destino" valor={`${sel.destino || "—"} · ${fecha(sel.fecha_descarga)} ${hora(sel.cita_descarga)}`} />
              <Dato label="Cliente carga" valor={sel.cliente_carga} />
              <Dato label="Cliente descarga" valor={sel.cliente_descarga} />
              <Dato label="Requerimientos" valor={[sel.req_fumigacion === "SI" && "Fumigación", sel.req_gps === "SI" && "GPS", sel.req_cuenta_espejo === "SI" && "Cuenta espejo", sel.req_poliza_seguro === "SI" && "Póliza", sel.req_sua === "SI" && "SUA"].filter(Boolean).join(", ")} />
            </Grid>
            <form onSubmit={guardar} style={{ marginTop: 14 }}>
              <Grid>
                <Seccion titulo="Datos del transporte" />
                <Campo label="Línea de transporte *">
                  <SelectBuscable requerido value={form.proveedor_id} opciones={provs} textoAgregar="Dar de alta línea de transporte"
                    onAgregar={(t) => abrirAlta("proveedor", t)}
                    onChange={(id) => setForm((f) => ({ ...f, proveedor_id: id, operador_id: "" }))} />
                </Campo>
                <Campo label="Operador *">
                  <SelectBuscable requerido value={form.operador_id} opciones={opsProveedor} textoAgregar="Dar de alta operador"
                    onAgregar={(t) => abrirAlta("operador", t)} onChange={elegirOperador} />
                </Campo>
                <Campo label="Placas unidad *"><input required value={form.placas_unidad} onChange={set("placas_unidad")} style={inputStyle} /></Campo>
                <Campo label="Económico unidad"><input value={form.economico_unidad} onChange={set("economico_unidad")} style={inputStyle} /></Campo>
                <Campo label="Placas caja"><input value={form.placas_caja} onChange={set("placas_caja")} style={inputStyle} /></Campo>
                <Campo label="Económico caja"><input value={form.economico_caja} onChange={set("economico_caja")} style={inputStyle} /></Campo>
                <Campo label="Folio licencia"><input value={form.folio_licencia} onChange={set("folio_licencia")} style={inputStyle} /></Campo>
              </Grid>
              {opsProveedor.length === 0 && form.proveedor_id && <p style={{ color: C.muted, fontSize: 12 }}>Esta línea no tiene operadores dados de alta. Escribe el nombre en el campo de operador y elige “Dar de alta operador”.</p>}
              {error && <p style={{ color: C.red, fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <Btn type="submit" disabled={loading || !!bloqueoSel} style={{ flex: 1 }}>{loading ? "Guardando…" : "Asignar transporte"}</Btn>
                <Btn variante="secundario" onClick={() => setSel(null)}>Cerrar</Btn>
              </div>
            </form>
          </Card>
        ) : (
          <Card><p style={{ color: C.muted, margin: 0 }}>Elige un servicio de la lista para capturar los datos del transporte.</p></Card>
        )}
      </div>

      {listo && (
        <Modal titulo={`Transporte asignado a ${listo.id_track}`} onClose={() => setListo(null)} ancho={480}>
          <p style={{ color: C.text, marginTop: 0 }}>El servicio quedó como <EstatusBadge estatus="asignado" />. Mándale la información al transportista y el link al operador:</p>
          <div style={{ display: "grid", gap: 10 }}>
            <Btn variante="verde" href={linkWhatsApp(listo.proveedor_telefono, msgProveedor(listo))} target="_blank">Enviar info al transportista ({listo.proveedor})</Btn>
            <Btn variante="verde" href={linkWhatsApp(listo.operador_telefono, msgOperador(listo, linkOperador(listo.token_operador)))} target="_blank">Enviar link al operador ({listo.operador})</Btn>
            <Btn variante="secundario" onClick={() => navigator.clipboard.writeText(linkOperador(listo.token_operador))}>Copiar link del operador</Btn>
          </div>
        </Modal>
      )}

      {alta && (
        <Modal titulo={alta.tipo === "proveedor" ? "Nueva línea de transporte" : "Nuevo operador"} onClose={() => setAlta(null)} ancho={460}>
          <form onSubmit={guardarAlta}>
            <Grid>
              <Campo label="Nombre *" span={2}>
                <input autoFocus required value={alta.nombre} onChange={(e) => setAlta({ ...alta, nombre: e.target.value })} style={inputStyle} />
              </Campo>
              {alta.tipo === "proveedor" ? (
                <>
                  <Campo label="Contacto"><input value={alta.contacto} onChange={(e) => setAlta({ ...alta, contacto: e.target.value })} style={inputStyle} /></Campo>
                  <Campo label="Teléfono"><input value={alta.telefono} onChange={(e) => setAlta({ ...alta, telefono: e.target.value })} inputMode="tel" style={inputStyle} /></Campo>
                </>
              ) : (
                <>
                  <Campo label="Teléfono"><input value={alta.telefono} onChange={(e) => setAlta({ ...alta, telefono: e.target.value })} inputMode="tel" style={inputStyle} /></Campo>
                  <Campo label="Folio licencia"><input value={alta.folio} onChange={(e) => setAlta({ ...alta, folio: e.target.value })} style={inputStyle} /></Campo>
                </>
              )}
            </Grid>
            <p style={{ fontSize: 12, color: C.muted, margin: "10px 0 0" }}>
              {alta.tipo === "proveedor"
                ? "Queda en el catálogo de transportistas y seleccionada en este servicio."
                : `Queda ligado a ${provs.find((p) => p.id === form.proveedor_id)?.nombre || "la línea seleccionada"} y seleccionado en este servicio.`}
            </p>
            {errorAlta && <p style={{ color: C.red, fontSize: 13, margin: "8px 0 0" }}>{errorAlta}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <Btn variante="secundario" onClick={() => setAlta(null)}>Cancelar</Btn>
              <Btn type="submit" disabled={guardandoAlta}>{guardandoAlta ? "Guardando…" : "Guardar y usar"}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
