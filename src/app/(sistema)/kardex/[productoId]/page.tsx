import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/componentes/ui/aviso";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import type { TipoMovimiento } from "@/generado/prisma/client";
import { esquemaFiltroKardex, type FiltroKardex as ValoresFiltroKardex } from "@/esquemas/inventario";
import { formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerKardex } from "@/servicios/inventario";
import { FiltroKardex } from "./filtro-kardex";

export const metadata = { title: "Kardex · Almacén Regional Oruro" };

const nombreDelTipo: Record<TipoMovimiento, string> = {
  ENTRADA_COMPRA: "Entrada por compra",
  ANULACION_COMPRA: "Anulación de compra",
  SALIDA_DISTRIBUCION: "Salida por distribución",
  ANULACION_DISTRIBUCION: "Anulación de distribución",
};

export default async function PaginaKardex({
  params,
  searchParams,
}: {
  params: Promise<{ productoId: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  await requerirSesion();
  const productoId = idDeRuta((await params).productoId);

  // Mismo esquema que el filtro; con un rango inválido se muestra el kardex completo y se avisa.
  const validacion = esquemaFiltroKardex.safeParse(await searchParams);
  const filtro: ValoresFiltroKardex = validacion.success ? validacion.data : {};
  const kardex = productoId ? await obtenerKardex(productoId, filtro) : null;
  if (!kardex) notFound();

  const { producto } = kardex;
  const conRango = Boolean(filtro.desde || filtro.hasta);

  return (
    <section className="flex flex-col gap-4">
      <Link href="/existencias" className="text-sm text-marca underline">
        ← Volver a existencias
      </Link>

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Kardex de {producto.codigo} · {producto.nombre}
          </h1>
          <p className="text-sm text-gray-600">
            Unidad: {producto.unidadMedida.nombre} ({producto.unidadMedida.abreviatura}){producto.activo ? "" : " · Producto inactivo"}
          </p>
        </div>
        <p className="text-lg">
          Stock actual: <strong className="tabular-nums">{producto.stockActual}</strong>
        </p>
      </div>
      <Link href={`/productos/${producto.id}`} className="text-sm text-marca underline">
        Ver ficha del producto
      </Link>

      <FiltroKardex productoId={producto.id} valores={filtro} />
      {!validacion.success && (
        <Aviso tipo="error">{validacion.error.issues[0]?.message ?? "Rango inválido"}. Se muestra el kardex completo.</Aviso>
      )}

      {conRango && (
        <dl className="grid gap-4 rounded-lg border border-borde bg-white p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-600">Saldo anterior{filtro.desde ? ` al ${formatearFecha(filtro.desde)}` : ""}</dt>
            <dd className="text-lg tabular-nums">{kardex.saldoAnterior}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-600">Saldo final{filtro.hasta ? ` al ${formatearFecha(filtro.hasta)}` : ""}</dt>
            <dd className="text-lg tabular-nums">{kardex.saldoFinal}</dd>
          </div>
        </dl>
      )}

      <p className="text-sm text-gray-600">
        Los movimientos se muestran en el orden en que se registraron; el saldo de cada fila no cambia aunque la fecha del documento sea
        anterior a la de otros movimientos.
      </p>

      <Tabla
        encabezados={["Fecha del documento", "Registrado el", "Tipo", "Documento", "Entrada", "Salida", "Saldo"]}
        vacio={kardex.movimientos.length === 0 ? (conRango ? "Sin movimientos en el rango elegido" : "Sin movimientos") : undefined}
      >
        {kardex.movimientos.map((movimiento) => (
          <tr key={movimiento.id}>
            <Celda>{formatearFecha(movimiento.fechaDocumento)}</Celda>
            <Celda>{formatearFechaHora(movimiento.registradoEn)}</Celda>
            <Celda>{nombreDelTipo[movimiento.tipo]}</Celda>
            <Celda>
              {/* Las distribuciones llegan con F-005: hasta entonces su enlace no tiene página. */}
              {movimiento.documento ? (
                <Link href={movimiento.documento.ruta} className="text-marca underline">
                  {movimiento.documento.texto}
                </Link>
              ) : (
                "—"
              )}
            </Celda>
            <Celda className="text-right tabular-nums">{movimiento.entrada ?? ""}</Celda>
            <Celda className="text-right tabular-nums">{movimiento.salida ?? ""}</Celda>
            <Celda className="text-right font-medium tabular-nums">{movimiento.saldoResultante}</Celda>
          </tr>
        ))}
      </Tabla>
    </section>
  );
}
