// Datos de prueba de pedidos (F-004, tarea T006).
// Como F-005 todavía no existe, las entregas se simulan con el mismo bloqueo del pedido y la misma
// función de recálculo que usarán las distribuciones (research P-12). Ningún ayudante toca el stock.
import type { EstadoDocumento, EstadoPedido } from "@/generado/prisma/client";
import { ErrorDeNegocio } from "@/lib/errores";
import { prisma } from "@/lib/prisma";
import { bloquearPedido, calcularEstadoPedido, recalcularEstadoPedido } from "@/servicios/pedidos";
import { crearUsuarioDePrueba } from "./base-de-datos";
import { crearRepresentanteDePrueba } from "./catalogos";
import { fechaDeDocumento } from "./inventario";

let contador = 0;
function siguiente() {
  contador += 1;
  return contador;
}

/**
 * Pedido con sus líneas insertado directamente. Si no se indica `estado`, se calcula con
 * calcularEstadoPedido a partir de lo entregado; un ANULADO lleva motivo, momento y usuario (CHECK).
 */
export async function crearPedidoDePrueba({
  representanteId,
  lineas,
  fecha = "2026-09-01",
  estado,
}: {
  representanteId?: number;
  lineas: { productoId: number; solicitada: number; entregada?: number }[];
  fecha?: string;
  estado?: EstadoPedido;
}) {
  const { usuario } = await crearUsuarioDePrueba();
  const idRepresentante = representanteId ?? (await crearRepresentanteDePrueba()).id;
  const detalle = lineas.map((linea) => ({
    productoId: linea.productoId,
    cantidadSolicitada: linea.solicitada,
    cantidadEntregada: linea.entregada ?? 0,
  }));
  const estadoFinal = estado ?? calcularEstadoPedido(detalle);
  const anulado = estadoFinal === "ANULADO";

  return prisma.pedido.create({
    data: {
      representanteId: idRepresentante,
      fecha: fechaDeDocumento(fecha),
      estado: estadoFinal,
      usuarioId: usuario.id,
      motivoAnulacion: anulado ? "Pedido de prueba anulado" : null,
      anuladaEn: anulado ? new Date() : null,
      anuladaPorId: anulado ? usuario.id : null,
      lineas: { create: detalle },
    },
    include: { lineas: { orderBy: { id: "asc" } } },
  });
}

/**
 * Simula lo que hará una distribución de F-005 sobre una línea del pedido: bloquea el pedido, cambia lo
 * entregado y recalcula el estado. Una cantidad negativa simula la anulación de una distribución.
 * Como F-005, rechaza una entrega positiva a un pedido ANULADO o ATENDIDO (FR-012); descontar se permite
 * en cualquier estado, para corregir una salida mal registrada (RN-35). No toca el stock.
 */
export async function simularEntregaDePrueba({ pedidoId, productoId, cantidad }: { pedidoId: number; productoId: number; cantidad: number }) {
  return prisma.$transaction(
    async (tx) => {
      const pedido = await bloquearPedido(tx, pedidoId);
      if (!pedido) throw new ErrorDeNegocio("No existe el pedido indicado");
      if (cantidad > 0 && pedido.estado === "ANULADO") throw new ErrorDeNegocio("El pedido está anulado");
      if (cantidad > 0 && pedido.estado === "ATENDIDO") throw new ErrorDeNegocio("El pedido ya está atendido");

      await tx.pedidoDetalle.update({
        where: { pedidoId_productoId: { pedidoId, productoId } },
        data: { cantidadEntregada: { increment: cantidad } },
      });
      return recalcularEstadoPedido(tx, pedidoId);
    },
    { maxWait: 10_000, timeout: 10_000 },
  );
}

/**
 * Distribución de una línea del pedido, sin movimientos ni cambios en lo entregado: sirve para probar
 * que el detalle lista las distribuciones y que una línea con historial no se puede quitar al editar.
 * Por defecto queda ANULADA, con motivo, momento y usuario.
 */
export async function crearDistribucionDePedidoDePrueba({
  pedidoId,
  productoId,
  cantidad,
  estado = "ANULADA",
  fecha = "2026-09-02",
}: {
  pedidoId: number;
  productoId: number;
  cantidad: number;
  estado?: EstadoDocumento;
  fecha?: string;
}) {
  const { usuario } = await crearUsuarioDePrueba();
  const linea = await prisma.pedidoDetalle.findUniqueOrThrow({ where: { pedidoId_productoId: { pedidoId, productoId } } });
  const anulada = estado === "ANULADA";
  return prisma.distribucion.create({
    data: {
      pedidoId,
      nroVale: String(800000 + siguiente()),
      fecha: fechaDeDocumento(fecha),
      estado,
      usuarioId: usuario.id,
      motivoAnulacion: anulada ? "Distribución de prueba anulada" : null,
      anuladaEn: anulada ? new Date() : null,
      anuladaPorId: anulada ? usuario.id : null,
      lineas: { create: [{ pedidoDetalleId: linea.id, cantidad }] },
    },
  });
}
