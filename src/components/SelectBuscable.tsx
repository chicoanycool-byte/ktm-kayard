"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { C, inputStyle } from "./ui";

export type OpcionBuscable = { id: string; nombre: string };

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Campo donde se escribe y se sugieren coincidencias (sin acentos, por cualquier parte del texto)
export default function SelectBuscable({ opciones, value, onChange, requerido, placeholder = "Escribe para buscar…", name, maxSugerencias = 60 }: {
  opciones: OpcionBuscable[];
  value: string;
  onChange: (id: string) => void;
  requerido?: boolean;
  placeholder?: string;
  name?: string;
  maxSugerencias?: number;
}) {
  const seleccionada = opciones.find((o) => o.id === value);
  const [texto, setTexto] = useState(seleccionada?.nombre || "");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const caja = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLDivElement>(null);

  // Si cambia el valor desde afuera (al abrir un registro para editar), refleja el nombre
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTexto(seleccionada?.nombre || "");
  }, [seleccionada?.nombre]);

  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) {
        setAbierto(false);
        setTexto(seleccionada?.nombre || "");
      }
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [seleccionada?.nombre]);

  const filtradas = useMemo(() => {
    const q = normalizar(texto);
    if (!q || q === normalizar(seleccionada?.nombre || "")) return opciones.slice(0, maxSugerencias);
    const empiezan: OpcionBuscable[] = [];
    const contienen: OpcionBuscable[] = [];
    for (const o of opciones) {
      const n = normalizar(o.nombre);
      if (n.startsWith(q)) empiezan.push(o);
      else if (n.includes(q)) contienen.push(o);
      if (empiezan.length >= maxSugerencias) break;
    }
    return [...empiezan, ...contienen].slice(0, maxSugerencias);
  }, [texto, opciones, seleccionada?.nombre, maxSugerencias]);

  function elegir(o: OpcionBuscable) {
    onChange(o.id);
    setTexto(o.nombre);
    setAbierto(false);
  }

  function teclado(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAbierto(true);
      setActivo((a) => Math.min(a + 1, filtradas.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (abierto && filtradas[activo]) {
        e.preventDefault();
        elegir(filtradas[activo]);
      }
    } else if (e.key === "Escape") {
      setAbierto(false);
      setTexto(seleccionada?.nombre || "");
    } else if (e.key === "Tab" && abierto && filtradas.length === 1) {
      elegir(filtradas[0]);
    }
  }

  useEffect(() => {
    const el = lista.current?.children[activo] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activo]);

  return (
    <div ref={caja} style={{ position: "relative" }}>
      <input
        type="text"
        value={texto}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={(e) => { setAbierto(true); setActivo(0); e.currentTarget.select(); }}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
          setActivo(0);
          if (!e.target.value) onChange("");
        }}
        onKeyDown={teclado}
        style={{ ...inputStyle, paddingRight: value ? 28 : undefined }}
      />
      {value && (
        <button type="button" tabIndex={-1} onClick={() => { onChange(""); setTexto(""); }}
          title="Quitar" style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>×</button>
      )}
      {/* Campo oculto para que el formulario valide "requerido" y envíe el valor en formularios GET */}
      <input tabIndex={-1} aria-hidden name={name} required={requerido} value={value} onChange={() => {}}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none", height: 1, width: 1, bottom: 0, left: 12 }} />
      {abierto && (
        <div ref={lista} style={{ position: "absolute", zIndex: 60, top: "calc(100% + 4px)", left: 0, right: 0, maxHeight: 240, overflowY: "auto",
          background: C.side, border: `1px solid ${C.line}`, borderRadius: 8, boxShadow: "0 10px 25px rgba(0,0,0,.4)" }}>
          {filtradas.length === 0 ? (
            <div style={{ padding: "0.55rem 0.75rem", color: C.muted, fontSize: 13 }}>Sin coincidencias</div>
          ) : filtradas.map((o, i) => (
            <div key={o.id} onMouseDown={(e) => { e.preventDefault(); elegir(o); }} onMouseEnter={() => setActivo(i)}
              style={{ padding: "0.5rem 0.75rem", fontSize: 13, cursor: "pointer", color: o.id === value ? C.amber : "white",
                background: i === activo ? "rgba(245,166,35,0.15)" : "transparent" }}>
              {o.nombre}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
