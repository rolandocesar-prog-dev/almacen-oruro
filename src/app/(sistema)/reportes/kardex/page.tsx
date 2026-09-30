import Link from "next/link";
import { EncabezadoReporte } from "@/componentes/reportes/encabezado-reporte";
import { NOMBRE_DEL_TIPO } from "@/componentes/reportes/etiquetas-movimiento";
import { CeldaReporte, TablaReporte } from "@/componentes/reportes/tabla-reporte";
import { Aviso } from "@/componentes/ui/aviso";
import { esquemaReporteKardex, textoDeFiltros, type FiltroReporteKardex } from "@/esquemas/reportes";
import { formatearFecha, hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { listarProductos } from "@/servicios/catalogos/productos";
import { reporteKardex } from "@/servicios/reportes";
import { FiltrosReporteKardex } from "./filtros-reporte-kardex";
import { parametrosDeKardex } from "./parametros";

export const metadata = { title: "Reporte de kardex · Almacén Regional Oruro" };

export default async function PaginaReporteKardex({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const { usuario } = await requerirSesion();

  const validacion = esquemaReporteKardex.safeParse(await searchParams);
  const filtro: FiltroReporteKardex = validacion.success ? validacion.data : { desde: inicioDelMesEnCurso(), hasta: hoyEnLaPaz() };

  const productos = await listarProductos({ estado: "todos" });
  // Historia 4 · E3: sin producto elegido no se consulta nada; el reporte lo pide.
  const reporte = filtro.producto ? await reporteKardex(filtro.producto, { desde: filtro.desde, hasta: filtro.hasta }) : null;
  const parametros = parametrosDeKardex(filtro);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/reportes" className="text-sm text-marca underline">
          ← Volver a reportes
        </Link>
        {reporte && (
          <Link
            href={`/reportes/kardex/imprimir?${parametros.toString()}`}
            className="rounded-md border border-marca bg-white px-4 py-2 text-sm font-medium text-marca hover:bg-fondo"
          >
            Imprimir
          </Link>
        )}
      </div>

      <FiltrosReporteKardex
        valores={filtro}
        productos={productos.map((p) => ({ id: p.id, etiqueta: `${p.codigo} · ${p.nombre}${p.activo ? "" : " (inactivo)"}` }))}
      />
      {!validacion.success && (
        <Aviso tipo="error">{validacion.error.issues[0]?.message ?? "Filtros inválidos"}. Se muestra el mes en curso.</Aviso>
      )}

      {!reporte ? (
        <Aviso tipo="informacion">Elige un producto para ver su kardex.</Aviso>
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
                <CeldaReporte>
                  {movimiento.documento ? (
                    <Link href={movimiento.documento.ruta} className="text-marca underline">
                      {movimiento.documento.texto}
                    </Link>
                  ) : (
                    "—"
                  )}
                </CeldaReporte>
                <CeldaReporte className="text-right tabular-nums">{movimiento.entrada ?? "—"}</CeldaReporte>
                <CeldaReporte className="text-right tabular-nums">{movimiento.salida ?? "—"}</CeldaReporte>
                <CeldaReporte className="text-right tabular-nums">{movimiento.saldoResultante}</CeldaReporte>
              </tr>
            ))}
          </TablaReporte>

          {/* RN-53: el saldo final es la suma hasta el fin del rango; con «hasta» hoy, es el stock actual. */}
          <p className="text-base font-semibold">Saldo final: {reporte.saldoFinal}</p>
        </>
      )}
    </section>
  );
}
