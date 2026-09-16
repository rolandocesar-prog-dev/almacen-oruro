import Link from "next/link";
import { EncabezadoReporte } from "@/componentes/reportes/encabezado-reporte";
import { CeldaReporte, SIN_RESULTADOS, TablaReporte } from "@/componentes/reportes/tabla-reporte";
import { Aviso } from "@/componentes/ui/aviso";
import { InsigniaDocumento } from "@/componentes/ui/insignia-documento";
import { Paginacion } from "@/componentes/ui/paginacion";
import { esquemaReporteCompras, textoDeFiltros, type FiltroReporteCompras } from "@/esquemas/reportes";
import { formatearBolivianos } from "@/lib/dinero";
import { formatearFecha, hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { listarProveedores } from "@/servicios/catalogos/proveedores";
import { obtenerConfiguracion } from "@/servicios/configuracion";
import { FILAS_POR_PAGINA_REPORTE, reporteCompras } from "@/servicios/reportes";
import { FiltrosReporteCompras } from "./filtros-reporte-compras";
import { parametrosDeCompras } from "./parametros";

export const metadata = { title: "Reporte de compras · Almacén Regional Oruro" };

export default async function PaginaReporteCompras({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const { usuario } = await requerirSesion();

  // Un valor inválido no rompe el reporte: se muestra el mes en curso con un aviso (FR-002).
  const validacion = esquemaReporteCompras.safeParse(await searchParams);
  const filtro: FiltroReporteCompras = validacion.success
    ? validacion.data
    : { desde: inicioDelMesEnCurso(), hasta: hoyEnLaPaz(), incluirAnulados: false, pagina: 1 };

  const [reporte, proveedores, { modoDemostracion }] = await Promise.all([
    reporteCompras({ ...filtro, proveedorId: filtro.proveedor }),
    listarProveedores({ estado: "todos" }),
    obtenerConfiguracion(),
  ]);
  const paginas = Math.max(1, Math.ceil(reporte.total / FILAS_POR_PAGINA_REPORTE));
  const nombreProveedor = proveedores.find((proveedor) => proveedor.id === filtro.proveedor)?.razonSocial;
  const parametros = parametrosDeCompras(filtro);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/reportes" className="text-sm text-marca underline">
          ← Volver a reportes
        </Link>
        <Link
          href={`/reportes/compras/imprimir?${parametros.toString()}`}
          className="rounded-md border border-marca bg-white px-4 py-2 text-sm font-medium text-marca hover:bg-fondo"
        >
          Imprimir
        </Link>
      </div>

      <FiltrosReporteCompras
        valores={filtro}
        proveedores={proveedores.map((p) => ({ id: p.id, etiqueta: `${p.razonSocial} (${p.nit})${p.activo ? "" : " (inactivo)"}` }))}
      />
      {!validacion.success && (
        <Aviso tipo="error">{validacion.error.issues[0]?.message ?? "Filtros inválidos"}. Se muestra el mes en curso.</Aviso>
      )}

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
            <CeldaReporte>
              <InsigniaDocumento estado={fila.estado} />
            </CeldaReporte>
          </tr>
        ))}
      </TablaReporte>

      {/* FR-003: los totales cuentan solo las compras vigentes, se incluyan o no las anuladas. */}
      <p className="text-base font-semibold">
        Total gastado: {formatearBolivianos(reporte.totales.totalGastado)} ·{" "}
        {reporte.totales.compras === 1 ? "1 compra" : `${reporte.totales.compras} compras`} (solo vigentes)
      </p>

      <Paginacion pagina={filtro.pagina} paginas={paginas} enlace={(numero) => `/reportes/compras?${parametros.toString()}&pagina=${numero}`} />
    </section>
  );
}
