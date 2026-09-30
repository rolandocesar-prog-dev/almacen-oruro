import Link from "next/link";
import { EncabezadoReporte } from "@/componentes/reportes/encabezado-reporte";
import { NOMBRE_DEL_TIPO } from "@/componentes/reportes/etiquetas-movimiento";
import { CeldaReporte, TablaReporte } from "@/componentes/reportes/tabla-reporte";
import { BotonImprimir } from "@/componentes/ui/boton-imprimir";
import { esquemaReporteKardex, textoDeFiltros, type FiltroReporteKardex } from "@/esquemas/reportes";
import { formatearFecha, hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { reporteKardex } from "@/servicios/reportes";

export const metadata = { title: "Reporte de kardex · Almacén Regional Oruro" };

/** R-4 para imprimir: sin menú y con los controles ocultos al imprimir (E-05). */
export default async function PaginaImprimirReporteKardex({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const { usuario } = await requerirSesion();

  const validacion = esquemaReporteKardex.safeParse(await searchParams);
  const filtro: FiltroReporteKardex = validacion.success ? validacion.data : { desde: inicioDelMesEnCurso(), hasta: hoyEnLaPaz() };

  const reporte = filtro.producto ? await reporteKardex(filtro.producto, { desde: filtro.desde, hasta: filtro.hasta }) : null;

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/reportes/kardex" className="text-sm text-marca underline">
          ← Volver al reporte
        </Link>
        {reporte && <BotonImprimir />}
      </div>

      {!reporte ? (
        <p>Elige un producto para ver su kardex.</p>
      ) : (
        <>
          <EncabezadoReporte
            titulo={`Kardex de ${reporte.producto.codigo} · ${reporte.producto.nombre}`}
            filtros={textoDeFiltros([
              { etiqueta: `Del ${formatearFecha(filtro.desde)} al ${formatearFecha(filtro.hasta)}` },
              { etiqueta: "Unidad", valor: reporte.producto.unidadMedida.nombre },
            ])}
            emitidoPor={`${usuario.nombre} ${usuario.apellido}`}
          />

          <p className="text-base font-semibold">Saldo inicial: {reporte.saldoInicial}</p>

          <TablaReporte
            encabezados={["Fecha", "Tipo", "Documento", "Entrada", "Salida", "Saldo"]}
            vacio={reporte.movimientos.length === 0 ? "Sin movimientos en el período" : undefined}
          >
            {reporte.movimientos.map((movimiento) => (
              <tr key={movimiento.id}>
                <CeldaReporte>{formatearFecha(movimiento.fechaDocumento)}</CeldaReporte>
                <CeldaReporte>{NOMBRE_DEL_TIPO[movimiento.tipo]}</CeldaReporte>
                <CeldaReporte>{movimiento.documento?.texto ?? "—"}</CeldaReporte>
                <CeldaReporte className="text-right tabular-nums">{movimiento.entrada ?? "—"}</CeldaReporte>
                <CeldaReporte className="text-right tabular-nums">{movimiento.salida ?? "—"}</CeldaReporte>
                <CeldaReporte className="text-right tabular-nums">{movimiento.saldoResultante}</CeldaReporte>
              </tr>
            ))}
          </TablaReporte>

          <p className="text-base font-semibold">Saldo final: {reporte.saldoFinal}</p>
        </>
      )}
    </article>
  );
}
