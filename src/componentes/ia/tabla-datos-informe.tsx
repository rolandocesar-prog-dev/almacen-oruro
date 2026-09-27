import { CeldaReporte, TablaReporte } from "@/componentes/reportes/tabla-reporte";
import { formatearBolivianos } from "@/lib/dinero";
import { formatearFecha, formatearMes } from "@/lib/fechas";
import { formatearUnDecimal } from "@/lib/numeros";
import type { DatosInformeCompras, DatosInformeDistribuciones } from "@/servicios/ia/informes";

// Tabla de datos de entrada de un Informe IA (FR-013, research A-09). Muestra exactamente el objeto que se
// envió al modelo y se guardó con el informe: así cada cifra del texto se busca aquí (SC-007). La comparten
// la ficha y la hoja impresa, y usa `TablaReporte` —sin contenedor con desplazamiento— para que al imprimir
// el encabezado de cada tabla se repita en cada hoja (research E-06).

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1 break-inside-avoid-page">
      <h3 className="text-base font-semibold">{titulo}</h3>
      {children}
    </section>
  );
}

const derecha = "text-right tabular-nums";
const VACIO = "Sin datos";

/** Variación con su signo, o "sin período anterior" cuando no hay contra qué comparar. */
function variacion(valor: number | null): string {
  if (valor === null) return "Sin período anterior con qué comparar";
  return `${valor > 0 ? "+" : ""}${formatearUnDecimal(valor)} %`;
}

function Periodo({ periodo }: { periodo: DatosInformeCompras["periodo"] }) {
  return (
    <p className="text-sm">
      Período: del {formatearFecha(periodo.desde)} al {formatearFecha(periodo.hasta)} · Período anterior de igual duración: del{" "}
      {formatearFecha(periodo.anteriorDesde)} al {formatearFecha(periodo.anteriorHasta)}
    </p>
  );
}

function DatosCompras({ datos }: { datos: DatosInformeCompras }) {
  const { totales } = datos;
  return (
    <>
      <Periodo periodo={datos.periodo} />
      <Bloque titulo="Totales">
        <TablaReporte encabezados={["Concepto", "Período", "Período anterior", "Variación"]}>
          <tr>
            <CeldaReporte>Total gastado</CeldaReporte>
            <CeldaReporte className={derecha}>{formatearBolivianos(totales.totalGastado)}</CeldaReporte>
            <CeldaReporte className={derecha}>{formatearBolivianos(totales.totalGastadoAnterior)}</CeldaReporte>
            <CeldaReporte className={derecha}>{variacion(totales.variacionGastoPorcentual)}</CeldaReporte>
          </tr>
          <tr>
            <CeldaReporte>Compras</CeldaReporte>
            <CeldaReporte className={derecha}>{totales.compras}</CeldaReporte>
            <CeldaReporte className={derecha}>{totales.comprasAnterior}</CeldaReporte>
            <CeldaReporte className={derecha}>{variacion(totales.variacionComprasPorcentual)}</CeldaReporte>
          </tr>
        </TablaReporte>
      </Bloque>
      <Bloque titulo="Gasto por proveedor">
        <TablaReporte encabezados={["Proveedor", "Compras", "Total gastado"]} vacio={datos.porProveedor.length === 0 ? VACIO : undefined}>
          {datos.porProveedor.map((fila) => (
            <tr key={fila.proveedor}>
              <CeldaReporte>{fila.proveedor}</CeldaReporte>
              <CeldaReporte className={derecha}>{fila.compras}</CeldaReporte>
              <CeldaReporte className={derecha}>{formatearBolivianos(fila.totalGastado)}</CeldaReporte>
            </tr>
          ))}
        </TablaReporte>
      </Bloque>
      <Bloque titulo="Productos con más gasto">
        <TablaReporte encabezados={["Código", "Producto", "Unidades", "Total gastado"]} vacio={datos.topProductos.length === 0 ? VACIO : undefined}>
          {datos.topProductos.map((fila) => (
            <tr key={fila.codigo}>
              <CeldaReporte>{fila.codigo}</CeldaReporte>
              <CeldaReporte>{fila.producto}</CeldaReporte>
              <CeldaReporte className={derecha}>{fila.unidades}</CeldaReporte>
              <CeldaReporte className={derecha}>{formatearBolivianos(fila.totalGastado)}</CeldaReporte>
            </tr>
          ))}
        </TablaReporte>
      </Bloque>
      <SituacionDelAlmacen datos={datos} />
    </>
  );
}

function SituacionDelAlmacen({ datos }: { datos: Pick<DatosInformeCompras, "bajoMinimo" | "reposicion"> }) {
  return (
    <>
      <Bloque titulo="Productos bajo el stock mínimo (al generar el informe)">
        <TablaReporte encabezados={["Código", "Producto", "Stock actual", "Stock mínimo"]} vacio={datos.bajoMinimo.length === 0 ? VACIO : undefined}>
          {datos.bajoMinimo.map((fila) => (
            <tr key={fila.codigo}>
              <CeldaReporte>{fila.codigo}</CeldaReporte>
              <CeldaReporte>{fila.producto}</CeldaReporte>
              <CeldaReporte className={derecha}>{fila.stockActual}</CeldaReporte>
              <CeldaReporte className={derecha}>{fila.stockMinimo}</CeldaReporte>
            </tr>
          ))}
        </TablaReporte>
      </Bloque>
      <Bloque titulo="Reposición sugerida (al generar el informe)">
        <TablaReporte encabezados={["Código", "Producto", "Pronóstico del mes", "Reposición sugerida"]} vacio={datos.reposicion.length === 0 ? VACIO : undefined}>
          {datos.reposicion.map((fila) => (
            <tr key={fila.codigo}>
              <CeldaReporte>{fila.codigo}</CeldaReporte>
              <CeldaReporte>{fila.producto}</CeldaReporte>
              <CeldaReporte className={derecha}>{formatearUnDecimal(fila.pronostico)}</CeldaReporte>
              <CeldaReporte className={derecha}>{fila.reposicionSugerida}</CeldaReporte>
            </tr>
          ))}
        </TablaReporte>
      </Bloque>
    </>
  );
}

