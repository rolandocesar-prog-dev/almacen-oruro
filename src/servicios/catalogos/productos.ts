// Productos (F-002, Historia 2). Nunca se borran: se desactivan (FR-002, principio V).
//
// Este servicio NUNCA escribe el stock actual: empieza en 0 por el valor por defecto de la base y
// solo lo cambia el registro de movimientos del kardex (RN-15, principio III).
import type { FiltroCatalogo } from "@/esquemas/comunes";
import { condicionDeEstado } from "@/esquemas/comunes";
import type { DatosProducto } from "@/esquemas/catalogos/producto";
import { ErrorDeNegocio } from "@/lib/errores";
import { esErrorDeDuplicado, prisma } from "@/lib/prisma";
import { coincideBusqueda, compararEnEspanol, normalizarTexto, recortarEspacios } from "@/lib/texto";
import { errorDuplicado, pluralizar } from "./comun";

/** Verifica que ningún OTRO producto, activo o inactivo, tenga el mismo código o nombre (RN-11). */
async function verificarCodigoYNombreLibres(datos: DatosProducto, exceptoId?: number) {
  const porCodigo = await prisma.producto.findUnique({ where: { codigo: datos.codigo }, select: { id: true, codigo: true, activo: true } });
  if (porCodigo && porCodigo.id !== exceptoId) {
    throw errorDuplicado({
      articulo: "un",
      catalogo: "producto",
      inactivo: !porCodigo.activo,
      campo: "código",
      valor: porCodigo.codigo,
      ruta: `/productos/${porCodigo.id}`,
      campoFormulario: "codigo",
    });
  }

  const porNombre = await prisma.producto.findUnique({
    where: { nombreNormalizado: normalizarTexto(datos.nombre) },
    select: { id: true, nombre: true, activo: true },
  });
  if (porNombre && porNombre.id !== exceptoId) {
    throw errorDuplicado({
      articulo: "un",
      catalogo: "producto",
      inactivo: !porNombre.activo,
      campo: "nombre",
      valor: porNombre.nombre,
      ruta: `/productos/${porNombre.id}`,
      campoFormulario: "nombre",
    });
  }
}

/** Guardado simultáneo del mismo código o nombre: la base decide y se da el mismo mensaje (research C-05). */
async function traducirDuplicado(error: unknown, datos: DatosProducto): Promise<never> {
  if (esErrorDeDuplicado(error)) await verificarCodigoYNombreLibres(datos);
  throw error;
}

/**
 * RN-14: un producto solo puede quedar con una categoría y una unidad activas.
 * Excepción (FR-003): al editar, conservar la categoría o unidad que ya tenía aunque se haya
 * desactivado, para no obligar a cambiarla solo por guardar otro dato.
 */
async function verificarCategoriaYUnidad(datos: DatosProducto, actual?: { categoriaId: number; unidadMedidaId: number }) {
  if (datos.categoriaId !== actual?.categoriaId) {
    const categoria = await prisma.categoria.findUnique({ where: { id: datos.categoriaId }, select: { nombre: true, activo: true } });
    if (!categoria) throw new ErrorDeNegocio("No existe la categoría elegida", "categoriaId");
    if (!categoria.activo) throw new ErrorDeNegocio(`La categoría '${categoria.nombre}' está inactiva: elige una activa`, "categoriaId");
  }
  if (datos.unidadMedidaId !== actual?.unidadMedidaId) {
    const unidad = await prisma.unidadMedida.findUnique({ where: { id: datos.unidadMedidaId }, select: { nombre: true, activo: true } });
    if (!unidad) throw new ErrorDeNegocio("No existe la unidad de medida elegida", "unidadMedidaId");
    if (!unidad.activo) throw new ErrorDeNegocio(`La unidad de medida '${unidad.nombre}' está inactiva: elige una activa`, "unidadMedidaId");
  }
}

