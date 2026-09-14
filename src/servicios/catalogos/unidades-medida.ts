// Unidades de medida (F-002, Historia 1). Nunca se borran: se desactivan (FR-002, principio V).
import { condicionDeEstado, type FiltroCatalogo } from "@/esquemas/comunes";
import type { DatosUnidadMedida } from "@/esquemas/catalogos/unidad-medida";
import { ErrorDeNegocio } from "@/lib/errores";
import { esErrorDeDuplicado, prisma } from "@/lib/prisma";
import { coincideBusqueda, compararEnEspanol, normalizarTexto, recortarEspacios } from "@/lib/texto";
import { errorDuplicado, pluralizar } from "./comun";

/** Verifica que ninguna OTRA unidad, activa o inactiva, tenga el mismo nombre normalizado (RN-11). */
async function verificarNombreLibre(nombre: string, exceptoId?: number) {
  const existente = await prisma.unidadMedida.findUnique({
    where: { nombreNormalizado: normalizarTexto(nombre) },
    select: { id: true, nombre: true, activo: true },
  });
  if (existente && existente.id !== exceptoId) {
    throw errorDuplicado({
      articulo: "una",
      catalogo: "unidad de medida",
      inactivo: !existente.activo,
      campo: "nombre",
      valor: existente.nombre,
      ruta: `/unidades/${existente.id}`,
      campoFormulario: "nombre",
    });
  }
}

/** Guardado simultáneo del mismo nombre: la base decide y se da el mismo mensaje (research C-05). */
async function traducirDuplicado(error: unknown, nombre: string): Promise<never> {
  if (esErrorDeDuplicado(error)) await verificarNombreLibre(nombre);
  throw error;
}

function prepararDatos(datos: DatosUnidadMedida) {
  const nombre = recortarEspacios(datos.nombre);
  return { nombre, nombreNormalizado: normalizarTexto(nombre), abreviatura: recortarEspacios(datos.abreviatura) };
}

async function obtenerExistente(id: number) {
  const unidad = await prisma.unidadMedida.findUnique({ where: { id }, select: { id: true, activo: true } });
  if (!unidad) throw new ErrorDeNegocio("No existe la unidad de medida indicada");
  return unidad;
}

/** Registra una unidad de medida activa (FR-005). */
export async function registrarUnidadMedida(datos: DatosUnidadMedida): Promise<{ id: number }> {
  await verificarNombreLibre(datos.nombre);
  try {
    return await prisma.unidadMedida.create({ data: prepararDatos(datos), select: { id: true } });
  } catch (error) {
    return traducirDuplicado(error, datos.nombre);
  }
}

/** Modifica nombre y abreviatura. No cambia el estado. */
export async function modificarUnidadMedida(id: number, datos: DatosUnidadMedida): Promise<void> {
  await obtenerExistente(id);
  await verificarNombreLibre(datos.nombre, id);
  try {
    await prisma.unidadMedida.update({ where: { id }, data: prepararDatos(datos) });
  } catch (error) {
    await traducirDuplicado(error, datos.nombre);
  }
}

/**
 * Desactiva una unidad. RN-13: no se puede si algún producto activo la usa. Verificación y cambio en
 * una misma transacción (research C-06).
 */
export async function desactivarUnidadMedida(id: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const unidad = await tx.unidadMedida.findUnique({ where: { id }, select: { activo: true } });
    if (!unidad) throw new ErrorDeNegocio("No existe la unidad de medida indicada");
    if (!unidad.activo) throw new ErrorDeNegocio("La unidad de medida ya está inactiva");

    const productosActivos = await tx.producto.count({ where: { unidadMedidaId: id, activo: true } });
    if (productosActivos > 0) {
      throw new ErrorDeNegocio(
        `No se puede desactivar: ${pluralizar(productosActivos, "producto activo usa", "productos activos usan")} esta unidad de medida`,
      );
    }
    await tx.unidadMedida.update({ where: { id }, data: { activo: false } });
  });
}

/** Reactiva una unidad. No depende de otro catálogo, así que no tiene condiciones (RN-17). */
export async function reactivarUnidadMedida(id: number): Promise<void> {
  const unidad = await obtenerExistente(id);
  if (unidad.activo) throw new ErrorDeNegocio("La unidad de medida ya está activa");
  await prisma.unidadMedida.update({ where: { id }, data: { activo: true } });
}

/** Ficha de una unidad con la cantidad de productos activos que la usan, o null si no existe. */
export async function obtenerUnidadMedida(id: number) {
  const unidad = await prisma.unidadMedida.findUnique({
    where: { id },
    include: { _count: { select: { productos: { where: { activo: true } } } } },
  });
  if (!unidad) return null;
  const { _count, ...datos } = unidad;
  return { ...datos, productosActivos: _count.productos };
}

/** Listado con filtro de estado y búsqueda por nombre o abreviatura, en memoria (research C-01). */
export async function listarUnidadesMedida({ q, estado }: FiltroCatalogo) {
  const unidades = await prisma.unidadMedida.findMany({
    where: { activo: condicionDeEstado(estado) },
    include: { _count: { select: { productos: { where: { activo: true } } } } },
  });

  return unidades
    .filter((unidad) => coincideBusqueda(q, unidad.nombre, unidad.abreviatura))
    .sort((a, b) => compararEnEspanol(a.nombre, b.nombre))
    .map((unidad) => ({
      id: unidad.id,
      nombre: unidad.nombre,
      abreviatura: unidad.abreviatura,
      activo: unidad.activo,
      productosActivos: unidad._count.productos,
    }));
}

/**
 * Opciones del selector de unidad del producto: "Bidón 5 L (BID5)". Solo activas (RN-14), más la
 * actual marcada si está inactiva (FR-003).
 */
export async function listarUnidadesParaSelector(idActual?: number) {
  const unidades = await prisma.unidadMedida.findMany({
    where: { OR: [{ activo: true }, ...(idActual ? [{ id: idActual }] : [])] },
    select: { id: true, nombre: true, abreviatura: true, activo: true },
  });
  return unidades
    .sort((a, b) => compararEnEspanol(a.nombre, b.nombre))
    .map(({ id, nombre, abreviatura, activo }) => {
      const etiqueta = `${nombre} (${abreviatura})`;
      return { id, etiqueta: activo ? etiqueta : `${etiqueta} (inactiva)`, activo };
    });
}
