"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fechaHora } from "@/lib/format";
import { Btn, C, Campo, Modal, inputStyle } from "./ui";

// Solo estos roles mueven el bloqueo. El mismo candado está en la base de datos.
export const ROLES_BLOQUEO = ["admin", "facturacion"];
export const puedeBloquear = (rol: string) => ROLES_BLOQUEO.includes(rol);

const MOTIVOS = [
  "Cartera vencida",
  "Cartera vencida a más de 30 días",
  "Cartera vencida a más de 60 días",
  "Excede el límite de crédito",
  "Falta de documentación fiscal",
];

export type ClienteBloqueo = {
  id: string; nombre?: string;
  bloqueado?: boolean | null; bloqueo_motivo?: string | null; bloqueado_at?: string | null;
};

export default function BloqueoCliente({ cliente, rol, onCambio }: {
  cliente: ClienteBloqueo;
  rol: string;
  onCambio?: (bloqueado: boolean, motivo: string | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const router = useRouter();

  const bloqueado = !!cliente.bloqueado;
  const autorizado = puedeBloquear(rol);

  async function aplicar(nuevo: boolean) {
    setGuardando(true);
    setError("");
    const texto = nuevo ? [motivo, nota.trim()].filter(Boolean).join(" — ") : null;
    const { error } = await createClient().from("clientes")
      .update({ bloqueado: nuevo, bloqueo_motivo: texto }).eq("id", cliente.id);
    setGuardando(false);
    if (error) { setError(error.message); return; }
    setAbierto(false);
    setNota("");
    onCambio?.(nuevo, texto);
    router.refresh();
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {bloqueado && (
          <span title={cliente.bloqueo_motivo || ""} style={{ padding: "0.2rem 0.6rem", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "rgba(255,92,92,0.18)", color: C.red, whiteSpace: "nowrap" }}>
            BLOQUEADO
          </span>
        )}
        {autorizado && (
          <Btn small variante={bloqueado ? "secundario" : "peligro"} onClick={() => { setError(""); setAbierto(true); }}>
            {bloqueado ? "Liberar" : "Bloquear"}
          </Btn>
        )}
      </div>

      {abierto && (
        <Modal titulo={bloqueado ? `Liberar a ${cliente.nombre || "el cliente"}` : `Bloquear a ${cliente.nombre || "el cliente"}`} onClose={() => setAbierto(false)}>
          {bloqueado ? (
            <>
              <p style={{ margin: "0 0 10px", fontSize: 14, color: C.text }}>
                Se podrán volver a programar servicios para este cliente.
              </p>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: C.muted }}>
                Bloqueado por: {cliente.bloqueo_motivo || "sin motivo capturado"}
                {cliente.bloqueado_at ? ` · ${fechaHora(cliente.bloqueado_at)}` : ""}
              </p>
            </>
          ) : (
            <>
              <p style={{ margin: "0 0 14px", fontSize: 14, color: C.text }}>
                Mientras esté bloqueado no se le podrán dar de alta servicios nuevos. Los que ya están en ruta siguen su curso.
              </p>
              <Campo label="Motivo">
                <select value={motivo} onChange={(e) => setMotivo(e.target.value)} style={inputStyle}>
                  {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Campo>
              <Campo label="Detalle (opcional)">
                <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Facturas, importe, acuerdo de pago…" style={inputStyle} />
              </Campo>
            </>
          )}

          {error && <p style={{ margin: "12px 0 0", fontSize: 13, color: C.red }}>{error}</p>}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
            <Btn variante="secundario" onClick={() => setAbierto(false)}>Cancelar</Btn>
            <Btn variante={bloqueado ? "primario" : "peligro"} disabled={guardando} onClick={() => aplicar(!bloqueado)}>
              {guardando ? "Guardando…" : bloqueado ? "Liberar cliente" : "Bloquear cliente"}
            </Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