const ESTADOS = [
  ["PENDIENTE", "Pendientes"],
  ["PARCIAL", "Parciales"],
  ["ATENDIDO", "Atendidos"],
  ["ANULADO", "Anulados"],
] as const;

// Los informes guardados antes de F-009 agrupaban por representante y SERVICIO. Un informe guardado no se
// modifica nunca (principio IV, research O-05), así que la tabla muestra la columna de su propio formato.
type FilaPorRepresentante = { representante: string; unidades: number; centroSalud?: string; servicio?: string };

function DatosDistribuciones({ datos }: { datos: DatosInformeDistribuciones }) {
  const filas: FilaPorRepresentante[] = datos.porRepresentante;
  const formatoAnterior = filas.some((fila) => fila.servicio !== undefined);
  return (
    <>
      <Periodo periodo={datos.periodo} />
      <Bloque titulo="Totales">
        <TablaReporte encabezados={["Concepto", "Período", "Período anterior", "Variación"]}>
          <tr>
            <CeldaReporte>Unidades entregadas</CeldaReporte>
            <CeldaReporte className={derecha}>{datos.totales.unidadesEntregadas}</CeldaReporte>
            <CeldaReporte className={derecha}>{datos.totales.unidadesEntregadasAnterior}</CeldaReporte>
            <CeldaReporte className={derecha}>{variacion(datos.totales.variacionPorcentual)}</CeldaReporte>
          </tr>
        </TablaReporte>
      </Bloque>
      <Bloque titulo={formatoAnterior ? "Unidades entregadas por representante" : "Unidades entregadas por centro de salud"}>
        <TablaReporte
          encabezados={formatoAnterior ? ["Representante", "Servicio", "Unidades"] : ["Centro de salud", "Representante", "Unidades"]}
          vacio={filas.length === 0 ? VACIO : undefined}
        >
          {filas.map((fila) => (
            <tr key={`${fila.representante}-${fila.centroSalud ?? fila.servicio}`}>
              {formatoAnterior ? (
                <>
                  <CeldaReporte>{fila.representante}</CeldaReporte>
                  <CeldaReporte>{fila.servicio}</CeldaReporte>
                </>
              ) : (
                <>
                  <CeldaReporte>{fila.centroSalud}</CeldaReporte>
                  <CeldaReporte>{fila.representante}</CeldaReporte>
                </>
              )}
              <CeldaReporte className={derecha}>{fila.unidades}</CeldaReporte>
            </tr>
          ))}
        </TablaReporte>
      </Bloque>
      <Bloque titulo="Productos más distribuidos">
        <TablaReporte encabezados={["Código", "Producto", "Unidad", "Unidades"]} vacio={datos.topProductos.length === 0 ? VACIO : undefined}>
          {datos.topProductos.map((fila) => (
            <tr key={fila.codigo}>
              <CeldaReporte>{fila.codigo}</CeldaReporte>
              <CeldaReporte>{fila.producto}</CeldaReporte>
              <CeldaReporte>{fila.unidad}</CeldaReporte>
              <CeldaReporte className={derecha}>{fila.unidades}</CeldaReporte>
            </tr>
          ))}
        </TablaReporte>
      </Bloque>
      <Bloque titulo="Pedidos del período por estado">
        <TablaReporte encabezados={ESTADOS.map(([, etiqueta]) => etiqueta)}>
          <tr>
            {ESTADOS.map(([estado]) => (
              <CeldaReporte key={estado} className={derecha}>
                {datos.pedidosPorEstado[estado]}
              </CeldaReporte>
            ))}
          </tr>
        </TablaReporte>
      </Bloque>
      <Bloque titulo="Pronóstico de los productos principales (al generar el informe)">
        <TablaReporte encabezados={["Código", "Producto", "Mes", "Pronóstico"]} vacio={datos.pronostico.length === 0 ? VACIO : undefined}>
          {datos.pronostico.map((fila) => (
            <tr key={fila.codigo}>
              <CeldaReporte>{fila.codigo}</CeldaReporte>
              <CeldaReporte>{fila.producto}</CeldaReporte>
              <CeldaReporte>{formatearMes(fila.mes)}</CeldaReporte>
              <CeldaReporte className={derecha}>{formatearUnDecimal(fila.pronostico)}</CeldaReporte>
            </tr>
          ))}
        </TablaReporte>
      </Bloque>
    </>
  );
}

/**
 * Datos de entrada del informe según su tipo. `datosEntrada` es JSON guardado por `generarInforme` con la
 * forma de `datosInformeCompras` o `datosInformeDistribuciones`, que nunca se modifica (FR-014).
 */
export function TablaDatosInforme({ tipo, datos }: { tipo: "COMPRAS" | "DISTRIBUCIONES"; datos: unknown }) {
  return (
    <div className="flex flex-col gap-4">
      {tipo === "COMPRAS" ? (
        <DatosCompras datos={datos as DatosInformeCompras} />
      ) : (
        <DatosDistribuciones datos={datos as DatosInformeDistribuciones} />
      )}
    </div>
  );
}
