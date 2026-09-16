import { formatearMes, formatearMesCorto } from "@/lib/fechas";
import { formatearUnDecimal } from "@/lib/numeros";
import type { DetalleDePronostico } from "@/servicios/ia/detalle";

// Gráfico de consumo y pronóstico (F-007, Historia 7; FR-017, research A-12). SVG dibujado en el servidor,
// sin librería: son unas 40 barras. Dos colores de serie validados para daltonismo (azul y naranja) y,
// además del color, forma y textura: el consumo son barras lisas, el pronóstico de validación es una línea
// con puntos y el pronóstico del mes es una barra rayada. Cada marca lleva su valor en un <title>, que el
// navegador muestra al pasar el mouse. Debajo va la tabla con los mismos números.

const COLOR_CONSUMO = "#2a78d6";
const COLOR_PRONOSTICO = "#eb6834";
const COLOR_EJE = "#5f6b7a";
const COLOR_GRILLA = "#e4e7eb";

const ANCHO = 760;
const ALTO = 300;
const MARGEN = { arriba: 28, derecha: 12, abajo: 44, izquierda: 44 };

/** Escala "linda" del eje vertical: el máximo redondeado hacia arriba a 1, 2 o 5 × 10ⁿ. */
function maximoDelEje(valor: number): number {
  if (valor <= 0) return 10;
  const potencia = 10 ** Math.floor(Math.log10(valor));
  const paso = [1, 2, 5, 10].find((factor) => factor * potencia >= valor) ?? 10;
  return paso * potencia;
}

