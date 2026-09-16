import Link from "next/link";
import { EncabezadoReporte } from "@/componentes/reportes/encabezado-reporte";
import { CeldaReporte, SIN_RESULTADOS, TablaReporte } from "@/componentes/reportes/tabla-reporte";
import { BotonImprimir } from "@/componentes/ui/boton-imprimir";
import { esquemaReportePedidos, textoDeFiltros, type FiltroReportePedidos } from "@/esquemas/reportes";
import { formatearFecha, hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { listarRepresentantes } from "@/servicios/catalogos/representantes";
import { obtenerConfiguracion } from "@/servicios/configuracion";
import { reportePedidos } from "@/servicios/reportes";
import { ETIQUETA_ESTADO } from "@/app/(sistema)/reportes/pedidos/parametros";

export const metadata = { title: "Reporte de pedidos · Almacén Regional Oruro" };

/** R-5 para imprimir: todas las filas del rango, sin menú (E-04, E-05). */
export default async function PaginaImprimirReportePedidos({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const { usuario } = await requerirSesion();

  const validacion = esquemaReportePedidos.safeParse(await searchParams);
  const filtro: FiltroReportePedidos = validacion.success
    ? validacion.data
    : { desde: inicioDelMesEnCurso(), hasta: hoyEnLaPaz(), estado: "todos", incluirAnulados: false, pagina: 1 };

  const [reporte, representantes, { modoDemostracion }] = await Promise.all([
    reportePedidos({ ...filtro, representanteId: filtro.representante, todas: true }),
    listarRepresentantes({ estado: "todos" }),
    obtenerConfiguracion(),
  ]);
  const nombreRepresentante = representantes.find((r) => r.id === filtro.representante)?.nombreCompleto;

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/reportes/pedidos" className="text-sm text-marca underline">
          ← Volver al reporte
        </Link>
        <BotonImprimir />
      </div>

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
        encabezados={["Nº", "Fecha", "Representante", "Servicio", "Productos", "% atendido", "Estado"]}
        vacio={reporte.filas.length === 0 ? SIN_RESULTADOS : undefined}
      >
        {reporte.filas.map((fila) => (
          <tr key={fila.id}>
            <CeldaReporte className="tabular-nums">{fila.id}</CeldaReporte>
            <CeldaReporte>{formatearFecha(fila.fecha)}</CeldaReporte>
            <CeldaReporte>{fila.representante}</CeldaReporte>
            <CeldaReporte>{fila.servicio}</CeldaReporte>
            <CeldaReporte className="text-right tabular-nums">{fila.productos}</CeldaReporte>
            <CeldaReporte className="text-right tabular-nums">{fila.porcentajeAtendido} %</CeldaReporte>
            <CeldaReporte>{fila.estado === "ANULADO" ? "ANULADO" : `${fila.estado[0]}${fila.estado.slice(1).toLowerCase()}`}</CeldaReporte>
          </tr>
        ))}
      </TablaReporte>

      <p className="text-base font-semibold">
        Pendientes: {reporte.totales.porEstado.PENDIENTE} · Parciales: {reporte.totales.porEstado.PARCIAL} · Atendidos:{" "}
        {reporte.totales.porEstado.ATENDIDO} · Anulados: {reporte.totales.porEstado.ANULADO}
      </p>
    </article>
  );
}