function prepararDatos(datos: DatosProducto) {
  const nombre = recortarEspacios(datos.nombre);
  return {
    codigo: datos.codigo,
    nombre,
    nombreNormalizado: normalizarTexto(nombre),
    descripcion: datos.descripcion ? recortarEspacios(datos.descripcion) : null,
    categoriaId: datos.categoriaId,
    unidadMedidaId: datos.unidadMedidaId,
    stockMinimo: datos.stockMinimo,
  };
}

/** Registra un producto activo con stock 0 (FR-006, RN-15). */
export async function registrarProducto(datos: DatosProducto): Promise<{ id: number }> {
  await verificarCodigoYNombreLibres(datos);
  await verificarCategoriaYUnidad(datos);
  try {
    return await prisma.producto.create({ data: prepararDatos(datos), select: { id: true } });
  } catch (error) {
    return traducirDuplicado(error, datos);
  }
}

/**
 * Modifica los datos del producto (FR-027: los documentos futuros muestran el valor vigente).
 * RN-16: la unidad de medida no cambia si el producto ya tiene movimientos, porque el stock y el
 * kardex están contados en la unidad anterior; cambiarla haría que "15" signifique otra cosa.
 */
export async function modificarProducto(id: number, datos: DatosProducto): Promise<void> {
  const actual = await prisma.producto.findUnique({
    where: { id },
    select: { categoriaId: true, unidadMedidaId: true, unidadMedida: { select: { nombre: true } } },
  });
  if (!actual) throw new ErrorDeNegocio("No existe el producto indicado");

  await verificarCodigoYNombreLibres(datos, id);
  await verificarCategoriaYUnidad(datos, actual);

  if (datos.unidadMedidaId !== actual.unidadMedidaId) {
    const movimientos = await prisma.movimientoInventario.count({ where: { productoId: id } });
    if (movimientos > 0) {
      throw new ErrorDeNegocio(
        `La unidad de medida no puede cambiar: el stock y el historial de este producto están expresados en '${actual.unidadMedida.nombre}'`,
        "unidadMedidaId",
      );
    }
  }

  try {
    await prisma.producto.update({ where: { id }, data: prepararDatos(datos) });
  } catch (error) {
    await traducirDuplicado(error, datos);
  }
}

/**
 * Desactiva un producto. Se permite aunque tenga stock (la ficha lo advierte al confirmar).
 * RN-13: no se puede si hay pedidos PENDIENTE o PARCIAL con saldo pendiente de este producto,
 * porque quedarían líneas que ya no se podrían distribuir.
 */
export async function desactivarProducto(id: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const producto = await tx.producto.findUnique({ where: { id }, select: { activo: true } });
    if (!producto) throw new ErrorDeNegocio("No existe el producto indicado");
    if (!producto.activo) throw new ErrorDeNegocio("El producto ya está inactivo");

    const pedidosConSaldo = await tx.pedido.count({
      where: {
        estado: { in: ["PENDIENTE", "PARCIAL"] },
        lineas: { some: { productoId: id, cantidadEntregada: { lt: tx.pedidoDetalle.fields.cantidadSolicitada } } },
      },
    });
    if (pedidosConSaldo > 0) {
      throw new ErrorDeNegocio(
        `No se puede desactivar: ${pluralizar(pedidosConSaldo, "pedido tiene", "pedidos tienen")} saldo pendiente de este producto`,
      );
    }
    await tx.producto.update({ where: { id }, data: { activo: false } });
  });
}

/**
 * Reactiva un producto. RN-17: su categoría y su unidad deben estar activas; si no, el producto
 * volvería a ofrecerse con datos que ya no se pueden elegir.
 */
export async function reactivarProducto(id: number): Promise<void> {
  const producto = await prisma.producto.findUnique({
    where: { id },
    select: { activo: true, categoria: { select: { nombre: true, activo: true } }, unidadMedida: { select: { nombre: true, activo: true } } },
  });
  if (!producto) throw new ErrorDeNegocio("No existe el producto indicado");
  if (producto.activo) throw new ErrorDeNegocio("El producto ya está activo");
  if (!producto.categoria.activo) {
    throw new ErrorDeNegocio(`Primero reactiva la categoría '${producto.categoria.nombre}' o cambia el producto a una categoría activa`);
  }
  if (!producto.unidadMedida.activo) {
    throw new ErrorDeNegocio(`Primero reactiva la unidad de medida '${producto.unidadMedida.nombre}' o cambia el producto a una unidad activa`);
  }
  await prisma.producto.update({ where: { id }, data: { activo: true } });
}

