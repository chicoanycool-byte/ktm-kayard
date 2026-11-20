"use client";
import { ESTATUS_INFO, type Estatus } from "@/lib/constants";
import { fechaHora } from "@/lib/format";
import { C } from "./ui";

// Los siete pasos por los que pasa un servicio. "cancelado" no es un paso: corta la línea.
export const PASOS: Estatus[] = ["programado", "asignado", "llegada_carga", "en_transito", "llegada_descarga", "entrega_documentos", "finalizado"];

const ICONOS: Record<Estatus, React.ReactNode> = {
  // Programado: calendario
  programado: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  // Asignado al transporte: camión con paloma
  asignado: <><path d="M2 7h11v9H2zM13 10h4l3 3v3h-7z" /><circle cx="6" cy="18.5" r="1.8" /><circle cx="16.5" cy="18.5" r="1.8" /><path d="M4.5 11.5l1.6 1.6 3-3.2" /></>,
  // Llegada a carga: bodega con flecha entrando a la unidad
  llegada_carga: <><path d="M3 20V9l6-4 6 4v11" /><path d="M9 20v-5h3v5" /><path d="M18 7v7M18 14l-2.2-2.2M18 14l2.2-2.2" /></>,
  // En tránsito: camión en movimiento
  en_transito: <><path d="M6 7h8v9H6zM14 10h3.5l2.5 3v3h-6z" /><circle cx="9" cy="18.5" r="1.7" /><circle cx="17" cy="18.5" r="1.7" /><path d="M1 9h3M1 12.5h4M1 16h3" /></>,
  // Llegada a descarga: bodega con flecha saliendo
  llegada_descarga: <><path d="M3 20V9l6-4 6 4v11" /><path d="M9 20v-5h3v5" /><path d="M18 14V7M18 7l-2.2 2.2M18 7l2.2 2.2" /></>,
  // Entrega de documentos: hoja firmada
  entrega_documentos: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 12h6M9 16h4" /></>,
  // Finalizado: paloma en círculo
  finalizado: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.5" /></>,
  // Cancelado: no se dibuja en la línea, pero el tipo lo pide
  cancelado: <><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>,
};

function Icono({ estatus, tam }: { estatus: Estatus; tam: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONOS[estatus]}
    </svg>
  );
}

// Hasta dónde llegó el servicio. Un cancelado conserva el avance que alcanzó.
export function pasoActual(estatus: string, bitacora?: { estatus: string }[]): number {
  if (estatus !== "cancelado") return PASOS.indexOf(estatus as Estatus);
  const alcanzados = (bitacora || []).map((b) => PASOS.indexOf(b.estatus as Estatus)).filter((i) => i >= 0);
  return alcanzados.length ? Math.max(...alcanzados) : 0;
}

/** Línea de estatus completa, con iconos, etiquetas y la hora de cada paso. */
export default function LineaEstatus({ estatus, bitacora, compacta = false }: {
  estatus: string;
  bitacora?: { estatus: string; created_at: string }[];
  compacta?: boolean;
}) {
  const actual = pasoActual(estatus, bitacora);
  const cancelado = estatus === "cancelado";
  const hechoColor = cancelado ? C.muted : C.green;

  // Primera vez que el servicio tocó cada paso
  const cuando: Partial<Record<Estatus, string>> = {};
  for (const b of bitacora || []) {
    const e = b.estatus as Estatus;
    if (PASOS.includes(e) && !cuando[e]) cuando[e] = b.created_at;
  }

  if (compacta) {
    return (
      <div title={ESTATUS_INFO[estatus as Estatus]?.label || estatus} style={{ display: "flex", alignItems: "center", marginTop: 5 }}>
        {PASOS.map((p, i) => {
          const hecho = i <= actual;
          return (
            <div key={p} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && <span style={{ width: 11, height: 2, background: i <= actual ? hechoColor : "rgba(255,255,255,0.15)" }} />}
              <span style={{
                width: i === actual ? 9 : 7, height: i === actual ? 9 : 7, borderRadius: "50%",
                background: hecho ? hechoColor : "rgba(255,255,255,0.18)",
                boxShadow: i === actual && !cancelado ? `0 0 0 3px rgba(34,197,94,0.22)` : undefined,
              }} />
            </div>
          );
        })}
        {cancelado && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: C.red }}>CANCELADO</span>}
      </div>
    );
  }

  return (
    <div style={{ background: C.card2, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 14px 14px", overflowX: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", minWidth: 620 }}>
        {PASOS.map((p, i) => {
          const hecho = i <= actual;
          const esActual = i === actual && !cancelado;
          const color = hecho ? hechoColor : "rgba(255,255,255,0.28)";
          return (
            <div key={p} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              {/* tramo de línea hacia el paso anterior */}
              {i > 0 && (
                <span style={{ position: "absolute", right: "50%", top: 7, width: "100%", height: 3, borderRadius: 2, background: hecho ? hechoColor : "rgba(255,255,255,0.14)" }} />
              )}
              <span style={{
                position: "relative", width: 16, height: 16, borderRadius: "50%", background: hecho ? hechoColor : C.card,
                border: `2px solid ${hecho ? hechoColor : "rgba(255,255,255,0.28)"}`,
                boxShadow: esActual ? "0 0 0 5px rgba(34,197,94,0.2)" : undefined,
              }} />
              <span style={{ marginTop: 10, color, display: "flex", alignItems: "center", justifyContent: "center", width: 46, height: 46, borderRadius: "50%", border: `2px solid ${color}` }}>
                <Icono estatus={p} tam={26} />
              </span>
              <p style={{ margin: "8px 4px 0", fontSize: 11, fontWeight: 700, color: hecho ? C.text : C.muted, textAlign: "center", lineHeight: 1.25 }}>
                {ESTATUS_INFO[p].label}
              </p>
              <p style={{ margin: "3px 0 0", fontSize: 10, color: C.muted, textAlign: "center", minHeight: 13 }}>
                {cuando[p] ? fechaHora(cuando[p]) : ""}
              </p>
            </div>
          );
        })}
      </div>
      {cancelado && (
        <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 12, fontWeight: 700, color: C.red }}>
          SERVICIO CANCELADO{cuando.programado ? "" : ""}
        </p>
      )}
    </div>
  );
}
