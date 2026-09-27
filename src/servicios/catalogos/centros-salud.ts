// Centros de salud (F-002, Historia 4). Nunca se borran: se desactivan (FR-002, principio V).
import { condicionDeEstado, type FiltroCatalogo } from "@/esquemas/comunes";
import type { DatosCentroSalud } from "@/esquemas/catalogos/centro-salud";
import { ErrorDeNegocio } from "@/lib/errores";
import { esErrorDeDuplicado, prisma } from "@/lib/prisma";
import { coincideBusqueda, compararEnEspanol, normalizarTexto, recortarEspacios } from "@/lib/texto";
import { errorDuplicado } from "./comun";
import { compararPorApellido, nombreCompleto } from "./representantes";

/** Verifica que ningún OTRO centro, activo o inactivo, tenga el mismo nombre normalizado (RN-11). */
async function verificarNombreLibre(nombre: string, exceptoId?: number) {
  const existente = await prisma.centroSalud.findUnique({
    where: { nombreNormalizado: normalizarTexto(nombre) },
    select: { id: true, nombre: true, activo: true },
  });
  if (existente && existente.id !== exceptoId) {
    throw errorDuplicado({
      articulo: "un",
      catalogo: "centro de salud",
      inactivo: !existente.activo,
      campo: "nombre",
      valor: existente.nombre,
      ruta: `/centros-salud/${existente.id}`,
      campoFormulario: "nombre",
    });
  }
}

/** Guardado simultáneo del mismo nombre: la base decide y se da el mismo mensaje (research C-05). */
async function traducirDuplicado(error: unknown, nombre: string): Promise<never> {
  if (esErrorDeDuplicado(error)) await verificarNombreLibre(nombre);
  throw error;
}

function prepararDatos(datos: DatosCentroSalud) {
  const nombre = recortarEspacios(datos.nombre);
  return {
    nombre,
    nombreNormalizado: normalizarTexto(nombre),
    telefono: datos.telefono ?? null,
    direccion: datos.direccion ? recortarEspacios(datos.direccion) : null,
  };
}

async function obtenerExistente(id: number) {
  const centro = await prisma.centroSalud.findUnique({ where: { id }, select: { id: true, activo: true } });
  if (!centro) throw new ErrorDeNegocio("No existe el centro de salud indicado");
  return centro;
}

/** Registra un centro de salud activo (FR-009). */
export async function registrarCentroSalud(datos: DatosCentroSalud): Promise<{ id: number }> {
  await verificarNombreLibre(datos.nombre);
  try {
    return await prisma.centroSalud.create({ data: prepararDatos(datos), select: { id: true } });
  } catch (error) {
    return traducirDuplicado(error, datos.nombre);
  }
}

/** Modifica los datos del centro. No cambia el estado. */
export async function modificarCentroSalud(id: number, datos: DatosCentroSalud): Promise<void> {
  await obtenerExistente(id);
  await verificarNombreLibre(datos.nombre, id);
  try {
    await prisma.centroSalud.update({ where: { id }, data: prepararDatos(datos) });
  } catch (error) {
    await traducirDuplicado(error, datos.nombre);
  }
}

/**
 * Desactiva un centro. RN-13: no se puede mientras tenga un representante activo, porque quedaría
 * alguien haciendo pedidos para un centro que ya no se puede elegir. Como desde F-009 hay como máximo
 * uno (RN-18), el mensaje lo nombra en lugar de contar (FR-027).
 */
export async function desactivarCentroSalud(id: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const centro = await tx.centroSalud.findUnique({ where: { id }, select: { activo: true } });
    if (!centro) throw new ErrorDeNegocio("No existe el centro de salud indicado");
    if (!centro.activo) throw new ErrorDeNegocio("El centro de salud ya está inactivo");

    const activo = await tx.representante.findFirst({ where: { centroSaludId: id, activo: true }, select: { nombre: true, apellido: true } });
    if (activo) throw new ErrorDeNegocio(`No se puede desactivar: su representante activo es '${nombreCompleto(activo)}'`);
    await tx.centroSalud.update({ where: { id }, data: { activo: false } });
  });
}

/** Reactiva un centro. No depende de otro catálogo (RN-17). */
export async function reactivarCentroSalud(id: number): Promise<void> {
  const centro = await obtenerExistente(id);
  if (centro.activo) throw new ErrorDeNegocio("El centro de salud ya está activo");
  await prisma.centroSalud.update({ where: { id }, data: { activo: true } });
}

/** Ficha del centro con la cantidad de representantes activos, o null si no existe. */
export async function obtenerCentroSalud(id: number) {
  const centro = await prisma.centroSalud.findUnique({
    where: { id },
    include: { _count: { select: { representantes: { where: { activo: true } } } } },
  });
  if (!centro) return null;
  const { _count, ...datos } = centro;
  return { ...datos, representantesActivos: _count.representantes };
}

/** Listado con filtro de estado y búsqueda por nombre, en memoria (research C-01). */
export async function listarCentrosSalud({ q, estado }: FiltroCatalogo) {
  const centros = await prisma.centroSalud.findMany({
    where: { activo: condicionDeEstado(estado) },
    include: { _count: { select: { representantes: { where: { activo: true } } } } },
  });
  return centros
    .filter((centro) => coincideBusqueda(q, centro.nombre))
    .sort((a, b) => compararEnEspanol(a.nombre, b.nombre))
    .map((centro) => ({
      id: centro.id,
      nombre: centro.nombre,
      telefono: centro.telefono,
      activo: centro.activo,
      representantesActivos: centro._count.representantes,
    }));
}

/**
 * Opciones del selector de centro del formulario de representante (FR-005, research O-06): los centros
 * activos (RN-14) que no tienen representante activo (RN-18), más el centro actual del representante que
 * se modifica, marcado si está inactivo (FR-003 de F-002). Ofrecer solo centros libres evita el error
 * antes de que ocurra; la regla la siguen verificando el servicio y la base. Si queda uno solo, el
 * formulario lo preselecciona.
 */
export async function listarCentrosParaRepresentante(representanteId?: number) {
  const actual = representanteId
    ? await prisma.representante.findUnique({ where: { id: representanteId }, select: { centroSaludId: true } })
    : null;
  const centros = await prisma.centroSalud.findMany({
    where: {
      OR: [{ activo: true, representantes: { none: { activo: true } } }, ...(actual ? [{ id: actual.centroSaludId }] : [])],
    },
    select: { id: true, nombre: true, activo: true },
  });
  return centros
    .sort((a, b) => compararEnEspanol(a.nombre, b.nombre))
    .map(({ id, nombre, activo }) => ({ id, etiqueta: activo ? nombre : `${nombre} (inactivo)`, activo }));
}

/**
 * Representantes de la ficha del centro (FR-007): el activo, si hay, y los anteriores con nombre y CI,
 * ordenados por apellido. Sin fechas: cuándo pidió cada uno ya se ve en sus pedidos (aclaración del 26/09).
 */
export async function obtenerRepresentantesDelCentro(centroSaludId: number) {
  const representantes = await prisma.representante.findMany({
    where: { centroSaludId },
    select: { id: true, nombre: true, apellido: true, ci: true, activo: true },
  });
  const aFila = (r: (typeof representantes)[number]) => ({ id: r.id, nombreCompleto: nombreCompleto(r), ci: r.ci });
  const activo = representantes.find((r) => r.activo);
  return {
    activo: activo ? aFila(activo) : null,
    anteriores: representantes.filter((r) => !r.activo).sort(compararPorApellido).map(aFila),
  };
}
