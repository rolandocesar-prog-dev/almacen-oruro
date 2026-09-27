import Link from "next/link";
import { EncabezadoReporte } from "@/componentes/reportes/encabezado-reporte";
import { CeldaReporte, SIN_RESULTADOS, TablaReporte } from "@/componentes/reportes/tabla-reporte";
import { Aviso } from "@/componentes/ui/aviso";
import { Paginacion } from "@/componentes/ui/paginacion";
import { esquemaReportePedidos, textoDeFiltros, type FiltroReportePedidos } from "@/esquemas/reportes";
import { formatearFecha, hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { listarRepresentantes } from "@/servicios/catalogos/representantes";
import { obtenerConfiguracion } from "@/servicios/configuracion";
import { FILAS_POR_PAGINA_REPORTE, reportePedidos } from "@/servicios/reportes";
import { InsigniaPedido } from "../../pedidos/insignia-pedido";
import { FiltrosReportePedidos } from "./filtros-reporte-pedidos";
import { ETIQUETA_ESTADO, parametrosDePedidos } from "./parametros";

export const metadata = { title: "Reporte de pedidos · Almacén Regional Oruro" };

export default async function PaginaReportePedidos({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const { usuario } = await requerirSesion();

  const validacion = esquemaReportePedidos.safeParse(await searchParams);
  const filtro: FiltroReportePedidos = validacion.success
    ? validacion.data
    : { desde: inicioDelMesEnCurso(), hasta: hoyEnLaPaz(), estado: "todos", incluirAnulados: false, pagina: 1 };

  const [reporte, representantes, { modoDemostracion }] = await Promise.all([
    reportePedidos({ ...filtro, representanteId: filtro.representante }),
    listarRepresentantes({ estado: "todos" }),
    obtenerConfiguracion(),
  ]);
  const paginas = Math.max(1, Math.ceil(reporte.total / FILAS_POR_PAGINA_REPORTE));
  const parametros = parametrosDePedidos(filtro);
  const nombreRepresentante = representantes.find((r) => r.id === filtro.representante)?.nombreCompleto;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/reportes" className="text-sm text-marca underline">
          ← Volver a reportes
        </Link>
        <Link
          href={`/reportes/pedidos/imprimir?${parametros.toString()}`}
          className="rounded-md border border-marca bg-white px-4 py-2 text-sm font-medium text-marca hover:bg-fondo"
        >
          Imprimir
        </Link>
      </div>

      <FiltrosReportePedidos
        valores={filtro}
        representantes={representantes.map((r) => ({ id: r.id, etiqueta: `${r.etiqueta}${r.activo ? "" : " (inactivo)"}` }))}
      />
      {!validacion.success && (
        <Aviso tipo="error">{validacion.error.issues[0]?.message ?? "Filtros inválidos"}. Se muestra el mes en curso.</Aviso>
      )}

      <EncabezadoReporte
        titulo="Reporte de pedidos"
        filtros={textoDeFiltros([
          { etiqueta: `Del ${formatearFecha(filtro.desde)} al ${formatearFecha(filtro.hasta)}` },
          { etiqueta: "Estado", valor: ETIQUETA_ESTADO[filtro.estado] },
          { etiqueta: "Representante", valor: nombreRepresentante },
          ...(filtro.incluirAnulados ? [{ etiqueta: "Incluye anulados" }] : []),
        ])}
        emitidoPor={`${usuario.nombre} ${usuario.apellido}`}
        demostracion={modoDemostracion}
      />

      <TablaReporte
        encabezados={["Nº", "Fecha", "Representante", "Centro de salud", "Productos", "% atendido", "Estado"]}
        vacio={reporte.filas.length === 0 ? SIN_RESULTADOS : undefined}
      >
        {reporte.filas.map((fila) => (
          <tr key={fila.id}>
            <CeldaReporte className="tabular-nums">{fila.id}</CeldaReporte>
            <CeldaReporte>{formatearFecha(fila.fecha)}</CeldaReporte>
            <CeldaReporte>{fila.representante}</CeldaReporte>
            <CeldaReporte>{fila.centroSalud}</CeldaReporte>
            <CeldaReporte className="text-right tabular-nums">{fila.productos}</CeldaReporte>
            <CeldaReporte className="text-right tabular-nums">{fila.porcentajeAtendido} %</CeldaReporte>
            <CeldaReporte>
              <InsigniaPedido estado={fila.estado} />
            </CeldaReporte>
          </tr>
        ))}
      </TablaReporte>

      {/* El conteo es del rango completo, sin importar los filtros de estado o de anulados (FR-013). */}
      <p className="text-base font-semibold">
        Pendientes: {reporte.totales.porEstado.PENDIENTE} · Parciales: {reporte.totales.porEstado.PARCIAL} · Atendidos:{" "}
        {reporte.totales.porEstado.ATENDIDO} · Anulados: {reporte.totales.porEstado.ANULADO}
      </p>

      <Paginacion pagina={filtro.pagina} paginas={paginas} enlace={(numero) => `/reportes/pedidos?${parametros.toString()}&pagina=${numero}`} />
    </section>
  );
}
