export function money(n: number | string | null | undefined) {
  const v = Number(n || 0);
  return v.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
}

export function fecha(d: string | null | undefined) {
  if (!d) return "—";
  const [y, m, dd] = d.slice(0, 10).split("-");
  return `${dd}/${m}/${y}`;
}

export function hora(t: string | null | undefined) {
  return t ? t.slice(0, 5) : "—";
}

export function fechaHora(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

export function pct(n: number | string | null | undefined) {
  if (n === null || n === undefined || n === "") return "—";
  return `${Number(n).toFixed(1)}%`;
}
