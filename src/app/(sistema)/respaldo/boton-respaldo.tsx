"use client";

import { useState, useTransition } from "react";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import { generarRespaldoAccion } from "./acciones";

type Estado = { tipo: "exito" | "error"; mensaje: string } | null;

/** El navegador guarda el texto como archivo: un enlace temporal con "download" que se pulsa solo. */
function descargar(nombreArchivo: string, contenido: string) {
  const archivo = new Blob([contenido], { type: "application/sql;charset=utf-8" });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}

/**
 * Botón de respaldo (FR-021): mientras se genera, dice "Generando…" y no se puede volver a pulsar. Solo
 * descarga si el servidor devolvió el archivo completo; si no, muestra qué pasó (FR-020).
 */
export function BotonRespaldo() {
  const [generando, iniciar] = useTransition();
  const [estado, setEstado] = useState<Estado>(null);

  function generar() {
    setEstado(null);
    iniciar(async () => {
      const resultado = await generarRespaldoAccion();
      if (!resultado.ok) {
        setEstado({ tipo: "error", mensaje: resultado.mensaje });
        return;
      }
      descargar(resultado.datos.nombreArchivo, resultado.datos.contenido);
      setEstado({ tipo: "exito", mensaje: `Respaldo generado: ${resultado.datos.nombreArchivo}` });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {estado && <Aviso tipo={estado.tipo}>{estado.mensaje}</Aviso>}
      <Boton onClick={generar} disabled={generando} className="self-start">
        {generando ? "Generando…" : "Generar respaldo"}
      </Boton>
    </div>
  );
}