export function GraficoConsumo({ detalle }: { detalle: DetalleDePronostico }) {
  const { serie, validacion, mesPronosticado, pronostico } = detalle;
  const meses = [...serie.map((punto) => punto.mes), mesPronosticado];
  const maximo = maximoDelEje(Math.max(pronostico, ...serie.map((p) => p.consumo), ...validacion.map((v) => v.pronostico)));

  const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha;
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const paso = anchoUtil / meses.length;
  // Barras finas con un espacio de al menos 2 px entre vecinas.
  const anchoBarra = Math.max(2, Math.min(18, paso - 2));
  const x = (indice: number) => MARGEN.izquierda + paso * indice + paso / 2;
  const y = (valor: number) => MARGEN.arriba + altoUtil - (valor / maximo) * altoUtil;
  const base = y(0);
  // Una etiqueta de mes cada tanto, para que no se encimen.
  const cadaCuanto = Math.ceil(meses.length / 12);
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((fraccion) => Math.round(maximo * fraccion));

  const indiceDe = new Map(meses.map((mes, indice) => [mes, indice]));
  const puntosValidacion = validacion.map((v) => ({ ...v, cx: x(indiceDe.get(v.mes) ?? 0), cy: y(v.pronostico) }));

  /** Barra con el extremo superior redondeado y la base recta sobre el eje. */
  function barra(indice: number, valor: number, relleno: string) {
    const alto = base - y(valor);
    if (alto <= 0) return null;
    const radio = Math.min(4, anchoBarra / 2, alto);
    const izquierda = x(indice) - anchoBarra / 2;
    const derecha = izquierda + anchoBarra;
    const arriba = y(valor);
    const d = `M${izquierda},${base} V${arriba + radio} Q${izquierda},${arriba} ${izquierda + radio},${arriba} H${derecha - radio} Q${derecha},${arriba} ${derecha},${arriba + radio} V${base} Z`;
    return <path d={d} fill={relleno} />;
  }

  return (
    <figure className="flex flex-col gap-2">
      {/* Leyenda siempre visible: la identidad de cada serie no depende solo del color. */}
      <ul className="flex flex-wrap gap-4 text-sm">
        <li className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-3 w-3 rounded-sm" style={{ background: COLOR_CONSUMO }} />
          Consumo mensual (barras)
        </li>
        {validacion.length > 0 && (
          <li className="flex items-center gap-2">
            <svg aria-hidden width="22" height="10">
              <line x1="0" y1="5" x2="22" y2="5" stroke={COLOR_PRONOSTICO} strokeWidth="2" />
              <circle cx="11" cy="5" r="4" fill={COLOR_PRONOSTICO} stroke="#fff" strokeWidth="2" />
            </svg>
            Pronóstico de Holt-Winters para los 6 meses de validación (línea)
          </li>
        )}
        <li className="flex items-center gap-2">
          <svg aria-hidden width="12" height="12">
            <rect width="12" height="12" rx="2" fill="url(#rayado-pronostico)" stroke={COLOR_PRONOSTICO} />
          </svg>
          Pronóstico de {formatearMes(mesPronosticado)} (barra rayada)
        </li>
      </ul>

      <div className="overflow-x-auto rounded-md border border-borde bg-white p-2">
        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          className="h-auto w-full min-w-[560px]"
          role="img"
          aria-label={`Consumo mensual de ${detalle.producto.nombre} y pronóstico de ${formatearMes(mesPronosticado)}: ${formatearUnDecimal(pronostico)} ${detalle.producto.unidad}`}
        >
          <defs>
            <pattern id="rayado-pronostico" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#fde3d8" />
              <line x1="0" y1="0" x2="0" y2="6" stroke={COLOR_PRONOSTICO} strokeWidth="3" />
            </pattern>
          </defs>

          {/* Grilla y eje vertical, discretos. */}
          {marcas.map((valor) => (
            <g key={valor}>
              <line x1={MARGEN.izquierda} x2={ANCHO - MARGEN.derecha} y1={y(valor)} y2={y(valor)} stroke={COLOR_GRILLA} />
              <text x={MARGEN.izquierda - 6} y={y(valor) + 4} textAnchor="end" fontSize="11" fill={COLOR_EJE}>
                {valor}
              </text>
            </g>
          ))}
          <text x={4} y={12} fontSize="11" fill={COLOR_EJE}>
            {detalle.producto.unidad}
          </text>

          {serie.map((punto, indice) => (
            <g key={punto.mes}>
              <title>{`${formatearMes(punto.mes)}: consumo ${punto.consumo}`}</title>
              {/* Área sensible más grande que la barra, para que el tooltip aparezca sin apuntar fino. */}
              <rect x={x(indice) - paso / 2} y={MARGEN.arriba} width={paso} height={altoUtil} fill="transparent" />
              {barra(indice, punto.consumo, COLOR_CONSUMO)}
            </g>
          ))}

          <g>
            <title>{`${formatearMes(mesPronosticado)}: pronóstico ${formatearUnDecimal(pronostico)}`}</title>
            <rect x={x(meses.length - 1) - paso / 2} y={MARGEN.arriba} width={paso} height={altoUtil} fill="transparent" />
            {barra(meses.length - 1, pronostico, "url(#rayado-pronostico)")}
            <text x={x(meses.length - 1)} y={y(pronostico) - 6} textAnchor="end" fontSize="11" fill="#1f2933">
              {formatearUnDecimal(pronostico)}
            </text>
          </g>

          {puntosValidacion.length > 0 && (
            <polyline
              points={puntosValidacion.map((p) => `${p.cx},${p.cy}`).join(" ")}
              fill="none"
              stroke={COLOR_PRONOSTICO}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )}
          {puntosValidacion.map((p) => (
            <g key={p.mes}>
              <title>{`${formatearMes(p.mes)}: pronóstico ${formatearUnDecimal(p.pronostico)} · real ${p.real}`}</title>
              <circle cx={p.cx} cy={p.cy} r="4" fill={COLOR_PRONOSTICO} stroke="#fff" strokeWidth="2" />
            </g>
          ))}

          {/* Eje horizontal. */}
          <line x1={MARGEN.izquierda} x2={ANCHO - MARGEN.derecha} y1={base} y2={base} stroke={COLOR_EJE} />
          {meses.map((mes, indice) =>
            indice % cadaCuanto === 0 || indice === meses.length - 1 ? (
              <text key={mes} x={x(indice)} y={base + 16} textAnchor="middle" fontSize="11" fill={COLOR_EJE}>
                {formatearMesCorto(mes)}
              </text>
            ) : null,
          )}
        </svg>
      </div>
      <figcaption className="text-sm text-gray-600">
        Pasa el mouse sobre una barra o un punto para ver su valor. Los mismos números están en la tabla de abajo.
      </figcaption>
    </figure>
  );
}
