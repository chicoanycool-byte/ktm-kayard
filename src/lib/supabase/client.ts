import { createBrowserClient } from "@supabase/ssr";
import { enSoloLectura } from "@/lib/soloLectura";

const ERROR_LECTURA = {
  message: "Modo consulta: este usuario puede ver la información pero no modificarla.",
  details: "", hint: "", code: "solo_lectura",
};

// Respuesta falsa para los métodos de escritura: se puede encadenar (.select().single())
// y se puede esperar con await, igual que una consulta real.
function bloqueada(): unknown {
  const resultado = { data: null, error: ERROR_LECTURA, count: null, status: 403, statusText: "Forbidden" };
  const falsa: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then") return (ok: (r: typeof resultado) => unknown) => Promise.resolve(resultado).then(ok);
      return () => falsa;
    },
    apply: () => falsa,
  });
  return falsa;
}

export function createClient() {
  const cliente = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  if (!enSoloLectura()) return cliente;

  // El candado de verdad está en la base de datos; esto solo da un mensaje claro
  // en lugar del error crudo de permisos.
  const from = cliente.from.bind(cliente);
  cliente.from = ((tabla: string) => {
    const consulta = from(tabla) as unknown as Record<string, unknown>;
    for (const metodo of ["insert", "update", "upsert", "delete"]) consulta[metodo] = bloqueada;
    return consulta as unknown;
  }) as unknown as typeof cliente.from;
  return cliente;
}
