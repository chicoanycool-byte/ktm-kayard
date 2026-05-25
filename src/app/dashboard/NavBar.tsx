"use client";

export default function NavBar() {
  return (
    <nav style={{ backgroundColor: "white", borderBottom: "2px solid #E2E8F0", padding: "0 2rem", display: "flex", gap: "0.25rem", overflowX: "auto" }}>
      <a href="/dashboard" style={{ padding: "0.75rem 1.25rem", fontSize: 14, color: "#1B3A5C", textDecoration: "none", fontWeight: 500, borderBottom: "3px solid transparent", whiteSpace: "nowrap" }}>Dashboard</a>
      <a href="/servicios" style={{ padding: "0.75rem 1.25rem", fontSize: 14, color: "#1B3A5C", textDecoration: "none", fontWeight: 500, borderBottom: "3px solid transparent", whiteSpace: "nowrap" }}>Servicios</a>
      <a href="/monitoreo" style={{ padding: "0.75rem 1.25rem", fontSize: 14, color: "#1B3A5C", textDecoration: "none", fontWeight: 500, borderBottom: "3px solid transparent", whiteSpace: "nowrap" }}>Monitoreo</a>
      <a href="/facturacion" style={{ padding: "0.75rem 1.25rem", fontSize: 14, color: "#1B3A5C", textDecoration: "none", fontWeight: 500, borderBottom: "3px solid transparent", whiteSpace: "nowrap" }}>Facturación</a>
      <a href="/reportes" style={{ padding: "0.75rem 1.25rem", fontSize: 14, color: "#1B3A5C", textDecoration: "none", fontWeight: 500, borderBottom: "3px solid transparent", whiteSpace: "nowrap" }}>Reportes</a>
      <a href="/clientes" style={{ padding: "0.75rem 1.25rem", fontSize: 14, color: "#1B3A5C", textDecoration: "none", fontWeight: 500, borderBottom: "3px solid transparent", whiteSpace: "nowrap" }}>Clientes</a>
      <a href="/proveedores" style={{ padding: "0.75rem 1.25rem", fontSize: 14, color: "#1B3A5C", textDecoration: "none", fontWeight: 500, borderBottom: "3px solid transparent", whiteSpace: "nowrap" }}>Proveedores</a>
      <a href="/operadores" style={{ padding: "0.75rem 1.25rem", fontSize: 14, color: "#1B3A5C", textDecoration: "none", fontWeight: 500, borderBottom: "3px solid transparent", whiteSpace: "nowrap" }}>Operadores</a>
      <a href="/unidades" style={{ padding: "0.75rem 1.25rem", fontSize: 14, color: "#1B3A5C", textDecoration: "none", fontWeight: 500, borderBottom: "3px solid transparent", whiteSpace: "nowrap" }}>Unidades</a>
      <a href="/tarifas" style={{ padding: "0.75rem 1.25rem", fontSize: 14, color: "#1B3A5C", textDecoration: "none", fontWeight: 500, borderBottom: "3px solid transparent", whiteSpace: "nowrap" }}>Tarifas</a>
      <a href="/usuarios" style={{ padding: "0.75rem 1.25rem", fontSize: 14, color: "#1B3A5C", textDecoration: "none", fontWeight: 500, borderBottom: "3px solid transparent", whiteSpace: "nowrap" }}>Usuarios</a>
    </nav>
  );
}