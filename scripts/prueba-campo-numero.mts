// Prueba del campo numérico: el punto decimal debe sobrevivir mientras se teclea.
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body><div id='r'></div></body></html>", { pretendToBeVisual: true });
const g = globalThis as Record<string, unknown>;
g.window = dom.window; g.document = dom.window.document; Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
g.HTMLElement = dom.window.HTMLElement; g.Node = dom.window.Node; g.MouseEvent = dom.window.MouseEvent; g.Event = dom.window.Event;
g.IS_REACT_ACT_ENVIRONMENT = true;
const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { act } = await import("react");
const { InputNumero } = await import("../src/components/ui.tsx");

let recibido = 0;
const root = createRoot(document.getElementById("r")!);
await act(async () => { root.render(React.createElement(InputNumero, { valor: 2.5, onChange: (v: number) => { recibido = v; } })); });
const input = document.querySelector("input") as HTMLInputElement;

let fallas = 0;
const ok = (n: string, c: boolean, extra = "") => { if (!c) { fallas++; console.log(`  ✗ ${n} ${extra}`); } else console.log(`  ✓ ${n}`); };

// React escucha el setter nativo del input, así que hay que escribir por ahí
const ponerValor = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
const teclear = async (texto: string) => {
  await act(async () => {
    ponerValor.call(input, texto);
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
};

ok("arranca con el valor que recibe", input.value === "2.5", input.value);
await teclear("3");
ok("al borrar y escribir 3 queda 3", input.value === "3" && recibido === 3, `${input.value} / ${recibido}`);
await teclear("3.");
ok("el punto no se borra al teclearlo", input.value === "3.", input.value);
await teclear("3.6");
ok("queda 3.6 en pantalla", input.value === "3.6", input.value);
ok("y hacia afuera entrega 3.6", recibido === 3.6, String(recibido));
await teclear("0.");
ok("también con 0.", input.value === "0.");
await teclear("0.35");
ok("0.35 entra completo", input.value === "0.35" && recibido === 0.35, `${input.value} / ${recibido}`);
await teclear("1,550");
ok("las comas de miles se quitan", input.value === "1550" && recibido === 1550, `${input.value} / ${recibido}`);
await teclear("abc");
ok("las letras no entran", input.value === "" && recibido === 0, `${input.value} / ${recibido}`);
await act(async () => { input.dispatchEvent(new dom.window.Event("focusout", { bubbles: true })); });
ok("al salir del campo se normaliza", input.value === "0", input.value);

console.log(fallas === 0 ? "\nTodo bien." : `\n${fallas} falla(s).`);
process.exit(fallas === 0 ? 0 : 1);
