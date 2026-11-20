"use client";
import BloqueoCliente, { type ClienteBloqueo } from "@/components/BloqueoCliente";
import Crud, { type CampoDef } from "@/components/Crud";

// Envoltura de cliente: la columna de cartera se arma con una función, y eso solo
// se puede pasar entre componentes de cliente, no desde el servidor.
export default function ClientesView({ filas, rol, campos }: {
  filas: (ClienteBloqueo & { id: string })[];
  rol: string;
  campos: CampoDef[];
}) {
  return (
    <Crud titulo="Catálogo de clientes" singular="cliente" tabla="clientes" filas={filas} campos={campos}
      extra={{ encabezado: "Cartera", render: (f) => <BloqueoCliente cliente={f as ClienteBloqueo} rol={rol} /> }} />
  );
}
