import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/componentes/ui/aviso";
import { esquemaPedidoParaDistribuir } from "@/esquemas/distribuciones";
import { formatearFecha, hoyEnLaPaz } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { obtenerPedidoParaDistribuir } from "@/servicios/distribuciones";
import { FormularioDistribucion } from "../formulario-distribucion";

export const metadata = { title: "Registrar distribución · Almacén Regional Oruro" };

export default async function PaginaNuevaDistribucion({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  await requerirSesion();
  const { pedido: pedidoId } = esquemaPedidoParaDistribuir.parse(await searchParams);

  if (!pedidoId) {
    return (
      <section className="flex flex-col gap-4">
        <Link href="/distribuciones" className="text-sm text-marca underline">
          ← Volver a distribuciones
        </Link>
        <h1 className="text-2xl font-semibold">Registrar distribución</h1>
        <Aviso tipo="informacion">
          Elige el pedido que vas a atender desde{" "}
          <Link href="/pedidos" className="underline">
            Pedidos
          </Link>
          .
        </Aviso>
      </section>
    );
  }

  const pedido = await obtenerPedidoParaDistribuir(pedidoId);
  if (!pedido) notFound();

  const volverAlPedido = (
    <Link href={`/pedidos/${pedido.id}`} className="text-sm text-marca underline">
      ← Volver al pedido
    </Link>
  );

  // Solo se distribuye lo que tiene algo por entregar (FR-001); el servidor lo vuelve a verificar al guardar.
  if (pedido.estado !== "PENDIENTE" && pedido.estado !== "PARCIAL") {
    return (
      <section className="flex flex-col gap-4">
        {volverAlPedido}
        <h1 className="text-2xl font-semibold">Registrar distribución</h1>
        <Aviso tipo="informacion">
          El pedido Nº {pedido.id} está {pedido.estado.toLowerCase()}: solo se distribuyen pedidos pendientes o parciales.
        </Aviso>
      </section>
    );
  }

  const { representante } = pedido;
  return (
    <section className="flex flex-col gap-4">
      {volverAlPedido}
      <h1 className="text-2xl font-semibold">Distribuir el pedido Nº {pedido.id}</h1>
      <p className="text-sm text-gray-600">
        {representante.apellido}, {representante.nombre}
        {representante.activo ? "" : " (inactivo)"} · {representante.servicio} · {representante.centroSalud} · pedido del{" "}
        {formatearFecha(pedido.fecha)}
      </p>
      <FormularioDistribucion pedido={pedido} hoy={hoyEnLaPaz()} />
    </section>
  );
}
