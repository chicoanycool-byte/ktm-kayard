"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const ESTATUS_COLORES: Record<string, { bg: string; color: string }> = {
  planeado:    { bg: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" },
  asignado:    { bg: "rgba(91,163,217,0.2)", color: "#5BA3D9" },
  en_transito: { bg: "rgba(245,166,35,0.2)", color: "#F5A623" },
  en_carga:    { bg: "rgba(251,146,60,0.2)", color: "#FB923C" },
  en_descarga: { bg: "rgba(167,139,250,0.2)", color: "#A78BFA" },
  entregado:   { bg: "rgba(34,197,94,0.2)", color: "#22C55E" },
  cancelado:   { bg: "rgba(239,68,68,0.2)", color: "#EF4444" },
};

const ESTATUS_LABELS: Record<string, string> = {
  planeado: "Planeado", asignado: "Asignado", en_transito: "En Tránsito",
  en_carga: "En Carga", en_descarga: "En Descarga", entregado: "Entregado", cancelado: "Cancelado",
};

const MUNICIPIOS_MX = [
  "Acapulco, Guerrero","Aguascalientes, Aguascalientes","Cancún, Quintana Roo",
  "Celaya, Guanajuato","Chihuahua, Chihuahua","Ciudad de México, CDMX",
  "Ciudad Juárez, Chihuahua","Ciudad Obregón, Sonora","Coatzacoalcos, Veracruz",
  "Colima, Colima","Córdoba, Veracruz","Culiacán, Sinaloa","Durango, Durango",
  "Guadalajara, Jalisco","Guanajuato, Guanajuato","Hermosillo, Sonora",
  "Irapuato, Guanajuato","La Paz, Baja California Sur","León, Guanajuato",
  "Los Mochis, Sinaloa","Manzanillo, Colima","Matamoros, Tamaulipas",
  "Mazatlán, Sinaloa","Mérida, Yucatán","Mexicali, Baja California",
  "Monterrey, Nuevo León","Morelia, Michoacán","Nogales, Sonora",
  "Nuevo Laredo, Tamaulipas","Oaxaca, Oaxaca","Pachuca, Hidalgo",
  "Puebla, Puebla","Puerto Vallarta, Jalisco","Querétaro, Querétaro",
  "Reynosa, Tamaulipas","Saltillo, Coahuila","San Luis Potosí, San Luis Potosí",
  "Tampico, Tamaulipas","Tepic, Nayarit","Tijuana, Baja California",
  "Toluca, Estado de México","Torreón, Coahuila","Tuxtla Gutiérrez, Chiapas",
  "Uruapan, Michoacán","Veracruz, Veracruz","Villahermosa, Tabasco",
  "Xalapa, Veracruz","Zacatecas, Zacatecas","Zapopan, Jalisco",
  "Cunduacán, Tabasco","Comalcalco, Tabasco","Cárdenas, Tabasco",
  "Paraíso, Tabasco","Macuspana, Tabasco","Centro, Tabasco",
];

interface ClienteCarga {
  id: string; nombre: string; domicilio?: string; colonia?: string;
  poblacion?: string; codigo_postal?: string; link_ubicacion?: string;
}

interface Servicio {
  id: string; folio: string; tipo_operacion?: string; tipo_unidad_servicio?: string;
  tipo_carga?: string; estatus: string; fecha_cita_carga?: string; fecha_cita_descarga?: string;
  hora_cita_carga?: string; hora_cita_descarga?: string;
  clientes?: { razon_social: string };
  cliente_carga?: { nombre: string }; cliente_descarga?: { nombre: string };
}

interface Props {
  servicios: Servicio[];
  clientes: { id: string; razon_social: string }[];
  clientesCarga: ClienteCarga[];
  clientesDescarga: ClienteCarga[];
}

