"use client";
import { createClient } from "@/lib/supabase/client";
import { FACTURACION_NOMBRE, FACTURACION_WHATSAPP } from "@/lib/constants";
import { linkWhatsApp, msgFacturar, type ServicioWA } from "@/lib/whatsapp";

// Contacto de facturación: el guardado en este navegador o el predeterminado
export function contactoFacturacion() {
  try {
    return { tel: localStorage.getItem("ktm_fact_tel") || FACTURACION_WHATSAPP, nombre: localStorage.getItem("ktm_fact_nombre") || FACTURACION_NOMBRE };
  } catch {
    return { tel: FACTURACION_WHATSAPP, nombre: FACTURACION_NOMBRE };
  }
}

export function configurarContactoFacturacion() {
  const actual = contactoFacturacion();
  const tel = prompt("WhatsApp de quien factura (10 dígitos):", actual.tel || "") || "";
  if (!tel) return null;
  const nombre = prompt("Nombre de quien factura:", actual.nombre || "") || "";
  try { localStorage.setItem("ktm_fact_tel", tel); localStorage.setItem("ktm_fact_nombre", nombre); } catch {}
  return { tel, nombre };
}

// Abre WhatsApp con el mensaje de facturación y marca el servicio como Facturado.
// Regresa la fila actualizada de v_servicios (o null si no se pudo).
export async function enviarAFacturar<T extends ServicioWA & { id: string; estatus: string }>(s: T): Promise<T | null> {
  if (s.estatus !== "finalizado") { alert("Solo se pueden mandar a facturar los viajes finalizados."); return null; }
  let c = contactoFacturacion();
  if (!c.tel) { const n = configurarContactoFacturacion(); if (!n) return null; c = n; }
  const ventana = window.open("about:blank", "_blank");
  const supabase = createClient();
  const ahora = new Date().toISOString();
  const { error } = await supabase.from("costos_venta").upsert({ servicio_id: s.id, estatus_facturacion: "facturado", enviado_facturar_at: ahora, updated_at: ahora });
  if (error) { ventana?.close(); alert(error.message); return null; }
  const { data: fila } = await supabase.from("v_servicios").select("*").eq("id", s.id).single();
  const url = linkWhatsApp(c.tel, msgFacturar((fila as T) || s, c.nombre));
  if (ventana) ventana.location.href = url; else window.location.href = url;
  return (fila as T) || null;
}
