import Link from "next/link";
import { EncabezadoReporte } from "@/componentes/reportes/encabezado-reporte";
import { CeldaReporte, SIN_RESULTADOS, TablaReporte } from "@/componentes/reportes/tabla-reporte";
import { BotonImprimir } from "@/componentes/ui/boton-imprimir";
import { esquemaReporteDistribuciones, textoDeFiltros, type FiltroReporteDistribuciones } from "@/esquemas/reportes";
import { formatearFecha, hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { listarProductos } from "@/servicios/catalogos/productos";
import { listarRepresentantes } from "@/servicios/catalogos/representantes";
import { obtenerConfiguracion } from "@/servicios/configuracion";
import { reporteDistribuciones } from "@/servicios/reportes";

export const metadata = { title: "Reporte de distribuciones · Almacén Regional Oruro" };

/** R-2 para imprimir: todas las filas del rango, sin menú y con los controles ocultos al imprimir (E-04, E-05). */
export default async function PaginaImprimirReporteDistribuciones({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const { usuario } = await requerirSesion();

  const validacion = esquemaReporteDistribuciones.safeParse(await searchParams);
  const filtro: FiltroReporteDistribuciones = validacion.success
    ? validacion.data
    : { desde: inicioDelMesEnCurso(), hasta: hoyEnLaPaz(), incluirAnulados: false, pagina: 1 };

  const [reporte, representantes, productos, { modoDemostracion }] = await Promise.all([
    reporteDistribuciones({ ...filtro, representanteId: filtro.representante, productoId: filtro.producto, todas: true }),
    listarRepresentantes({ estado: "todos" }),
    listarProductos({ estado: "todos" }),
    obtenerConfiguracion(),
  ]);
  const nombreRepresentante = representantes.find((r) => r.id === filtro.representante)?.nombreCompleto;
  const nombreProducto = productos.find((p) => p.id === filtro.producto)?.nombre;

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/reportes/distribuciones" className="text-sm text-marca underline">
          ← Volver al reporte
        </Link>
        <BotonImprimir />
      </div>

      <EncabezadoReporte
        titulo="Reporte de distribuciones"
        filtros={textoDeFiltros([
          { etiqueta: `Del ${formatearFecha(filtro.desde)} al ${formatearFecha(filtro.hasta)}` },
          { etiqueta: "Representante", valor: nombreRepresentante },
          { etiqueta: "Producto", valor: nombreProducto },
          ...(filtro.incluirAnulados ? [{ etiqueta: "Incluye anuladas" }] : []),
        ])}
        emitidoPor={`${usuario.nombre} ${usuario.apellido}`}
        demostracion={modoDemostracion}
      />

      <TablaReporte
        encabezados={["Fecha", "Nº de vale", "Representante", "Servicio", "Código", "Producto", "Unidad", "Cantidad", "Estado"]}
        vacio={reporte.filas.length === 0 ? SIN_RESULTADOS : undefined}
      >
        {reporte.filas.map((fila) => (
          <tr key={fila.id}>
            <CeldaReporte>{formatearFecha(fila.fecha)}</CeldaReporte>
            <CeldaReporte>{fila.nroVale}</CeldaReporte>
            <CeldaReporte>{fila.representante}</CeldaReporte>
            <CeldaReporte>{fila.servicio}</CeldaReporte>
            <CeldaReporte>{fila.codigo}</CeldaReporte>
            <CeldaReporte>{fila.producto}</CeldaReporte>
            <CeldaReporte>{fila.unidad}</CeldaReporte>
            <CeldaReporte className="text-right tabular-nums">{fila.cantidad}</CeldaReporte>
            <CeldaReporte>{fila.estado === "ANULADA" ? "ANULADA" : "Registrada"}</CeldaReporte>
          </tr>
        ))}
      </TablaReporte>

      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Total entregado por producto (solo vigentes)</h2>
        {reporte.totales.porProducto.length === 0 ? (
          <p className="text-sm">Sin entregas en el período.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm">
            {reporte.totales.porProducto.map((producto) => (
              <li key={producto.codigo}>
                {producto.nombre}: {producto.cantidad} {producto.unidad}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
