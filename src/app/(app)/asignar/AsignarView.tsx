"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fecha, hora } from "@/lib/format";
import { linkWhatsApp, msgOperador, msgProveedor } from "@/lib/whatsapp";
import SelectBuscable from "@/components/SelectBuscable";
import { linkOperador, type ServicioV } from "@/components/ServicioDetalle";
import { Btn, C, Campo, Card, Dato, EstatusBadge, Grid, Modal, Seccion, Tabla, Td, Titulo, Tr, inputStyle } from "@/components/ui";

type Proveedor = { id: string; nombre: string; contacto_nombre?: string; contacto_telefono?: string };
type Operador = { id: string; nombre: string; telefono?: string; folio_licencia?: string; proveedor_id?: string };

const VACIO = { proveedor_id: "", operador_id: "", placas_unidad: "", economico_unidad: "", placas_caja: "", economico_caja: "", folio_licencia: "" };

export default function AsignarView({ servicios: ini, proveedores, operadores, seleccionadoId }: {
  servicios: ServicioV[]; proveedores: Proveedor[]; operadores: Operador[]; seleccionadoId?: string;
}) {
  const [servicios, setServicios] = useState(ini);
  const inicial = ini.find((s) => s.id === seleccionadoId) || null;
  const [sel, setSel] = useState<ServicioV | null>(inicial);
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

  const opsProveedor = useMemo(() => operadores.filter((o) => !form.proveedor_id || o.proveedor_id === form.proveedor_id), [operadores, form.proveedor_id]);

  function elegirOperador(id: string) {
    const o = operadores.find((x) => x.id === id);
    setForm({ ...form, operador_id: id, folio_licencia: o?.folio_licencia || form.folio_licencia, proveedor_id: o?.proveedor_id || form.proveedor_id });
  }

  const set = (k: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value.toUpperCase() });

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!sel) return;
    setLoading(true);
    setError("");
    const datos: Record<string, unknown> = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === "" ? null : v]));
    datos.estatus = "asignado";
    datos.asignado_at = new Date().toISOString();
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
                <Td><EstatusBadge estatus={s.estatus} /></Td>
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
                  <SelectBuscable requerido value={form.proveedor_id} opciones={proveedores} onChange={(id) => setForm((f) => ({ ...f, proveedor_id: id, operador_id: "" }))} />
                </Campo>
                <Campo label="Operador *">
                  <SelectBuscable requerido value={form.operador_id} opciones={opsProveedor} onChange={elegirOperador} />
                </Campo>
                <Campo label="Placas unidad *"><input required value={form.placas_unidad} onChange={set("placas_unidad")} style={inputStyle} /></Campo>
                <Campo label="Económico unidad"><input value={form.economico_unidad} onChange={set("economico_unidad")} style={inputStyle} /></Campo>
                <Campo label="Placas caja"><input value={form.placas_caja} onChange={set("placas_caja")} style={inputStyle} /></Campo>
                <Campo label="Económico caja"><input value={form.economico_caja} onChange={set("economico_caja")} style={inputStyle} /></Campo>
                <Campo label="Folio licencia"><input value={form.folio_licencia} onChange={set("folio_licencia")} style={inputStyle} /></Campo>
              </Grid>
              {opsProveedor.length === 0 && form.proveedor_id && <p style={{ color: C.muted, fontSize: 12 }}>Este transportista no tiene operadores. Agrégalos en <a href="/operadores" target="_blank" style={{ color: C.blue }}>Operadores</a>.</p>}
              {error && <p style={{ color: C.red, fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <Btn type="submit" disabled={loading} style={{ flex: 1 }}>{loading ? "Guardando…" : "Asignar transporte"}</Btn>
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
    </div>
  );
}
