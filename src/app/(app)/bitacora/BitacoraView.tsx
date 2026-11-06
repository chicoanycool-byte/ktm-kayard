"use client";
import { useMemo, useState } from "react";
import { ESTATUS, ESTATUS_INFO } from "@/lib/constants";
import { bitacoraExcel, bitacoraPDF, type RegBitacora } from "@/lib/bitacora";
import EnVivo from "@/components/EnVivo";
import { fechaHora } from "@/lib/format";
import { Btn, C, Campo, Card, EstatusBadge, Tabla, Td, Titulo, Tr, inputStyle } from "@/components/ui";

const hoyMx = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
const diaMx = (d: string) => new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

export default function BitacoraView({ registros }: { registros: RegBitacora[] }) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [estatus, setEstatus] = useState("");
  const [origen, setOrigen] = useState("");
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [limite, setLimite] = useState(300);

  const filtrados = useMemo(() => {
    const q = texto.toLowerCase().trim();
    return registros.filter((r) => {
      const d = diaMx(r.created_at);
      if (desde && d < desde) return false;
      if (hasta && d > hasta) return false;
      if (estatus && r.estatus !== estatus) return false;
      if (origen && r.origen !== origen) return false;
      if (q && ![r.id_track, r.cliente, r.proveedor, r.operador, r.usuario, r.origen_carga, r.destino].some((v) => (v || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [registros, desde, hasta, estatus, origen, texto]);

  const subtitulo = [
    desde || hasta ? `Del ${desde || "inicio"} al ${hasta || hoyMx()}` : "Todo el periodo",
    estatus && ESTATUS_INFO[estatus as keyof typeof ESTATUS_INFO]?.label,
    texto && `Búsqueda: ${texto}`,
    `${filtrados.length} registros`,
  ].filter(Boolean).join(" · ");

  async function exportar(tipo: "excel" | "pdf") {
    setOcupado(tipo);
    try {
      if (tipo === "excel") await bitacoraExcel(filtrados);
      else await bitacoraPDF(filtrados, subtitulo);
    } finally {
      setOcupado("");
    }
  }

  return (
    <div>
      <Titulo accion={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <EnVivo tablas={["servicio_estatus"]} />
          <Btn variante="secundario" onClick={() => exportar("excel")} disabled={!!ocupado || !filtrados.length}>{ocupado === "excel" ? "Generando…" : "⬇ Excel"}</Btn>
          <Btn variante="secundario" onClick={() => exportar("pdf")} disabled={!!ocupado || !filtrados.length}>{ocupado === "pdf" ? "Generando…" : "⬇ PDF"}</Btn>
        </div>
      }>Bitácora de estatus</Titulo>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, alignItems: "end" }}>
          <Campo label="Desde"><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Hasta"><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={inputStyle} /></Campo>
          <Campo label="Estatus">
            <select value={estatus} onChange={(e) => setEstatus(e.target.value)} style={inputStyle}>
              <option value="">Todos</option>
              {ESTATUS.map((e) => <option key={e} value={e}>{ESTATUS_INFO[e].label}</option>)}
            </select>
          </Campo>
          <Campo label="Registrado por">
            <select value={origen} onChange={(e) => setOrigen(e.target.value)} style={inputStyle}>
              <option value="">Todos</option>
              <option value="sistema">Equipo Kayard</option>
              <option value="operador">Operador</option>
            </select>
          </Campo>
          <Campo label="Buscar"><input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="ID TRACK, cliente, operador…" style={inputStyle} /></Campo>
          <Btn variante="secundario" onClick={() => { setDesde(""); setHasta(""); setEstatus(""); setOrigen(""); setTexto(""); }}>Limpiar</Btn>
        </div>
      </Card>

      <p style={{ color: C.muted, fontSize: 12, margin: "0 0 8px" }}>{subtitulo}. La descarga incluye todos los registros filtrados.</p>
      <Tabla columnas={["Fecha y hora", "ID TRACK", "Cliente", "Ruta", "Estatus", "Registrado por", "Comentario", "Ubicación"]}>
        {filtrados.slice(0, limite).map((r, i) => (
          <Tr key={r.id} i={i}>
            <Td>{fechaHora(r.created_at)}</Td>
            <Td fuerte>{r.id_track}</Td>
            <Td>{r.cliente}</Td>
            <Td>{r.origen_carga || "—"} → {r.destino || "—"}</Td>
            <Td><EstatusBadge estatus={r.estatus} /></Td>
            <Td>{r.origen === "operador" ? `Operador${r.operador ? ` (${r.operador})` : ""}` : r.usuario || "Sistema"}</Td>
            <Td>{r.comentario || "—"}</Td>
            <Td>{r.lat ? <a href={`https://maps.google.com/?q=${r.lat},${r.lng}`} target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>Mapa</a> : "—"}</Td>
          </Tr>
        ))}
      </Tabla>
      {filtrados.length > limite && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <Btn variante="secundario" onClick={() => setLimite(limite + 500)}>Ver más ({filtrados.length - limite} restantes)</Btn>
        </div>
      )}
    </div>
  );
}
