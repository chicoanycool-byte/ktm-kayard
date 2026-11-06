import { cargarListas, traerTodo } from "@/lib/listas";
import { requireRol } from "@/lib/session";
import IndicadoresView from "./IndicadoresView";

type Filtros = { desde?: string; hasta?: string; anio?: string; mes?: string; cliente?: string; proveedor?: string };

export default async function IndicadoresPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const f = await searchParams;
  const { supabase } = await requireRol(["admin", "direccion", "facturacion"]);
  const base = () => {
    let q = supabase.from("v_servicios").select("*").neq("estatus", "cancelado");
    if (f.desde) q = q.gte("fecha_carga", f.desde);
    if (f.hasta) q = q.lte("fecha_carga", f.hasta);
    if (f.anio) q = q.eq("anio", Number(f.anio));
    if (f.mes) q = q.eq("mes", Number(f.mes));
    if (f.cliente) q = q.eq("cliente_id", f.cliente);
    if (f.proveedor) q = q.eq("proveedor_id", f.proveedor);
    return q.order("id_track");
  };
  const [data, listas] = await Promise.all([traerTodo((a, b) => base().range(a, b)), cargarListas(supabase, ["clientes", "proveedores"])]);
  return <IndicadoresView servicios={data || []} listas={listas} filtros={f} />;
}
