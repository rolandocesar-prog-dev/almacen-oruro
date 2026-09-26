import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/componentes/ui/aviso";
import { hoyEnLaPaz } from "@/lib/fechas";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { listarRepresentantesParaSelector } from "@/servicios/catalogos/representantes";
import { listarProductosParaPedido, obtenerPedido } from "@/servicios/pedidos";
import { editarPedidoAccion } from "../../acciones";
import { FormularioPedido } from "../../formulario-pedido";

export const metadata = { title: "Editar pedido · Almacén Regional Oruro" };

export default async function PaginaEditarPedido({ params }: { params: Promise<{ id: string }> }) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const pedido = id ? await obtenerPedido(id) : null;
  if (!pedido) notFound();

  const volver = (
    <Link href={`/pedidos/${pedido.id}`} className="text-sm text-marca underline">
      ← Volver al pedido
    </Link>
  );

  // RN-42: solo se edita un pedido sin entregas. El servidor lo vuelve a verificar al guardar.
  if (pedido.estado !== "PENDIENTE") {
    return (
      <section className="flex flex-col gap-4">
        {volver}
        <h1 className="text-2xl font-bold sm:text-[28px]">Editar pedido Nº {pedido.id}</h1>
        <Aviso tipo="informacion">Este pedido está {pedido.estado.toLowerCase()}: solo se editan pedidos pendientes.</Aviso>
      </section>
    );
  }

  // Se ofrecen los activos y, además, el representante y los productos que el pedido ya tiene (FR-006).
  const [representantes, productos] = await Promise.all([
    listarRepresentantesParaSelector(pedido.representante.id),
    listarProductosParaPedido(pedido.lineas.map((linea) => linea.productoId)),
  ]);

  return (
    <section className="flex flex-col gap-4">
      {volver}
      <h1 className="text-2xl font-bold sm:text-[28px]">Editar pedido Nº {pedido.id}</h1>
      <p className="text-sm text-texto-suave">El pedido conserva su número. Editarlo no mueve el stock.</p>
      <FormularioPedido
        accion={editarPedidoAccion.bind(null, pedido.id)}
        representantes={representantes}
        productos={productos}
        hoy={hoyEnLaPaz()}
        valores={{
          representanteId: pedido.representante.id,
          fecha: pedido.fecha,
          observacion: pedido.observacion,
          lineas: pedido.lineas.map((linea) => ({ productoId: linea.productoId, cantidadSolicitada: linea.solicitada })),
        }}
        textoBoton="Guardar cambios"
        rutaCancelar={`/pedidos/${pedido.id}`}
      />
    </section>
  );
}
