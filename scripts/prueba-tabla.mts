import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body><div id='r'></div></body></html>", { pretendToBeVisual: true });
const g = globalThis as Record<string, unknown>;
g.window = dom.window; g.document = dom.window.document; Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
g.HTMLElement = dom.window.HTMLElement; g.Node = dom.window.Node; g.MouseEvent = dom.window.MouseEvent;
g.IS_REACT_ACT_ENVIRONMENT = true;
const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { act } = await import("react");
const { Tabla, Tr, Td } = await import("../src/components/ui.tsx");

const N = 250;
const datos = Array.from({ length: N }, (_, i) => ({
  id: `KTL${String(i).padStart(4, "0")}`,
  cliente: ["PIQ", "Endulave", "Tajín"][i % 3],
  costo: 1000 + i,
}));
let avisos: number[] | null = null;
const App = () => React.createElement(Tabla, {
  columnas: ["ID", "Cliente", "Costo"],
  onVisibles: (ix: number[]) => { avisos = ix; },
}, datos.map((d, i) => React.createElement(Tr, { key: d.id, i },
  React.createElement(Td, null, d.id),
  React.createElement(Td, null, d.cliente),
  React.createElement(Td, null, String(d.costo)),
)));

const root = createRoot(document.getElementById("r")!);
await act(async () => { root.render(React.createElement(App)); });

const filas = () => Array.from(document.querySelectorAll("tbody tr"));
const visibles = () => filas().filter((r) => (r as HTMLElement).style.display !== "none");
console.log("1) primera página:", filas().length, "filas pintadas (esperado 100)");
console.log("   paginador:", document.body.textContent?.match(/1–100 de 250/) ? "ok 1–100 de 250" : "FALTA");

// ir a la página 3
const botones = Array.from(document.querySelectorAll("button"));
const siguiente = botones.find((b) => b.textContent?.includes("Siguiente"))!;
await act(async () => { siguiente.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await act(async () => { Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.includes("Siguiente"))!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
console.log("2) página 3:", filas().length, "filas ·", document.body.textContent?.match(/201–250 de 250/) ? "ok 201–250" : "rango inesperado");
console.log("   primer ID visible:", filas()[0]?.textContent?.slice(0, 7));

// abrir el filtro de Cliente: debe pintar TODAS las filas y listar los 3 clientes
const lupa = Array.from(document.querySelectorAll("th button"))[1] as HTMLElement;
await act(async () => { lupa.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
console.log("3) con el menú abierto:", filas().length, "filas pintadas (esperado 250)");
const menu = document.body.textContent || "";
console.log("   el menú lista:", ["PIQ", "Endulave", "Tajín"].filter((c) => menu.includes(c)).join(", "), "(esperado los 3)");

// desmarcar PIQ y aplicar
const checks = Array.from(document.querySelectorAll("input[type=checkbox]"));
const etiquetas = Array.from(document.querySelectorAll("label")).map((l) => l.textContent?.trim());
const iPIQ = etiquetas.findIndex((t) => t === "PIQ");
await act(async () => {
  const c = checks[iPIQ] as HTMLInputElement;
  c.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
});
const marcados = Array.from(document.querySelectorAll("input[type=checkbox]")).map((c) => (c as HTMLInputElement).checked);
console.log("   PIQ quedó desmarcado:", marcados[iPIQ] === false ? "sí" : "NO (el clic no llegó a React)");
const aplicar = Array.from(document.querySelectorAll("button")).find((b) => b.textContent === "Aplicar")!;
await act(async () => { aplicar.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
console.log("4) filtrando fuera PIQ:", visibles().length, "visibles de", filas().length, "(esperado 167 de 250)");
console.log("   aviso al padre:", avisos ? `${(avisos as number[]).length} índices` : "sin aviso", "· paginador:", /de 250/.test(document.body.textContent || "") && /Página/.test(document.body.textContent || "") ? "sigue" : "oculto (correcto)");
console.log("   texto de conteo:", (document.body.textContent || "").match(/Filtrado: \d+ de \d+ registros/)?.[0] || "no aparece");
