import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/componentes/ui/aviso";
import { Paginacion } from "@/componentes/ui/paginacion";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaPedidoParaDistribuir } from "@/esquemas/distribuciones";
import { formatearFecha, hoyEnLaPaz } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { obtenerPedidoParaDistribuir } from "@/servicios/distribuciones";
import { listarPedidos, PEDIDOS_POR_PAGINA } from "@/servicios/pedidos";
import { InsigniaPedido } from "../../pedidos/insignia-pedido";
import { FormularioDistribucion } from "../formulario-distribucion";

export const metadata = { title: "Registrar distribución · Almacén Regional Oruro" };

export default async function PaginaNuevaDistribucion({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  await requerirSesion();
  const { pedido: pedidoId, pagina } = esquemaPedidoParaDistribuir.parse(await searchParams);

  if (!pedidoId) {
    // Solo los pedidos PENDIENTE y PARCIAL aparecen para elegir: los ATENDIDOS y ANULADOS no (Historia 2 · E4).
    // Se reutiliza la consulta de F-004, sin una segunda definición de "por atender" (research V-05).
    const { pedidos, total } = await listarPedidos({ estado: "por-atender", pagina });
    const paginas = Math.max(1, Math.ceil(total / PEDIDOS_POR_PAGINA));
    return (
      <section className="flex flex-col gap-4">
        <Link href="/distribuciones" className="text-sm text-marca underline">
          ← Volver a distribuciones
        </Link>
        <h1 className="text-2xl font-bold sm:text-[28px]">Registrar distribución</h1>
        <p className="text-sm text-texto-suave">Elige el pedido que vas a atender. Solo aparecen los pendientes y parciales.</p>
        <Tabla
          encabezados={["Nº", "Fecha", "Representante", "Centro de salud", "Productos", "% atendido", "Estado", "Acción"]}
          vacio={
            pedidos.length === 0 ? (
              <>
                No hay pedidos por atender.{" "}
                <Link href="/pedidos/nuevo" className="text-marca underline">
                  Registrar pedido
                </Link>
              </>
            ) : undefined
          }
        >
          {pedidos.map((pedido) => (
            <tr key={pedido.id}>
              <Celda className="tabular-nums">{pedido.id}</Celda>
              <Celda>{formatearFecha(pedido.fecha)}</Celda>
              <Celda>{pedido.representante}</Celda>
              <Celda>{pedido.centroSalud}</Celda>
              <Celda className="text-right tabular-nums">{pedido.productos}</Celda>
              <Celda className="text-right tabular-nums">{pedido.porcentajeAtendido} %</Celda>
              <Celda>
                <InsigniaPedido estado={pedido.estado} />
              </Celda>
              <Celda>
                <Link
                  href={`/distribuciones/nueva?pedido=${pedido.id}`}
                  className="rounded-md bg-marca px-3 py-1 text-sm font-medium text-white hover:bg-marca-oscuro"
                >
                  Distribuir
                </Link>
              </Celda>
            </tr>
          ))}
        </Tabla>
        <Paginacion pagina={pagina} paginas={paginas} enlace={(numero) => `/distribuciones/nueva?pagina=${numero}`} />
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
        <h1 className="text-2xl font-bold sm:text-[28px]">Registrar distribución</h1>
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
      <h1 className="text-2xl font-bold sm:text-[28px]">Distribuir el pedido Nº {pedido.id}</h1>
      <p className="text-sm text-texto-suave">
        {representante.apellido}, {representante.nombre}
        {representante.activo ? "" : " (inactivo)"} · {representante.centroSalud} · pedido del{" "}
        {formatearFecha(pedido.fecha)}
      </p>
      <FormularioDistribucion pedido={pedido} hoy={hoyEnLaPaz()} />
    </section>
  );
}
