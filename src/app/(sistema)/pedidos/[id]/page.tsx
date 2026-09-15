import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/componentes/ui/aviso";
import { Dato } from "@/componentes/ui/dato";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaAvisoFicha } from "@/esquemas/comunes";
import { formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerPedido } from "@/servicios/pedidos";
import { InsigniaPedido } from "../insignia-pedido";

export const metadata = { title: "Detalle de pedido · Almacén Regional Oruro" };

const avisos = {
  registrado: "Pedido registrado.",
  modificado: "Pedido actualizado.",
} as const;

export default async function PaginaDetallePedido({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const { aviso } = esquemaAvisoFicha.parse(await searchParams);
  const pedido = id ? await obtenerPedido(id) : null;
  if (!pedido) notFound();

  const { representante } = pedido;

  return (
    <section className="flex flex-col gap-4">
      <Link href="/pedidos" className="text-sm text-marca underline">
        ← Volver a pedidos
      </Link>
      {aviso && <Aviso tipo="exito">{avisos[aviso]}</Aviso>}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Pedido Nº {pedido.id}</h1>
        <InsigniaPedido estado={pedido.estado} />
      </div>

      <dl className="grid gap-4 rounded-lg border border-borde bg-white p-6 sm:grid-cols-2">
        <Dato etiqueta="Fecha del pedido" valor={formatearFecha(pedido.fecha)} />
        <Dato
          etiqueta="Representante"
          valor={
            <>
              <Link href={`/representantes/${representante.id}`} className="text-marca underline">
                {representante.apellido}, {representante.nombre}
              </Link>
              {representante.activo ? "" : " (inactivo)"} · {representante.servicio}
            </>
          }
        />
        <Dato etiqueta="Centro de salud" valor={representante.centroSalud} />
        <Dato etiqueta="Observación" valor={pedido.observacion} />
        <Dato etiqueta="Registrado por" valor={`${pedido.registradoPor} · ${formatearFechaHora(pedido.registradoEn)}`} />
      </dl>

      <Tabla encabezados={["Código", "Producto", "Unidad", "Solicitado", "Entregado", "Pendiente"]}>
        {pedido.lineas.map((linea) => (
          <tr key={linea.id}>
            <Celda>{linea.codigo}</Celda>
            <Celda>
              <Link href={`/productos/${linea.productoId}`} className="text-marca underline">
                {linea.nombre}
              </Link>
              {linea.productoActivo ? "" : " (inactivo)"}
            </Celda>
            <Celda>{linea.unidad}</Celda>
            <Celda className="text-right tabular-nums">{linea.solicitada}</Celda>
            <Celda className="text-right tabular-nums">{linea.entregada}</Celda>
            <Celda className="text-right tabular-nums">{linea.pendiente}</Celda>
          </tr>
        ))}
      </Tabla>
    </section>
  );
}
