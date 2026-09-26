import Link from "next/link";
import { EncabezadoReporte } from "@/componentes/reportes/encabezado-reporte";
import { CeldaReporte, SIN_RESULTADOS, TablaReporte } from "@/componentes/reportes/tabla-reporte";
import { Aviso } from "@/componentes/ui/aviso";
import { InsigniaDocumento } from "@/componentes/ui/insignia-documento";
import { Paginacion } from "@/componentes/ui/paginacion";
import { esquemaReporteDistribuciones, textoDeFiltros, type FiltroReporteDistribuciones } from "@/esquemas/reportes";
import { formatearFecha, hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { listarProductos } from "@/servicios/catalogos/productos";
import { listarRepresentantes } from "@/servicios/catalogos/representantes";
import { obtenerConfiguracion } from "@/servicios/configuracion";
import { FILAS_POR_PAGINA_REPORTE, reporteDistribuciones } from "@/servicios/reportes";
import { FiltrosReporteDistribuciones } from "./filtros-reporte-distribuciones";
import { parametrosDeDistribuciones } from "./parametros";

export const metadata = { title: "Reporte de distribuciones · Almacén Regional Oruro" };

export default async function PaginaReporteDistribuciones({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const { usuario } = await requerirSesion();

  // Un valor inválido no rompe el reporte: se muestra el mes en curso con un aviso (FR-002).
  const validacion = esquemaReporteDistribuciones.safeParse(await searchParams);
  const filtro: FiltroReporteDistribuciones = validacion.success
    ? validacion.data
    : { desde: inicioDelMesEnCurso(), hasta: hoyEnLaPaz(), incluirAnulados: false, pagina: 1 };

  const [reporte, representantes, productos, { modoDemostracion }] = await Promise.all([
    reporteDistribuciones({ ...filtro, representanteId: filtro.representante, productoId: filtro.producto }),
    listarRepresentantes({ estado: "todos" }),
    listarProductos({ estado: "todos" }),
    obtenerConfiguracion(),
  ]);
  const paginas = Math.max(1, Math.ceil(reporte.total / FILAS_POR_PAGINA_REPORTE));
  const parametros = parametrosDeDistribuciones(filtro);
  const nombreRepresentante = representantes.find((r) => r.id === filtro.representante)?.nombreCompleto;
  const nombreProducto = productos.find((p) => p.id === filtro.producto)?.nombre;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/reportes" className="text-sm text-marca underline">
          ← Volver a reportes
        </Link>
        <Link
          href={`/reportes/distribuciones/imprimir?${parametros.toString()}`}
          className="rounded-md border border-marca bg-white px-4 py-2 text-sm font-medium text-marca hover:bg-fondo"
        >
          Imprimir
        </Link>
      </div>

      <FiltrosReporteDistribuciones
        valores={filtro}
        representantes={representantes.map((r) => ({ id: r.id, etiqueta: `${r.nombreCompleto} · ${r.servicio}${r.activo ? "" : " (inactivo)"}` }))}
        productos={productos.map((p) => ({ id: p.id, etiqueta: `${p.codigo} · ${p.nombre}${p.activo ? "" : " (inactivo)"}` }))}
      />
      {!validacion.success && (
        <Aviso tipo="error">{validacion.error.issues[0]?.message ?? "Filtros inválidos"}. Se muestra el mes en curso.</Aviso>
      )}

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
            <CeldaReporte>
              <InsigniaDocumento estado={fila.estado} />
            </CeldaReporte>
          </tr>
        ))}
      </TablaReporte>

      {/* FR-003: el total por producto suma solo las distribuciones vigentes del rango. */}
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Total entregado por producto (solo vigentes)</h2>
        {reporte.totales.porProducto.length === 0 ? (
          <p className="text-sm text-texto-suave">Sin entregas en el período.</p>
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

      <Paginacion
        pagina={filtro.pagina}
        paginas={paginas}
        enlace={(numero) => `/reportes/distribuciones?${parametros.toString()}&pagina=${numero}`}
      />
    </section>
  );
}
