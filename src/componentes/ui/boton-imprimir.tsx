"use client";

import { Boton } from "@/componentes/ui/boton";

/** Abre el diálogo de impresión del navegador, que también permite guardar el vale como PDF (research V-09). */
export function BotonImprimir() {
  return <Boton onClick={() => window.print()}>Imprimir</Boton>;
}
