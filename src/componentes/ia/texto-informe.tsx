import { seccionesDeTexto } from "@/servicios/ia/texto-informe";
import { ADVERTENCIA_CIFRA, contarCifrasNoEncontradas, marcarCifras, numerosDeLosDatos } from "@/servicios/ia/verificacion-cifras";

/** Una línea del texto con las cifras que no están en los datos resaltadas y advertidas (FR-025). */
function LineaVerificada({ texto, numeros }: { texto: string; numeros: number[] }) {
  return marcarCifras(texto, numeros).map((fragmento, indice) =>
    fragmento.noEncontrada ? (
      // Resaltado con fondo y, además, con la advertencia escrita: se entiende impreso en blanco y negro.
      <mark key={indice} title={ADVERTENCIA_CIFRA} className="rounded bg-amber-100 px-0.5 font-semibold text-aviso">
        {fragmento.texto} <span className="text-xs font-normal">[{ADVERTENCIA_CIFRA}]</span>
      </mark>
    ) : (
      <span key={indice}>{fragmento.texto}</span>
    ),
  );
}

/**
 * Texto de un Informe IA con sus cuatro secciones (FR-013). Lo comparten la ficha y la impresión. Cada
 * número se compara con los datos con que se redactó y los que no aparecen se marcan (FR-025).
 */
export function TextoInforme({ texto, datos }: { texto: string; datos: unknown }) {
  const numeros = numerosDeLosDatos(datos);
  const noEncontradas = contarCifrasNoEncontradas(texto, datos);

  return (
    <div className="flex min-w-0 flex-col gap-3 wrap-anywhere">
      <p className={`text-xs ${noEncontradas > 0 ? "font-semibold text-aviso" : "text-gray-600"}`}>
        {noEncontradas === 0
          ? "Todas las cifras del texto están en la tabla de datos."
          : `${noEncontradas === 1 ? "1 cifra del texto no está" : `${noEncontradas} cifras del texto no están`} en la tabla de datos: se marcan con "${ADVERTENCIA_CIFRA}".`}
      </p>
      {seccionesDeTexto(texto).map((seccion) => (
        <section key={seccion.titulo} className="break-inside-avoid">
          <h3 className="text-base font-semibold">{seccion.titulo}</h3>
          {seccion.parrafos.map((parrafo) => (
            <p key={parrafo} className="text-sm leading-relaxed">
              <LineaVerificada texto={parrafo} numeros={numeros} />
            </p>
          ))}
          {seccion.vinetas.length > 0 && (
            <ul className="list-disc pl-5 text-sm leading-relaxed">
              {seccion.vinetas.map((vineta) => (
                <li key={vineta}>
                  <LineaVerificada texto={vineta} numeros={numeros} />
                </li>
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