export default function ServiciosView({ servicios: ini, clientes, clientesCarga: ccIni, clientesDescarga: cdIni }: Props) {
  const [servicios, setServicios] = useState(ini);
  const [clientesCarga, setClientesCarga] = useState(ccIni);
  const [clientesDescarga, setClientesDescarga] = useState(cdIni);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [mostrarFormCarga, setMostrarFormCarga] = useState(false);
  const [mostrarFormDescarga, setMostrarFormDescarga] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [poblacionSearch, setPoblacionSearch] = useState("");
  const [poblacionSearchD, setPoblacionSearchD] = useState("");

  const [form, setForm] = useState({
    cliente_id: "", tipo_operacion: "", tipo_unidad_servicio: "", tipo_carga: "",
    costo_mercancia: "", cliente_carga_id: "", fecha_cita_carga: "", hora_cita_carga: "",
    cliente_descarga_id: "", fecha_cita_descarga: "", hora_cita_descarga: "",
    req_fumigacion: false, req_cuenta_espejo: false, req_sua: false,
    req_cert_operador: false, req_otro: false, req_comentarios: "",
  });

  const [formCarga, setFormCarga] = useState({ nombre: "", domicilio: "", colonia: "", poblacion: "", codigo_postal: "", link_ubicacion: "" });
  const [formDescarga, setFormDescarga] = useState({ nombre: "", domicilio: "", colonia: "", poblacion: "", codigo_postal: "", link_ubicacion: "" });

  const router = useRouter();
  const supabase = createClient();

  const filtrados = servicios.filter((s) =>
    s.folio.toLowerCase().includes(busqueda.toLowerCase()) ||
    s.clientes?.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
    s.estatus.toLowerCase().includes(busqueda.toLowerCase())
  );

  const municipiosFiltradosCarga = MUNICIPIOS_MX.filter(m => m.toLowerCase().includes(poblacionSearch.toLowerCase())).slice(0, 8);
  const municipiosFiltradosDescarga = MUNICIPIOS_MX.filter(m => m.toLowerCase().includes(poblacionSearchD.toLowerCase())).slice(0, 8);

  async function guardarCarga(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await supabase.from("clientes_carga").insert([formCarga]).select().single();
    if (data) { setClientesCarga([...clientesCarga, data]); setForm({ ...form, cliente_carga_id: data.id }); }
    setMostrarFormCarga(false);
    setFormCarga({ nombre: "", domicilio: "", colonia: "", poblacion: "", codigo_postal: "", link_ubicacion: "" });
  }

  async function guardarDescarga(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await supabase.from("clientes_descarga").insert([formDescarga]).select().single();
    if (data) { setClientesDescarga([...clientesDescarga, data]); setForm({ ...form, cliente_descarga_id: data.id }); }
    setMostrarFormDescarga(false);
    setFormDescarga({ nombre: "", domicilio: "", colonia: "", poblacion: "", codigo_postal: "", link_ubicacion: "" });
  }

  async function guardarServicio(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: folioData } = await supabase.rpc("generate_folio");
    const folio = folioData || `KTL${new Date().getFullYear().toString().slice(2)}00001`;
    const datos = { ...form, folio, estatus: "planeado", created_by: user?.id, costo_mercancia: form.costo_mercancia ? parseFloat(form.costo_mercancia) : null, cliente_carga_id: form.cliente_carga_id || null, cliente_descarga_id: form.cliente_descarga_id || null };
    const { data } = await supabase.from("servicios").insert([datos]).select("*, clientes(razon_social)").single();
    if (data) setServicios([data, ...servicios]);
    setLoading(false);
    setMostrarForm(false);
    router.refresh();
  }

  async function cancelarServicio(id: string, motivo: string) {
    await supabase.from("servicios").update({ estatus: "cancelado", motivo_cancelacion: motivo }).eq("id", id);
    setServicios(servicios.map((s) => s.id === id ? { ...s, estatus: "cancelado" } : s));
    setMostrarDetalle(false);
  }

  const clienteCargaSeleccionado = clientesCarga.find(c => c.id === form.cliente_carga_id);
  const clienteDescargaSeleccionado = clientesDescarga.find(c => c.id === form.cliente_descarga_id);

  const inputStyle = { width: "100%", padding: "0.5rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const, backgroundColor: "#0F2540", color: "white" };
  const labelStyle = { fontSize: 13, fontWeight: 500 as const, color: "rgba(255,255,255,0.7)", display: "block" as const, marginBottom: 4 };
  const seccionStyle = { backgroundColor: "#0A1628", padding: "0.4rem 1rem", borderRadius: 6, borderLeft: "3px solid #F5A623" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0F1E2E" }}>
      <header style={{ background: "linear-gradient(135deg, #0A1628 0%, #1B3A5C 100%)", color: "white", padding: "0.75rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(245,166,35,0.2)" }}>
        <div style={{ backgroundColor: "#E8F0F7", borderRadius: 8, padding: "4px 8px" }}>
          <img src="/logo-kayard.png" alt="Kayard" style={{ height: 36, objectFit: "contain" }} />
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={() => router.refresh()} style={{ color: "#F5A623", fontSize: 13, padding: "0.4rem 0.75rem", borderRadius: 6, border: "1px solid rgba(245,166,35,0.4)", backgroundColor: "transparent", cursor: "pointer" }}>↺ Actualizar</button>
          <a href="/dashboard" style={{ color: "#F5A623", textDecoration: "none", fontSize: 13, padding: "0.4rem 0.75rem", borderRadius: 6, border: "1px solid rgba(245,166,35,0.4)" }}>← Dashboard</a>
        </div>
      </header>

      <main style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ color: "white", fontSize: 22, fontWeight: 700, margin: 0 }}>Gestión de Servicios</h2>
          <button onClick={() => setMostrarForm(true)} style={{ backgroundColor: "#F5A623", color: "#0A1628", padding: "0.5rem 1.25rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}>+ Nuevo Servicio</button>
        </div>

        <input type="text" placeholder="Buscar por folio, cliente o estatus..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          style={{ padding: "0.5rem 1rem", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, marginBottom: "1rem", width: "100%", maxWidth: 500, fontSize: 14, backgroundColor: "#1B3A5C", color: "white" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtrados.length === 0 ? (
            <div style={{ backgroundColor: "#1B3A5C", borderRadius: 12, padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>No hay servicios registrados</div>
          ) : filtrados.map((s) => {
            const col = ESTATUS_COLORES[s.estatus] || ESTATUS_COLORES.planeado;
            return (
              <div key={s.id} onClick={() => { setServicioSeleccionado(s); setMostrarDetalle(true); }}
                style={{ backgroundColor: "#1B3A5C", borderRadius: 12, padding: "1rem 1.5rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "1rem", borderLeft: `4px solid ${col.color}` }}>
                <span style={{ padding: "0.25rem 0.75rem", borderRadius: 999, fontSize: 12, fontWeight: 600, backgroundColor: col.bg, color: col.color, whiteSpace: "nowrap" }}>
                  {ESTATUS_LABELS[s.estatus]}
                </span>
                <span style={{ fontWeight: 700, color: "#F5A623", fontSize: 15, minWidth: 120 }}>{s.folio}</span>
                <span style={{ color: "white", fontWeight: 500 }}>{s.clientes?.razon_social || "-"}</span>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{s.tipo_operacion || "-"}</span>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{s.tipo_unidad_servicio || "-"}</span>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginLeft: "auto" }}>
                  {s.fecha_cita_carga ? new Date(s.fecha_cita_carga).toLocaleDateString("es-MX") : "-"}
                </span>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: "0.75rem" }}>Total: {filtrados.length} servicios</p>
      </main>

      {/* MODAL NUEVO SERVICIO */}
      {mostrarForm && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ backgroundColor: "#1B3A5C", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", border: "1px solid rgba(245,166,35,0.2)" }}>
            <h3 style={{ color: "white", fontSize: 20, fontWeight: "bold", marginBottom: "1.5rem" }}>Nuevo Servicio</h3>
            <form onSubmit={guardarServicio} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

              <div style={seccionStyle}><p style={{ fontSize: 12, fontWeight: 600, color: "#F5A623", margin: 0 }}>Datos Generales</p></div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div><label style={labelStyle}>Cliente *</label>
                  <select required value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} style={inputStyle}>
                    <option value="">-- Seleccionar --</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Tipo de Operación *</label>
                  <select required value={form.tipo_operacion} onChange={(e) => setForm({ ...form, tipo_operacion: e.target.value })} style={inputStyle}>
                    <option value="">-- Seleccionar --</option>
                    <option value="transporte">Transporte</option>
                    <option value="seguro">Seguro de Mercancía</option>
                    <option value="ambos">Ambos</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div><label style={labelStyle}>Tipo de Unidad *</label>
                  <select required value={form.tipo_unidad_servicio} onChange={(e) => setForm({ ...form, tipo_unidad_servicio: e.target.value })} style={inputStyle}>
                    <option value="">-- Seleccionar --</option>
                    {["Full","Trailer","Torton","Rabon","Mudanza","Camioneta 3.5","Camioneta 1.5","Automóvil","Consolidado"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Tipo de Carga</label>
                  <select value={form.tipo_carga} onChange={(e) => setForm({ ...form, tipo_carga: e.target.value })} style={inputStyle}>
                    <option value="">-- Seleccionar --</option>
                    <option value="Camión completo">Camión completo</option>
                    <option value="Consolidado">Consolidado</option>
                  </select>
                </div>
              </div>

              {(form.tipo_operacion === "seguro" || form.tipo_operacion === "ambos") && (
                <div><label style={labelStyle}>Costo de la Mercancía $</label>
                  <input type="number" step="0.01" value={form.costo_mercancia} onChange={(e) => setForm({ ...form, costo_mercancia: e.target.value })} style={inputStyle} />
                </div>
              )}

              <div style={seccionStyle}><p style={{ fontSize: 12, fontWeight: 600, color: "#F5A623", margin: 0 }}>Origen</p></div>

              <div>
                <label style={labelStyle}>Cliente de Carga</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <select value={form.cliente_carga_id} onChange={(e) => setForm({ ...form, cliente_carga_id: e.target.value })}
                    style={{ ...inputStyle, flex: 1 }}>
                    <option value="">-- Seleccionar --</option>
                    {clientesCarga.map((c) => <option key={c.id} value={c.id}>{c.nombre} — {c.poblacion}</option>)}
                  </select>
                  <button type="button" onClick={() => setMostrarFormCarga(true)}
                    style={{ padding: "0.5rem 0.75rem", backgroundColor: "#F5A623", color: "#0A1628", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>+ Nuevo</button>
                </div>
                {clienteCargaSeleccionado && (
                  <div style={{ marginTop: 8, padding: "0.75rem", backgroundColor: "#0F2540", borderRadius: 8, fontSize: 13 }}>
                    <p style={{ margin: 0, fontWeight: 600, color: "#F5A623" }}>{clienteCargaSeleccionado.nombre}</p>
                    <p style={{ margin: 0, color: "rgba(255,255,255,0.6)" }}>{clienteCargaSeleccionado.domicilio}, {clienteCargaSeleccionado.colonia}</p>
                    <p style={{ margin: 0, color: "rgba(255,255,255,0.6)" }}>{clienteCargaSeleccionado.poblacion} CP: {clienteCargaSeleccionado.codigo_postal}</p>
                    {clienteCargaSeleccionado.link_ubicacion && <a href={clienteCargaSeleccionado.link_ubicacion} target="_blank" style={{ color: "#5BA3D9" }}>Ver en mapa</a>}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div><label style={labelStyle}>Fecha Cita Carga</label><input type="date" value={form.fecha_cita_carga} onChange={(e) => setForm({ ...form, fecha_cita_carga: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Hora Cita Carga</label><input type="time" value={form.hora_cita_carga} onChange={(e) => setForm({ ...form, hora_cita_carga: e.target.value })} style={inputStyle} /></div>
              </div>

              <div style={seccionStyle}><p style={{ fontSize: 12, fontWeight: 600, color: "#F5A623", margin: 0 }}>Destino</p></div>

              <div>
                <label style={labelStyle}>Cliente de Descarga</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <select value={form.cliente_descarga_id} onChange={(e) => setForm({ ...form, cliente_descarga_id: e.target.value })}
                    style={{ ...inputStyle, flex: 1 }}>
                    <option value="">-- Seleccionar --</option>
                    {clientesDescarga.map((c) => <option key={c.id} value={c.id}>{c.nombre} — {c.poblacion}</option>)}
                  </select>
                  <button type="button" onClick={() => setMostrarFormDescarga(true)}
                    style={{ padding: "0.5rem 0.75rem", backgroundColor: "#F5A623", color: "#0A1628", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>+ Nuevo</button>
                </div>
                {clienteDescargaSeleccionado && (
                  <div style={{ marginTop: 8, padding: "0.75rem", backgroundColor: "#0F2540", borderRadius: 8, fontSize: 13 }}>
                    <p style={{ margin: 0, fontWeight: 600, color: "#F5A623" }}>{clienteDescargaSeleccionado.nombre}</p>
                    <p style={{ margin: 0, color: "rgba(255,255,255,0.6)" }}>{clienteDescargaSeleccionado.domicilio}, {clienteDescargaSeleccionado.colonia}</p>
                    <p style={{ margin: 0, color: "rgba(255,255,255,0.6)" }}>{clienteDescargaSeleccionado.poblacion} CP: {clienteDescargaSeleccionado.codigo_postal}</p>
                    {clienteDescargaSeleccionado.link_ubicacion && <a href={clienteDescargaSeleccionado.link_ubicacion} target="_blank" style={{ color: "#5BA3D9" }}>Ver en mapa</a>}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div><label style={labelStyle}>Fecha Cita Descarga</label><input type="date" value={form.fecha_cita_descarga} onChange={(e) => setForm({ ...form, fecha_cita_descarga: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Hora Cita Descarga</label><input type="time" value={form.hora_cita_descarga} onChange={(e) => setForm({ ...form, hora_cita_descarga: e.target.value })} style={inputStyle} /></div>
              </div>

              <div style={seccionStyle}><p style={{ fontSize: 12, fontWeight: 600, color: "#F5A623", margin: 0 }}>Requisitos Extras</p></div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {[
                  { key: "req_fumigacion", label: "Fumigación" },
                  { key: "req_cuenta_espejo", label: "Cuenta Espejo" },
                  { key: "req_sua", label: "SUA" },
                  { key: "req_cert_operador", label: "Certificación Operador" },
                  { key: "req_otro", label: "Otro" },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 13, cursor: "pointer", color: "rgba(255,255,255,0.7)" }}>
                    <input type="checkbox" checked={form[key as keyof typeof form] as boolean} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>

              <div><label style={labelStyle}>Comentarios</label>
                <textarea value={form.req_comentarios} onChange={(e) => setForm({ ...form, req_comentarios: e.target.value })} rows={2}
                  style={{ ...inputStyle, resize: "vertical" }} />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: "0.625rem", backgroundColor: "#F5A623", color: "#0A1628", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
                  {loading ? "Guardando..." : "Guardar — Estatus: Planeado"}
                </button>
                <button type="button" onClick={() => setMostrarForm(false)} style={{ flex: 1, padding: "0.625rem", backgroundColor: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer" }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CLIENTE CARGA */}
      {mostrarFormCarga && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ backgroundColor: "#1B3A5C", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 480, border: "1px solid rgba(245,166,35,0.2)" }}>
            <h3 style={{ color: "white", fontSize: 18, fontWeight: "bold", marginBottom: "1rem" }}>Nuevo Cliente de Carga</h3>
            <form onSubmit={guardarCarga} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[{ label: "Nombre *", key: "nombre", required: true }, { label: "Domicilio", key: "domicilio" }, { label: "Colonia", key: "colonia" }, { label: "Código Postal", key: "codigo_postal" }, { label: "Link de Ubicación", key: "link_ubicacion" }].map(({ label, key, required }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 3 }}>{label}</label>
                  <input type="text" required={required} value={formCarga[key as keyof typeof formCarga]} onChange={(e) => setFormCarga({ ...formCarga, [key]: e.target.value })}
                    style={{ width: "100%", padding: "0.4rem 0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 13, boxSizing: "border-box", backgroundColor: "#0F2540", color: "white" }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 3 }}>Población</label>
                <input type="text" placeholder="Buscar población..." value={poblacionSearch}
                  onChange={(e) => { setPoblacionSearch(e.target.value); setFormCarga({ ...formCarga, poblacion: e.target.value }); }}
                  style={{ width: "100%", padding: "0.4rem 0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 13, boxSizing: "border-box", backgroundColor: "#0F2540", color: "white" }} />
                {poblacionSearch.length > 1 && (
                  <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, marginTop: 4, maxHeight: 160, overflowY: "auto", backgroundColor: "#0A1628" }}>
                    {municipiosFiltradosCarga.map((m) => (
                      <div key={m} onClick={() => { setFormCarga({ ...formCarga, poblacion: m }); setPoblacionSearch(m); }}
                        style={{ padding: "0.4rem 0.75rem", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.7)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        {m}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="submit" style={{ flex: 1, padding: "0.625rem", backgroundColor: "#F5A623", color: "#0A1628", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Guardar</button>
                <button type="button" onClick={() => setMostrarFormCarga(false)} style={{ flex: 1, padding: "0.625rem", backgroundColor: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CLIENTE DESCARGA */}
      {mostrarFormDescarga && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ backgroundColor: "#1B3A5C", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 480, border: "1px solid rgba(245,166,35,0.2)" }}>
            <h3 style={{ color: "white", fontSize: 18, fontWeight: "bold", marginBottom: "1rem" }}>Nuevo Cliente de Descarga</h3>
            <form onSubmit={guardarDescarga} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[{ label: "Nombre *", key: "nombre", required: true }, { label: "Domicilio", key: "domicilio" }, { label: "Colonia", key: "colonia" }, { label: "Código Postal", key: "codigo_postal" }, { label: "Link de Ubicación", key: "link_ubicacion" }].map(({ label, key, required }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 3 }}>{label}</label>
                  <input type="text" required={required} value={formDescarga[key as keyof typeof formDescarga]} onChange={(e) => setFormDescarga({ ...formDescarga, [key]: e.target.value })}
                    style={{ width: "100%", padding: "0.4rem 0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 13, boxSizing: "border-box", backgroundColor: "#0F2540", color: "white" }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 3 }}>Población</label>
                <input type="text" placeholder="Buscar población..." value={poblacionSearchD}
                  onChange={(e) => { setPoblacionSearchD(e.target.value); setFormDescarga({ ...formDescarga, poblacion: e.target.value }); }}
                  style={{ width: "100%", padding: "0.4rem 0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 13, boxSizing: "border-box", backgroundColor: "#0F2540", color: "white" }} />
                {poblacionSearchD.length > 1 && (
                  <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, marginTop: 4, maxHeight: 160, overflowY: "auto", backgroundColor: "#0A1628" }}>
                    {municipiosFiltradosDescarga.map((m) => (
                      <div key={m} onClick={() => { setFormDescarga({ ...formDescarga, poblacion: m }); setPoblacionSearchD(m); }}
                        style={{ padding: "0.4rem 0.75rem", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.7)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        {m}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="submit" style={{ flex: 1, padding: "0.625rem", backgroundColor: "#F5A623", color: "#0A1628", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Guardar</button>
                <button type="button" onClick={() => setMostrarFormDescarga(false)} style={{ flex: 1, padding: "0.625rem", backgroundColor: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {mostrarDetalle && servicioSeleccionado && (
        <DetalleServicio servicio={servicioSeleccionado} onClose={() => setMostrarDetalle(false)} onCancelar={cancelarServicio} />
      )}
    </div>
  );
}

function DetalleServicio({ servicio, onClose, onCancelar }: { servicio: any; onClose: () => void; onCancelar: (id: string, motivo: string) => void }) {
  const [mostrarCancelacion, setMostrarCancelacion] = useState(false);
  const [motivo, setMotivo] = useState("");
  const col = ESTATUS_COLORES[servicio.estatus] || ESTATUS_COLORES.planeado;

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ backgroundColor: "#1B3A5C", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", border: "1px solid rgba(245,166,35,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ color: "#F5A623", fontSize: 20, fontWeight: "bold", margin: 0 }}>{servicio.folio}</h3>
            <span style={{ padding: "0.25rem 0.75rem", borderRadius: 999, fontSize: 12, fontWeight: 600, backgroundColor: col.bg, color: col.color }}>
              {ESTATUS_LABELS[servicio.estatus]}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: 14, marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {[
              { label: "Cliente", val: servicio.clientes?.razon_social },
              { label: "Tipo Operación", val: servicio.tipo_operacion },
              { label: "Tipo Unidad", val: servicio.tipo_unidad_servicio },
              { label: "Tipo Carga", val: servicio.tipo_carga },
              { label: "Cita Carga", val: servicio.fecha_cita_carga ? `${new Date(servicio.fecha_cita_carga).toLocaleDateString("es-MX")} ${servicio.hora_cita_carga || ""}` : "-" },
              { label: "Cita Descarga", val: servicio.fecha_cita_descarga ? `${new Date(servicio.fecha_cita_descarga).toLocaleDateString("es-MX")} ${servicio.hora_cita_descarga || ""}` : "-" },
            ].map(({ label, val }) => (
              <div key={label} style={{ backgroundColor: "#0F2540", padding: "0.75rem", borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "white" }}>{val || "-"}</p>
              </div>
            ))}
          </div>
          {servicio.req_comentarios && (
            <div style={{ padding: "0.75rem", backgroundColor: "rgba(245,166,35,0.1)", borderRadius: 8, border: "1px solid rgba(245,166,35,0.2)" }}>
              <strong style={{ color: "#F5A623" }}>Comentarios:</strong> <span style={{ color: "rgba(255,255,255,0.7)" }}>{servicio.req_comentarios}</span>
            </div>
          )}
          {servicio.motivo_cancelacion && (
            <div style={{ padding: "0.75rem", backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>
              <strong style={{ color: "#EF4444" }}>Motivo cancelación:</strong> <span style={{ color: "rgba(255,255,255,0.7)" }}>{servicio.motivo_cancelacion}</span>
            </div>
          )}
        </div>

        {!mostrarCancelacion ? (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button onClick={onClose} style={{ padding: "0.625rem 1rem", backgroundColor: "#F5A623", color: "#0A1628", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>Editar</button>
            <button onClick={onClose} style={{ padding: "0.625rem 1rem", backgroundColor: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer" }}>Volver</button>
            {servicio.estatus !== "cancelado" && (
              <button onClick={() => setMostrarCancelacion(true)} style={{ padding: "0.625rem 1rem", backgroundColor: "rgba(239,68,68,0.15)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, cursor: "pointer" }}>Cancelar Servicio</button>
            )}
            <button style={{ padding: "0.625rem 1rem", backgroundColor: "#2A6DA8", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>Asignar Transporte</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>Motivo de Cancelación</label>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)}
              style={{ padding: "0.5rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 13, backgroundColor: "#0F2540", color: "white" }}>
              <option value="">-- Seleccionar --</option>
              <option value="Falta de proveedor">Falta de proveedor</option>
              <option value="Cancelación de proveedor">Cancelación de proveedor</option>
              <option value="Cancelación de cliente">Cancelación de cliente</option>
              <option value="No se cubre la ruta">No se cubre la ruta</option>
              <option value="Otro">Otro</option>
            </select>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={() => motivo && onCancelar(servicio.id, motivo)}
                style={{ flex: 1, padding: "0.625rem", backgroundColor: "#EF4444", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
                Confirmar Cancelación
              </button>
              <button onClick={() => setMostrarCancelacion(false)}
                style={{ flex: 1, padding: "0.625rem", backgroundColor: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer" }}>
                Volver
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}