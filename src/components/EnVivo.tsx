"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { C } from "./ui";

// Mantiene la pantalla al día: escucha cambios en tiempo real y, por si acaso, refresca cada 30 s
export default function EnVivo({ segundos = 30, tablas = ["servicios", "servicio_estatus", "evidencias"] }: { segundos?: number; tablas?: string[] }) {
  const router = useRouter();
  const [ultima, setUltima] = useState<Date | null>(null);
  const [conectado, setConectado] = useState(false);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const refrescar = () => {
      if (espera.current) clearTimeout(espera.current);
      espera.current = setTimeout(() => { router.refresh(); setUltima(new Date()); }, 800);
    };
    const supabase = createClient();
    const canal = supabase.channel(`ktm-en-vivo-${Math.random().toString(36).slice(2)}`);
    for (const t of tablas) canal.on("postgres_changes", { event: "*", schema: "public", table: t }, refrescar);
    canal.subscribe((estado) => setConectado(estado === "SUBSCRIBED"));

    const intervalo = setInterval(() => { if (document.visibilityState === "visible") { router.refresh(); setUltima(new Date()); } }, segundos * 1000);
    const alVolver = () => { if (document.visibilityState === "visible") refrescar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
      if (espera.current) clearTimeout(espera.current);
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, segundos]);

  return (
    <span title={conectado ? "Conectado en tiempo real" : `Actualizando cada ${segundos} s`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: C.muted }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: conectado ? "#22C55E" : C.amber, boxShadow: conectado ? "0 0 6px #22C55E" : "none" }} />
      {conectado ? "En vivo" : `Cada ${segundos} s`}
      {ultima && ` · ${ultima.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`}
    </span>
  );
}
