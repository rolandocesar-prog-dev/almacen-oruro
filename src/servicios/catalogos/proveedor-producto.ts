// Productos que ofrece cada proveedor, con precio referencial (F-002, Historia 6).
// El precio referencial solo orienta: el precio real de cada compra se escribe en la compra (F-003).
// Las asociaciones no se borran: se desactivan (principio V).
import { Prisma } from "@/generado/prisma/client";
import type { DatosProveedorProducto } from "@/esquemas/catalogos/proveedor-producto";
import { ErrorDeNegocio } from "@/lib/errores";
import { esErrorDeDuplicado, prisma } from "@/lib/prisma";

/** El precio llega del esquema como texto con punto ("12.50"); se guarda como decimal exacto. */
function aDecimal(precio: string | undefined) {
  return precio ? new Prisma.Decimal(precio) : null;
}

/** Un proveedor no ofrece dos veces el mismo producto (RN-11): el par proveedor–producto es único. */
async function verificarParLibre(proveedorId: number, productoId: number, nombreProducto: string) {
  const existente = await prisma.proveedorProducto.findUnique({
    where: { proveedorId_productoId: { proveedorId, productoId } },
    select: { activo: true },
  });
  if (!existente) return;
  throw new ErrorDeNegocio(
    existente.activo
      ? `Este proveedor ya ofrece '${nombreProducto}'`
      : `Este proveedor ya tenía '${nombreProducto}' como inactivo: reactívalo en la lista`,
    "productoId",
  );
}

async function obtenerAsociacion(id: number) {
  const asociacion = await prisma.proveedorProducto.findUnique({
    where: { id },
    select: {
      id: true,
      activo: true,
      proveedorId: true,
      productoId: true,
      proveedor: { select: { razonSocial: true, activo: true } },
      producto: { select: { nombre: true, activo: true } },
    },
  });
  if (!asociacion) throw new ErrorDeNegocio("No existe la asociación indicada");
  return asociacion;
}

/** Agrega un producto a la lista del proveedor. Proveedor y producto deben estar activos (RN-14). */
export async function asociarProducto(proveedorId: number, datos: DatosProveedorProducto) {
  const proveedor = await prisma.proveedor.findUnique({ where: { id: proveedorId }, select: { razonSocial: true, activo: true } });
  if (!proveedor) throw new ErrorDeNegocio("No existe el proveedor indicado");
  if (!proveedor.activo) {
    throw new ErrorDeNegocio(`El proveedor '${proveedor.razonSocial}' está inactivo: reactívalo para agregarle productos`);
  }

  const producto = await prisma.producto.findUnique({ where: { id: datos.productoId }, select: { nombre: true, activo: true } });
  if (!producto) throw new ErrorDeNegocio("No existe el producto elegido", "productoId");
  if (!producto.activo) throw new ErrorDeNegocio(`El producto '${producto.nombre}' está inactivo: elige uno activo`, "productoId");

  await verificarParLibre(proveedorId, datos.productoId, producto.nombre);
  try {
    const asociacion = await prisma.proveedorProducto.create({
      data: { proveedorId, productoId: datos.productoId, precioReferencial: aDecimal(datos.precioReferencial) },
      select: { id: true },
    });
    return { asociacionId: asociacion.id, proveedorId, productoId: datos.productoId };
  } catch (error) {
    // Dos personas agregando el mismo producto a la vez: decide la restricción UNIQUE (research C-05).
    if (esErrorDeDuplicado(error)) await verificarParLibre(proveedorId, datos.productoId, producto.nombre);
    throw error;
  }
}

/** Cambia el precio referencial; sin precio lo deja vacío. */
export async function cambiarPrecioReferencial(asociacionId: number, precio: string | undefined) {
  const asociacion = await obtenerAsociacion(asociacionId);
  await prisma.proveedorProducto.update({ where: { id: asociacionId }, data: { precioReferencial: aDecimal(precio) } });
  return { proveedorId: asociacion.proveedorId, productoId: asociacion.productoId };
}

/** Quita el producto de la lista del proveedor sin borrar el registro. */
export async function desactivarAsociacion(asociacionId: number) {
  const asociacion = await obtenerAsociacion(asociacionId);
  if (!asociacion.activo) throw new ErrorDeNegocio("La asociación ya está inactiva");
  await prisma.proveedorProducto.update({ where: { id: asociacionId }, data: { activo: false } });
  return { proveedorId: asociacion.proveedorId, productoId: asociacion.productoId };
}

/** Vuelve a ofrecer el producto. RN-17: el proveedor y el producto deben estar activos. */
export async function reactivarAsociacion(asociacionId: number) {
  const asociacion = await obtenerAsociacion(asociacionId);
  if (asociacion.activo) throw new ErrorDeNegocio("La asociación ya está activa");
  if (!asociacion.proveedor.activo) {
    throw new ErrorDeNegocio(`No se puede reactivar: el proveedor '${asociacion.proveedor.razonSocial}' está inactivo`);
  }
  if (!asociacion.producto.activo) {
    throw new ErrorDeNegocio(`No se puede reactivar: el producto '${asociacion.producto.nombre}' está inactivo`);
  }
  await prisma.proveedorProducto.update({ where: { id: asociacionId }, data: { activo: true } });
  return { proveedorId: asociacion.proveedorId, productoId: asociacion.productoId };
}
