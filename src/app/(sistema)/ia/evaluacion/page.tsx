import Link from "next/link";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { formatearPorcentaje, formatearUnDecimal } from "@/lib/numeros";
import { requerirSesion } from "@/lib/sesion";
import { evaluarCatalogo, MESES_DE_VALIDACION, METODOS_EVALUADOS } from "@/servicios/ia/evaluacion";

export const metadata = { title: "Evaluación del pronóstico · Almacén Regional Oruro" };

/** Celdas de MAE y WAPE de un método; el mejor lleva la marca "(mejor)" además del color (FR-009). */
function CeldasDeMetodo({ mae, wape, esMejor }: { mae: number; wape: number | null; esMejor: boolean }) {
  const estilo = esMejor ? "bg-green-50 font-semibold text-exito" : "";
  return (
    <>
      <Celda className={`text-right tabular-nums ${estilo}`}>
        {formatearUnDecimal(mae)}
        {esMejor && " (mejor)"}
      </Celda>
      <Celda className={`text-right tabular-nums ${estilo}`}>{formatearPorcentaje(wape)}</Celda>
    </>
  );
}

const ENCABEZADOS_METODOS = METODOS_EVALUADOS.flatMap(({ etiqueta }) => [`${etiqueta} · MAE`, `${etiqueta} · WAPE`]);

export default async function PaginaEvaluacion() {
  await requerirSesion();

  const { filas, general, mejorGeneral, evaluables } = await evaluarCatalogo();
  const evaluadas = filas.flatMap((fila) => (fila.evaluacion.evaluable ? [{ ...fila, evaluacion: fila.evaluacion }] : []));
  const noEvaluables = filas.flatMap((fila) => (fila.evaluacion.evaluable ? [] : [{ ...fila, motivo: fila.evaluacion.motivo }]));
  const etiquetaMejor = METODOS_EVALUADOS.find((m) => m.metodo === mejorGeneral)?.etiqueta;

  return (
    <section className="flex flex-col gap-4">
      <Link href="/ia" className="text-sm text-marca underline">
        ← Volver a inteligencia artificial
      </Link>

      <div>
        <h1 className="text-2xl font-bold sm:text-[28px]">Evaluación del pronóstico</h1>
        {etiquetaMejor ? (
          <p className="text-sm text-texto-suave">
            Sobre {evaluables === 1 ? "1 producto evaluable" : `${evaluables} productos evaluables`}, el método con menor error promedio es{" "}
            <strong>{etiquetaMejor}</strong>.
          </p>
        ) : (
          <p className="text-sm text-texto-suave">Todavía no hay productos con historia suficiente para evaluar.</p>
        )}
      </div>

      {/* FR-023: el procedimiento se explica en la pantalla, sin leer el código. */}
      <div className="flex flex-col gap-2 rounded-md border border-borde bg-white p-4 text-sm">
        <p className="font-medium">Cómo se evalúa</p>
        <ol className="list-decimal pl-5 text-texto-suave">
          <li>
            De la serie de consumo de cada producto se reservan los <strong>últimos {MESES_DE_VALIDACION} meses</strong>: el método no los ve.
          </li>
          <li>
            Con los meses anteriores, cada método pronostica esos {MESES_DE_VALIDACION} meses. Holt-Winters elige sus parámetros también solo
            con esos meses.
          </li>
          <li>Se compara cada pronóstico con lo que de verdad se consumió.</li>
        </ol>
        <p className="text-texto-suave">
          Compiten tres métodos: <strong>Holt-Winters</strong> (el que usa el sistema), <strong>ingenuo estacional</strong> (&quot;lo mismo que
          el mismo mes del año pasado&quot;) y <strong>promedio móvil</strong> (&quot;el promedio de los últimos 3 meses&quot;).
        </p>
        <p className="text-texto-suave">
          <strong>MAE</strong>: en promedio, cuántas unidades se equivoca por mes. <strong>WAPE</strong>: qué porcentaje de lo consumido fue
          error; sirve para comparar productos de distinto volumen. En los dos, <strong>menos es mejor</strong>. Se necesitan al menos 30
          meses (24 para ajustar y {MESES_DE_VALIDACION} para validar). Detalle paso a paso en{" "}
          <code className="rounded bg-gray-100 px-1">docs/metodo-pronostico.md</code>.
        </p>
      </div>

      {general.length > 0 && (
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Resultado general</h2>
          <Tabla encabezados={["Método", "MAE promedio", "WAPE global"]}>
            {general.map((resultado) => {
              const esMejor = resultado.metodo === mejorGeneral;
              return (
                <tr key={resultado.metodo}>
                  <Celda className={esMejor ? "font-semibold text-exito" : ""}>
                    {resultado.etiqueta}
                    {esMejor && " (mejor)"}
                  </Celda>
                  <CeldasDeMetodo mae={resultado.maePromedio} wape={resultado.wapeGlobal} esMejor={esMejor} />
                </tr>
              );
            })}
          </Tabla>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Por producto</h2>
        <Tabla
          encabezados={["Código", "Producto", ...ENCABEZADOS_METODOS, "Mejor método"]}
          vacio={evaluadas.length === 0 ? "Ningún producto tiene todavía 30 meses de historia" : undefined}
        >
          {evaluadas.map((fila) => (
            <tr key={fila.productoId}>
              <Celda>{fila.codigo}</Celda>
              <Celda>{fila.nombre}</Celda>
              {fila.evaluacion.porMetodo.map((resultado) => (
                <CeldasDeMetodo key={resultado.metodo} mae={resultado.mae} wape={resultado.wape} esMejor={resultado.metodo === fila.evaluacion.mejor} />
              ))}
              <Celda className="font-semibold">{METODOS_EVALUADOS.find((m) => m.metodo === fila.evaluacion.mejor)?.etiqueta}</Celda>
            </tr>
          ))}
        </Tabla>
      </div>

      {noEvaluables.length > 0 && (
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Productos no evaluables</h2>
          <Tabla encabezados={["Código", "Producto", "Motivo"]}>
            {noEvaluables.map((fila) => (
              <tr key={fila.productoId}>
                <Celda>{fila.codigo}</Celda>
                <Celda>{fila.nombre}</Celda>
                <Celda>{fila.motivo}</Celda>
              </tr>
            ))}
          </Tabla>
        </div>
      )}
    </section>
  );
}