/** RN-52: un producto activo está bajo mínimo si su stock no supera el mínimo. Se calcula, no se guarda. */
export function estaBajoMinimo(producto: { activo: boolean; stockActual: number; stockMinimo: number }) {
  return producto.activo && producto.stockActual <= producto.stockMinimo;
}

/**
 * Ficha del producto con categoría, unidad, si tiene movimientos (para bloquear la unidad en la
 * edición, RN-16) y los proveedores activos que lo ofrecen con su precio referencial (FR-026).
 */
export async function obtenerProducto(id: number) {
  const producto = await prisma.producto.findUnique({
    where: { id },
    include: {
      categoria: { select: { id: true, nombre: true, activo: true } },
      unidadMedida: { select: { id: true, nombre: true, abreviatura: true, activo: true } },
      _count: { select: { movimientos: true } },
      proveedores: {
        where: { activo: true, proveedor: { activo: true } },
        select: { id: true, precioReferencial: true, proveedor: { select: { id: true, razonSocial: true, nit: true } } },
      },
    },
  });
  if (!producto) return null;

  const { _count, proveedores, ...datos } = producto;
  return {
    ...datos,
    bajoMinimo: estaBajoMinimo(producto),
    tieneMovimientos: _count.movimientos > 0,
    proveedores: proveedores
      .map((asociacion) => ({
        asociacionId: asociacion.id,
        proveedorId: asociacion.proveedor.id,
        razonSocial: asociacion.proveedor.razonSocial,
        nit: asociacion.proveedor.nit,
        precioReferencial: asociacion.precioReferencial?.toFixed(2) ?? null,
      }))
      .sort((a, b) => compararEnEspanol(a.razonSocial, b.razonSocial)),
  };
}

/**
 * Listado con filtros de estado y categoría y búsqueda por código o nombre, en memoria (research C-01).
 * Ordenado por nombre (FR-007).
 */
export async function listarProductos({ q, estado, categoriaId }: FiltroCatalogo & { categoriaId?: number }) {
  const productos = await prisma.producto.findMany({
    where: { activo: condicionDeEstado(estado), categoriaId },
    include: {
      categoria: { select: { nombre: true } },
      unidadMedida: { select: { nombre: true, abreviatura: true } },
    },
  });

  return productos
    .filter((producto) => coincideBusqueda(q, producto.codigo, producto.nombre))
    .sort((a, b) => compararEnEspanol(a.nombre, b.nombre))
    .map((producto) => ({
      id: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      categoria: producto.categoria.nombre,
      unidad: producto.unidadMedida.nombre,
      stockActual: producto.stockActual,
      stockMinimo: producto.stockMinimo,
      activo: producto.activo,
      bajoMinimo: estaBajoMinimo(producto),
    }));
}

/**
 * Opciones del selector de productos: "LIM-001 · Lavandina 1 L (Bidón 5 L)". Solo activos (RN-14),
 * más el actual marcado si está inactivo (FR-003). Lo usan proveedor–producto, compras y pedidos.
 */
export async function listarProductosParaSelector(idActual?: number) {
  const productos = await prisma.producto.findMany({
    where: { OR: [{ activo: true }, ...(idActual ? [{ id: idActual }] : [])] },
    select: { id: true, codigo: true, nombre: true, activo: true, unidadMedida: { select: { nombre: true } } },
  });
  return productos
    .sort((a, b) => compararEnEspanol(a.nombre, b.nombre))
    .map(({ id, codigo, nombre, activo, unidadMedida }) => {
      const etiqueta = `${codigo} · ${nombre} (${unidadMedida.nombre})`;
      return { id, etiqueta: activo ? etiqueta : `${etiqueta} (inactivo)`, activo };
    });
}
