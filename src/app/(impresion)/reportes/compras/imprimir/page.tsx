import Link from "next/link";
import { EncabezadoReporte } from "@/componentes/reportes/encabezado-reporte";
import { CeldaReporte, SIN_RESULTADOS, TablaReporte } from "@/componentes/reportes/tabla-reporte";
import { BotonImprimir } from "@/componentes/ui/boton-imprimir";
import { esquemaReporteCompras, textoDeFiltros, type FiltroReporteCompras } from "@/esquemas/reportes";
import { formatearBolivianos } from "@/lib/dinero";
import { formatearFecha, hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { listarProveedores } from "@/servicios/catalogos/proveedores";
import { obtenerConfiguracion } from "@/servicios/configuracion";
import { reporteCompras } from "@/servicios/reportes";

export const metadata = { title: "Reporte de compras · Almacén Regional Oruro" };

/**
 * R-1 para imprimir (FR-006): la misma consulta con los mismos filtros de la dirección, con **todas** las
 * filas del rango (research E-04) y sin el menú del sistema. Los controles llevan `print:hidden`: no salen
 * en la hoja.
 */
export default async function PaginaImprimirReporteCompras({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const { usuario } = await requerirSesion();

  const validacion = esquemaReporteCompras.safeParse(await searchParams);
  const filtro: FiltroReporteCompras = validacion.success
    ? validacion.data
    : { desde: inicioDelMesEnCurso(), hasta: hoyEnLaPaz(), incluirAnulados: false, pagina: 1 };

  const [reporte, proveedores, { modoDemostracion }] = await Promise.all([
    reporteCompras({ ...filtro, proveedorId: filtro.proveedor, todas: true }),
    listarProveedores({ estado: "todos" }),
    obtenerConfiguracion(),
  ]);
  const nombreProveedor = proveedores.find((proveedor) => proveedor.id === filtro.proveedor)?.razonSocial;

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/reportes/compras" className="text-sm text-marca underline">
          ← Volver al reporte
        </Link>
        <BotonImprimir />
      </div>

      <EncabezadoReporte
        titulo="Reporte de compras"
        filtros={textoDeFiltros([
          { etiqueta: `Del ${formatearFecha(filtro.desde)} al ${formatearFecha(filtro.hasta)}` },
          { etiqueta: "Proveedor", valor: nombreProveedor },
          ...(filtro.incluirAnulados ? [{ etiqueta: "Incluye anuladas" }] : []),
        ])}
        emitidoPor={`${usuario.nombre} ${usuario.apellido}`}
        demostracion={modoDemostracion}
      />

      <TablaReporte encabezados={["Fecha", "Nº de factura", "Proveedor", "Ítems", "Total", "Estado"]} vacio={reporte.filas.length === 0 ? SIN_RESULTADOS : undefined}>
        {reporte.filas.map((fila) => (
          <tr key={fila.id}>
            <CeldaReporte>{formatearFecha(fila.fecha)}</CeldaReporte>
            <CeldaReporte>{fila.nroFactura}</CeldaReporte>
            <CeldaReporte>{fila.proveedor}</CeldaReporte>
            <CeldaReporte className="text-right tabular-nums">{fila.items}</CeldaReporte>
            <CeldaReporte className="text-right tabular-nums">{formatearBolivianos(fila.total)}</CeldaReporte>
            <CeldaReporte>{fila.estado === "ANULADA" ? "ANULADA" : "Registrada"}</CeldaReporte>
          </tr>
        ))}
      </TablaReporte>

      <p className="text-base font-semibold">
        Total gastado: {formatearBolivianos(reporte.totales.totalGastado)} ·{" "}
        {reporte.totales.compras === 1 ? "1 compra" : `${reporte.totales.compras} compras`} (solo vigentes)
      </p>
    </article>
  );
}
