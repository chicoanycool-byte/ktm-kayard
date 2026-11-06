export const ESTATUS = [
  "programado",
  "asignado",
  "en_carga",
  "espera_documentos",
  "en_transito",
  "en_descarga",
  "finalizado",
  "cancelado",
] as const;
export type Estatus = (typeof ESTATUS)[number];

export const ESTATUS_INFO: Record<Estatus, { label: string; bg: string; color: string }> = {
  programado:  { label: "Programado",             bg: "rgba(239,68,68,0.18)",  color: "#F87171" },
  asignado:    { label: "Asignado al transporte", bg: "rgba(245,166,35,0.2)",  color: "#F5A623" },
  en_carga:    { label: "En carga",               bg: "rgba(251,146,60,0.2)",  color: "#FB923C" },
  espera_documentos: { label: "En espera de documentos", bg: "rgba(250,204,21,0.18)", color: "#FACC15" },
  en_transito: { label: "En tránsito",            bg: "rgba(91,163,217,0.2)",  color: "#5BA3D9" },
  en_descarga: { label: "En descarga",            bg: "rgba(167,139,250,0.2)", color: "#A78BFA" },
  finalizado:  { label: "Finalizado",             bg: "rgba(34,197,94,0.2)",   color: "#22C55E" },
  cancelado:   { label: "Cancelado",              bg: "rgba(148,163,184,0.2)", color: "#94A3B8" },
};

export const REQ_OPCIONES = ["SI", "NO", "N/A"] as const;

export const ROLES: Record<string, string> = {
  admin: "Administrador",
  direccion: "Dirección",
  operaciones: "Operaciones",
  compras: "Compras",
  ventas: "Ventas",
  facturacion: "Facturación",
  monitoreo: "Monitoreo",
};

export type MenuItem = { href: string; label: string; icon: string; roles?: string[] };
export type MenuGrupo = { titulo: string; items: MenuItem[] };

// Misma organización que el menú de AppSheet: Servicios, Compras, Ventas, Finanzas
export const MENU: MenuGrupo[] = [
  {
    titulo: "General",
    items: [{ href: "/dashboard", label: "Inicio", icon: "⊞" }],
  },
  {
    titulo: "Servicios",
    items: [
      { href: "/servicios", label: "Servicios", icon: "🚛", roles: ["admin", "direccion", "operaciones", "ventas"] },
      { href: "/asignar", label: "Asignar transporte", icon: "🧾", roles: ["admin", "direccion", "operaciones", "compras"] },
      { href: "/monitoreo", label: "Monitoreo", icon: "📡", roles: ["admin", "direccion", "operaciones", "monitoreo"] },
      { href: "/bitacora", label: "Bitácora de estatus", icon: "🕒", roles: ["admin", "direccion", "operaciones", "monitoreo"] },
    ],
  },
  {
    titulo: "Compras",
    items: [
      { href: "/proveedores", label: "Proveedores", icon: "🏢", roles: ["admin", "direccion", "compras", "operaciones"] },
      { href: "/operadores", label: "Operadores", icon: "👷", roles: ["admin", "direccion", "compras", "operaciones"] },
      { href: "/tarifas/compra", label: "Tarifas de compra", icon: "💲", roles: ["admin", "direccion", "compras"] },
    ],
  },
  {
    titulo: "Ventas",
    items: [
      { href: "/clientes", label: "Clientes", icon: "👥", roles: ["admin", "direccion", "ventas", "operaciones"] },
      { href: "/puntos", label: "Clientes carga / descarga", icon: "📍", roles: ["admin", "direccion", "ventas", "operaciones"] },
      { href: "/tarifas/venta", label: "Tarifas de venta", icon: "💰", roles: ["admin", "direccion", "ventas"] },
    ],
  },
  {
    titulo: "Finanzas",
    items: [
      { href: "/costos", label: "Costos y venta", icon: "📄", roles: ["admin", "direccion", "facturacion"] },
      { href: "/metricas", label: "Métricas", icon: "📊", roles: ["admin", "direccion", "facturacion", "operaciones"] },
    ],
  },
  {
    titulo: "Reportes",
    items: [
      { href: "/tiempos", label: "Tiempos y On-time", icon: "⏱", roles: ["admin", "direccion", "operaciones", "monitoreo"] },
      { href: "/ejecutivo", label: "Dashboard ejecutivo", icon: "📈", roles: ["admin", "direccion", "operaciones", "monitoreo", "ventas"] },
    ],
  },
  {
    titulo: "Configuración",
    items: [
      { href: "/catalogos", label: "Catálogos", icon: "🗂", roles: ["admin", "direccion", "operaciones"] },
      { href: "/usuarios", label: "Usuarios", icon: "👤", roles: ["admin"] },
    ],
  },
];

export function puedeVer(item: MenuItem, role: string) {
  return !item.roles || item.roles.includes(role);
}

export function rolesDeRuta(pathname: string): string[] | undefined {
  for (const g of MENU) for (const i of g.items) if (pathname === i.href || pathname.startsWith(i.href + "/")) return i.roles;
  return undefined;
}

export const FACTURACION_WHATSAPP = process.env.NEXT_PUBLIC_FACTURACION_WHATSAPP || "3334570570";
export const FACTURACION_NOMBRE = process.env.NEXT_PUBLIC_FACTURACION_NOMBRE || "Cesar";
