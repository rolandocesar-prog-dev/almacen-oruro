import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/componentes/ui/aviso";
import { Dato } from "@/componentes/ui/dato";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaAvisoCompra } from "@/esquemas/compras";
import { formatearBolivianos } from "@/lib/dinero";
import { formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerCompra } from "@/servicios/compras";
import { InsigniaCompra } from "../insignia-compra";

export const metadata = { title: "Detalle de compra · Almacén Regional Oruro" };

export default async function PaginaDetalleCompra({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const { aviso } = esquemaAvisoCompra.parse(await searchParams);
  const compra = id ? await obtenerCompra(id) : null;
  if (!compra) notFound();

  return (
    <section className="flex flex-col gap-4">
      <Link href="/compras" className="text-sm text-marca underline">
        ← Volver al listado
      </Link>
      {aviso === "registrada" && <Aviso tipo="exito">Compra registrada. El stock de sus productos se actualizó.</Aviso>}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Factura {compra.nroFactura}</h1>
        <InsigniaCompra estado={compra.estado} />
      </div>

      <dl className="grid gap-4 rounded-lg border border-borde bg-white p-6 sm:grid-cols-2">
        <Dato
          etiqueta="Proveedor"
          valor={
            <Link href={`/proveedores/${compra.proveedor.id}`} className="text-marca underline">
              {compra.proveedor.razonSocial} ({compra.proveedor.nit}){compra.proveedor.activo ? "" : " (inactivo)"}
            </Link>
          }
        />
        <Dato etiqueta="Fecha de la factura" valor={formatearFecha(compra.fecha)} />
        <Dato etiqueta="Observación" valor={compra.observacion} />
        <Dato etiqueta="Registrada por" valor={`${compra.registradaPor} · ${formatearFechaHora(compra.registradaEn)}`} />
        {compra.estado === "ANULADA" && (
          <>
            <Dato etiqueta="Motivo de la anulación" valor={compra.motivoAnulacion} />
            <Dato etiqueta="Anulada por" valor={`${compra.anuladaPor} · ${compra.anuladaEn ? formatearFechaHora(compra.anuladaEn) : ""}`} />
          </>
        )}
      </dl>

      {/* Una compra no tiene "Editar" ni "Borrar": solo se anula (D-16, FR-010). */}
      <Tabla encabezados={["Código", "Producto", "Cantidad", "Precio unitario", "Subtotal"]}>
        {compra.lineas.map((linea) => (
          <tr key={linea.id}>
            <Celda>{linea.codigo}</Celda>
            <Celda>
              <Link href={`/productos/${linea.productoId}`} className="text-marca underline">
                {linea.nombre}
              </Link>
              {linea.productoActivo ? "" : " (inactivo)"}
            </Celda>
            <Celda className="text-right tabular-nums">
              {linea.cantidad} {linea.unidad}
            </Celda>
            <Celda className="text-right tabular-nums">{formatearBolivianos(linea.precioUnitario)}</Celda>
            <Celda className="text-right tabular-nums">{formatearBolivianos(linea.subtotal)}</Celda>
          </tr>
        ))}
        <tr>
          <Celda className="font-semibold">Total</Celda>
          <Celda>{""}</Celda>
          <Celda>{""}</Celda>
          <Celda>{""}</Celda>
          <Celda className="text-right font-semibold tabular-nums">{formatearBolivianos(compra.total)}</Celda>
        </tr>
      </Tabla>
    </section>
  );
}
