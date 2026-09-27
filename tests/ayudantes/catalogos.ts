// Datos de prueba de catálogos (F-002, research C-11).
// Insertan directamente con Prisma registros válidos con valores únicos, para que cada prueba
// prepare solo lo que le interesa. También crean pedidos y movimientos mínimos: así las reglas que
// dependen de F-003 a F-005 (RN-13, RN-16) se prueban ahora, respetando las CHECK de la base.
import { prisma } from "@/lib/prisma";
import { normalizarTexto } from "@/lib/texto";
import type { EstadoPedido } from "@/generado/prisma/client";
import { registrarCompra } from "@/servicios/compras";
import { crearUsuarioDePrueba } from "./base-de-datos";

let contador = 0;
function siguiente() {
  contador += 1;
  return contador;
}

type Opciones<T> = Partial<T> & { activo?: boolean };

export function crearCategoriaDePrueba(datos: Opciones<{ nombre: string; descripcion: string }> = {}) {
  const nombre = datos.nombre ?? `Categoría ${siguiente()}`;
  return prisma.categoria.create({
    data: { nombre, nombreNormalizado: normalizarTexto(nombre), descripcion: datos.descripcion, activo: datos.activo ?? true },
  });
}

export function crearUnidadDePrueba(datos: Opciones<{ nombre: string; abreviatura: string }> = {}) {
  const nombre = datos.nombre ?? `Unidad ${siguiente()}`;
  return prisma.unidadMedida.create({
    data: { nombre, nombreNormalizado: normalizarTexto(nombre), abreviatura: datos.abreviatura ?? "UN", activo: datos.activo ?? true },
  });
}

export async function crearProductoDePrueba(
  datos: Opciones<{ codigo: string; nombre: string; categoriaId: number; unidadMedidaId: number; stockMinimo: number }> = {},
) {
  const numero = siguiente();
  const nombre = datos.nombre ?? `Producto ${numero}`;
  const categoriaId = datos.categoriaId ?? (await crearCategoriaDePrueba()).id;
  const unidadMedidaId = datos.unidadMedidaId ?? (await crearUnidadDePrueba()).id;
  return prisma.producto.create({
    data: {
      codigo: datos.codigo ?? `PRU-${numero}`,
      nombre,
      nombreNormalizado: normalizarTexto(nombre),
      categoriaId,
      unidadMedidaId,
      stockMinimo: datos.stockMinimo ?? 0,
      activo: datos.activo ?? true,
    },
  });
}

export function crearProveedorDePrueba(datos: Opciones<{ razonSocial: string; nit: string }> = {}) {
  const numero = siguiente();
  return prisma.proveedor.create({
    data: {
      razonSocial: datos.razonSocial ?? `Proveedor ${numero}`,
      nit: datos.nit ?? `900${numero}`,
      activo: datos.activo ?? true,
    },
  });
}

export function crearCentroSaludDePrueba(datos: Opciones<{ nombre: string }> = {}) {
  const nombre = datos.nombre ?? `Centro de salud ${siguiente()}`;
  return prisma.centroSalud.create({
    data: { nombre, nombreNormalizado: normalizarTexto(nombre), activo: datos.activo ?? true },
  });
}

export async function crearRepresentanteDePrueba(
  datos: Opciones<{ nombre: string; apellido: string; ci: string; centroSaludId: number }> = {},
) {
  const numero = siguiente();
  const centroSaludId = datos.centroSaludId ?? (await crearCentroSaludDePrueba()).id;
  return prisma.representante.create({
    data: {
      nombre: datos.nombre ?? "Ana",
      apellido: datos.apellido ?? `Prueba ${numero}`,
      ci: datos.ci ?? `100${numero}`,
      centroSaludId,
      activo: datos.activo ?? true,
    },
  });
}

/** Nombre del centro de salud de un representante, para comparar con lo que devuelven los servicios (F-009). */
export async function nombreDelCentro(representante: { centroSaludId: number }): Promise<string> {
  const centro = await prisma.centroSalud.findUniqueOrThrow({ where: { id: representante.centroSaludId }, select: { nombre: true } });
  return centro.nombre;
}

/**
 * Pedido con una línea del producto. Por defecto queda PENDIENTE con 10 solicitadas y 0 entregadas,
 * es decir, con saldo pendiente. Un pedido ANULADO lleva motivo, momento y usuario (CHECK de la base).
 */
export async function crearPedidoConSaldo({
  representanteId,
  productoId,
  estado = "PENDIENTE",
  solicitada = 10,
  entregada = 0,
}: {
  representanteId: number;
  productoId: number;
  estado?: EstadoPedido;
  solicitada?: number;
  entregada?: number;
}) {
  const { usuario } = await crearUsuarioDePrueba();
  const anulado = estado === "ANULADO";
  return prisma.pedido.create({
    data: {
      representanteId,
      fecha: new Date("2026-09-01"),
      estado,
      usuarioId: usuario.id,
      motivoAnulacion: anulado ? "Pedido de prueba anulado" : null,
      anuladaEn: anulado ? new Date() : null,
      anuladaPorId: anulado ? usuario.id : null,
      lineas: { create: [{ productoId, cantidadSolicitada: solicitada, cantidadEntregada: entregada }] },
    },
  });
}

/**
 * Compra REGISTRADA real de 1 unidad a Bs 10, registrada con registrarCompra: deja su movimiento
 * ENTRADA_COMPRA y suma 1 al stock sin escribir el stock a mano (principio III). El producto debe
 * estar activo.
 */
export async function crearMovimientoDePrueba(productoId: number) {
  const { usuario } = await crearUsuarioDePrueba();
  const proveedor = await crearProveedorDePrueba();
  return registrarCompra(
    {
      proveedorId: proveedor.id,
      nroFactura: String(700000 + siguiente()),
      fecha: "2026-09-01",
      lineas: [{ productoId, cantidad: 1, precioUnitario: "10.00" }],
    },
    usuario.id,
  );
}
