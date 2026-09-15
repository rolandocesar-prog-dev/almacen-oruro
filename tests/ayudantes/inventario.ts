// Documentos de prueba para el núcleo del stock (F-003, tareas T006 y T008).
// Crean compras y distribuciones SIN movimientos, para que cada prueba registre sus movimientos con
// registrarMovimiento, la única función que cambia el stock (principio III).
import { prisma } from "@/lib/prisma";
import { registrarMovimiento } from "@/servicios/inventario";
import { crearUsuarioDePrueba } from "./base-de-datos";
import { crearProveedorDePrueba, crearRepresentanteDePrueba } from "./catalogos";

let contador = 0;
function siguiente() {
  contador += 1;
  return contador;
}

/** Fecha de un documento (columna date) a partir de "AAAA-MM-DD". */
export function fechaDeDocumento(fecha: string): Date {
  return new Date(`${fecha}T00:00:00Z`);
}

/** Compra REGISTRADA de `cantidad` unidades a Bs 10, con su línea, pero sin movimientos. */
export async function crearCompraSinMovimientosDePrueba({
  productoId,
  cantidad,
  fecha = "2026-09-01",
}: {
  productoId: number;
  cantidad: number;
  fecha?: string;
}) {
  const { usuario } = await crearUsuarioDePrueba();
  const proveedor = await crearProveedorDePrueba();
  const compra = await prisma.compra.create({
    data: {
      proveedorId: proveedor.id,
      nroFactura: String(800000 + siguiente()),
      fecha: fechaDeDocumento(fecha),
      total: cantidad * 10,
      usuarioId: usuario.id,
      lineas: { create: [{ productoId, cantidad, precioUnitario: 10, subtotal: cantidad * 10 }] },
    },
  });
  return { compra, usuario };
}

/** Pedido con una línea y una distribución REGISTRADA que la entrega completa, sin movimientos. */
export async function crearDistribucionSinMovimientosDePrueba({
  productoId,
  cantidad,
  fecha = "2026-09-02",
}: {
  productoId: number;
  cantidad: number;
  fecha?: string;
}) {
  const { usuario } = await crearUsuarioDePrueba();
  const representante = await crearRepresentanteDePrueba();
  const pedido = await prisma.pedido.create({
    data: {
      representanteId: representante.id,
      fecha: fechaDeDocumento(fecha),
      usuarioId: usuario.id,
      lineas: { create: [{ productoId, cantidadSolicitada: cantidad }] },
    },
    include: { lineas: true },
  });
  const distribucion = await prisma.distribucion.create({
    data: {
      pedidoId: pedido.id,
      nroVale: String(900000 + siguiente()),
      fecha: fechaDeDocumento(fecha),
      usuarioId: usuario.id,
      lineas: { create: [{ pedidoDetalleId: pedido.lineas[0]!.id, cantidad }] },
    },
  });
  return { distribucion, representante, usuario };
}

/**
 * Salida por distribución de `cantidad` unidades, con su movimiento SALIDA_DISTRIBUCION registrado por
 * registrarMovimiento, como lo hará F-005. Si no hay stock suficiente, lanza el error de stock.
 */
export async function crearSalidaDePrueba({ productoId, cantidad, fecha = "2026-09-02" }: { productoId: number; cantidad: number; fecha?: string }) {
  const { distribucion, representante, usuario } = await crearDistribucionSinMovimientosDePrueba({ productoId, cantidad, fecha });
  await prisma.$transaction((tx) =>
    registrarMovimiento(tx, {
      productoId,
      tipo: "SALIDA_DISTRIBUCION",
      cantidad: -cantidad,
      fechaDocumento: distribucion.fecha,
      distribucionId: distribucion.id,
      usuarioId: usuario.id,
    }),
  );
  return { distribucion, representante };
}
