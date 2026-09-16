import { seccionesDeTexto } from "@/servicios/ia/texto-informe";

/** Texto de un Informe IA con sus cuatro secciones (FR-013). Lo comparten la ficha y la impresión. */
export function TextoInforme({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col gap-3">
      {seccionesDeTexto(texto).map((seccion) => (
        <section key={seccion.titulo} className="break-inside-avoid">
          <h3 className="text-base font-semibold">{seccion.titulo}</h3>
          {seccion.parrafos.map((parrafo) => (
            <p key={parrafo} className="text-sm leading-relaxed">
              {parrafo}
            </p>
          ))}
          {seccion.vinetas.length > 0 && (
            <ul className="list-disc pl-5 text-sm leading-relaxed">
              {seccion.vinetas.map((vineta) => (
                <li key={vineta}>{vineta}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

/** Nota obligatoria junto al texto (FR-013, research A-11). */
export const NOTA_TEXTO_REDACTADO = "Texto redactado por un modelo de lenguaje a partir de los datos de la tabla";

export const TITULO_DEL_INFORME = {
  COMPRAS: "Informe IA de compras",
  DISTRIBUCIONES: "Informe IA de distribuciones",
} as const;
