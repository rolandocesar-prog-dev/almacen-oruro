// Categorías de productos (F-002, Historia 1). Nunca se borran: se desactivan (FR-002, principio V).
import { condicionDeEstado, type FiltroCatalogo } from "@/esquemas/comunes";
import type { DatosCategoria } from "@/esquemas/catalogos/categoria";
import { ErrorDeNegocio } from "@/lib/errores";
import { esErrorDeDuplicado, prisma } from "@/lib/prisma";
import { coincideBusqueda, compararEnEspanol, normalizarTexto, recortarEspacios } from "@/lib/texto";
import { errorDuplicado, pluralizar } from "./comun";

/**
 * Verifica que ninguna OTRA categoría, activa o inactiva, tenga el mismo nombre normalizado (RN-11).
 * " desinfectantes " y "Desinfectantes" son el mismo nombre. `exceptoId` permite guardar una
 * categoría sin cambiar su propio nombre.
 */
async function verificarNombreLibre(nombre: string, exceptoId?: number) {
  const existente = await prisma.categoria.findUnique({
    where: { nombreNormalizado: normalizarTexto(nombre) },
    select: { id: true, nombre: true, activo: true },
  });
  if (existente && existente.id !== exceptoId) {
    throw errorDuplicado({
      articulo: "una",
      catalogo: "categoría",
      inactivo: !existente.activo,
      campo: "nombre",
      valor: existente.nombre,
      ruta: `/categorias/${existente.id}`,
      campoFormulario: "nombre",
    });
  }
}

/**
 * Si dos personas guardan el mismo nombre a la vez, decide la restricción UNIQUE de la base (P2002).
 * Se vuelve a verificar para lanzar el mismo mensaje que en el caso normal (research C-05).
 */
async function traducirDuplicado(error: unknown, nombre: string): Promise<never> {
  if (esErrorDeDuplicado(error)) await verificarNombreLibre(nombre);
  throw error;
}

function prepararDatos(datos: DatosCategoria) {
  const nombre = recortarEspacios(datos.nombre);
  return {
    nombre,
    nombreNormalizado: normalizarTexto(nombre),
    descripcion: datos.descripcion ? recortarEspacios(datos.descripcion) : null,
  };
}

async function obtenerExistente(id: number) {
  const categoria = await prisma.categoria.findUnique({ where: { id }, select: { id: true, activo: true } });
  if (!categoria) throw new ErrorDeNegocio("No existe la categoría indicada");
  return categoria;
}

/** Registra una categoría activa (FR-004). */
export async function registrarCategoria(datos: DatosCategoria): Promise<{ id: number }> {
  await verificarNombreLibre(datos.nombre);
  try {
    return await prisma.categoria.create({ data: prepararDatos(datos), select: { id: true } });
  } catch (error) {
    return traducirDuplicado(error, datos.nombre);
  }
}

/** Modifica nombre y descripción. No cambia el estado. */
export async function modificarCategoria(id: number, datos: DatosCategoria): Promise<void> {
  await obtenerExistente(id);
  await verificarNombreLibre(datos.nombre, id);
  try {
    await prisma.categoria.update({ where: { id }, data: prepararDatos(datos) });
  } catch (error) {
    await traducirDuplicado(error, datos.nombre);
  }
}

/**
 * Desactiva una categoría. RN-13: no se puede si algún producto activo la usa, porque ese producto
 * quedaría con una categoría que ya no se puede elegir. Primero se desactivan o cambian sus productos.
 * La verificación y el cambio van en una misma transacción (research C-06).
 */
export async function desactivarCategoria(id: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const categoria = await tx.categoria.findUnique({ where: { id }, select: { activo: true } });
    if (!categoria) throw new ErrorDeNegocio("No existe la categoría indicada");
    if (!categoria.activo) throw new ErrorDeNegocio("La categoría ya está inactiva");

    const productosActivos = await tx.producto.count({ where: { categoriaId: id, activo: true } });
    if (productosActivos > 0) {
      throw new ErrorDeNegocio(
        `No se puede desactivar: ${pluralizar(productosActivos, "producto activo usa", "productos activos usan")} esta categoría`,
      );
    }
    await tx.categoria.update({ where: { id }, data: { activo: false } });
  });
}

/** Reactiva una categoría. No depende de otro catálogo, así que no tiene condiciones (RN-17). */
export async function reactivarCategoria(id: number): Promise<void> {
  const categoria = await obtenerExistente(id);
  if (categoria.activo) throw new ErrorDeNegocio("La categoría ya está activa");
  await prisma.categoria.update({ where: { id }, data: { activo: true } });
}

/** Ficha de una categoría con la cantidad de productos activos que la usan, o null si no existe. */
export async function obtenerCategoria(id: number) {
  const categoria = await prisma.categoria.findUnique({
    where: { id },
    include: { _count: { select: { productos: { where: { activo: true } } } } },
  });
  if (!categoria) return null;
  const { _count, ...datos } = categoria;
  return { ...datos, productosActivos: _count.productos };
}

/**
 * Listado con filtro de estado y búsqueda por nombre o descripción, sin mayúsculas ni tildes.
 * La búsqueda se hace en memoria porque las categorías son pocas (research C-01); se ordena por
 * nombre en español (FR-007).
 */
export async function listarCategorias({ q, estado }: FiltroCatalogo) {
  const categorias = await prisma.categoria.findMany({
    where: { activo: condicionDeEstado(estado) },
    include: { _count: { select: { productos: { where: { activo: true } } } } },
  });

  return categorias
    .filter((categoria) => coincideBusqueda(q, categoria.nombre, categoria.descripcion))
    .sort((a, b) => compararEnEspanol(a.nombre, b.nombre))
    .map((categoria) => ({
      id: categoria.id,
      nombre: categoria.nombre,
      descripcion: categoria.descripcion,
      activo: categoria.activo,
      productosActivos: categoria._count.productos,
    }));
}

/**
 * Opciones del selector de categoría del producto. Solo las activas se pueden elegir (RN-14); si el
 * producto que se edita tiene una categoría inactiva, se agrega marcada para no perder el valor (FR-003).
 */
export async function listarCategoriasParaSelector(idActual?: number) {
  const categorias = await prisma.categoria.findMany({
    where: { OR: [{ activo: true }, ...(idActual ? [{ id: idActual }] : [])] },
    select: { id: true, nombre: true, activo: true },
  });
  return categorias
    .sort((a, b) => compararEnEspanol(a.nombre, b.nombre))
    .map(({ id, nombre, activo }) => ({ id, etiqueta: activo ? nombre : `${nombre} (inactiva)`, activo }));
}
