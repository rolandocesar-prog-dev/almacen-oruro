// Representantes de los centros de salud (F-002, Historia 4): cada centro tiene como máximo uno
// activo, la persona responsable de pedir los productos para ese centro (F-009, RN-18, D-22).
// Nunca se borran: se desactivan (FR-002, principio V).
import { condicionDeEstado, type FiltroCatalogo } from "@/esquemas/comunes";
import type { DatosRepresentante } from "@/esquemas/catalogos/representante";
import { ErrorDeNegocio } from "@/lib/errores";
import { esErrorDeDuplicado, prisma } from "@/lib/prisma";
import { coincideBusqueda, compararEnEspanol, recortarEspacios } from "@/lib/texto";
import { errorDuplicado, pluralizar } from "./comun";

/** Verifica que ningún OTRO representante, activo o inactivo, tenga el mismo CI (RN-11). */
async function verificarCiLibre(ci: string, exceptoId?: number) {
  const existente = await prisma.representante.findUnique({ where: { ci }, select: { id: true, ci: true, activo: true } });
  if (existente && existente.id !== exceptoId) {
    throw errorDuplicado({
      articulo: "un",
      catalogo: "representante",
      inactivo: !existente.activo,
      campo: "CI",
      valor: existente.ci,
      ruta: `/representantes/${existente.id}`,
      campoFormulario: "ci",
    });
  }
}

/** Guardado simultáneo del mismo CI: la base decide y se da el mismo mensaje (research C-05). */
async function traducirDuplicado(error: unknown, ci: string): Promise<never> {
  if (esErrorDeDuplicado(error)) await verificarCiLibre(ci);
  throw error;
}

/**
 * RN-14: el representante debe pertenecer a un centro activo. Excepción (FR-003): al editar se
 * puede conservar el centro que ya tenía aunque se haya desactivado.
 */
async function verificarCentro(centroSaludId: number, centroActualId?: number) {
  if (centroSaludId === centroActualId) return;
  const centro = await prisma.centroSalud.findUnique({ where: { id: centroSaludId }, select: { nombre: true, activo: true } });
  if (!centro) throw new ErrorDeNegocio("No existe el centro de salud elegido", "centroSaludId");
  if (!centro.activo) throw new ErrorDeNegocio(`El centro de salud '${centro.nombre}' está inactivo: elige uno activo`, "centroSaludId");
}

function prepararDatos(datos: DatosRepresentante) {
  return {
    nombre: recortarEspacios(datos.nombre),
    apellido: recortarEspacios(datos.apellido),
    ci: datos.ci,
    telefono: datos.telefono ?? null,
    centroSaludId: datos.centroSaludId,
  };
}

/** "Quispe, Ana": así se ordena y se busca en listas largas de personas. */
function nombreCompleto(representante: { nombre: string; apellido: string }) {
  return `${representante.apellido}, ${representante.nombre}`;
}

/**
 * "Quispe, Ana · Policlínico Norte": cómo se muestra un representante en selectores y textos (D-23,
 * research O-04). El formato se escribe solo aquí; si cambia, cambia en todo el sistema.
 */
export function etiquetaRepresentante(representante: { nombre: string; apellido: string; centroSalud: string }) {
  return `${nombreCompleto(representante)} · ${representante.centroSalud}`;
}

function compararPorApellido(a: { nombre: string; apellido: string }, b: { nombre: string; apellido: string }) {
  return compararEnEspanol(a.apellido, b.apellido) || compararEnEspanol(a.nombre, b.nombre);
}

/** Registra un representante activo en un centro de salud activo (FR-010). */
export async function registrarRepresentante(datos: DatosRepresentante): Promise<{ id: number }> {
  await verificarCiLibre(datos.ci);
  await verificarCentro(datos.centroSaludId);
  try {
    return await prisma.representante.create({ data: prepararDatos(datos), select: { id: true } });
  } catch (error) {
    return traducirDuplicado(error, datos.ci);
  }
}

/** Modifica los datos del representante. Los pedidos anteriores muestran el valor vigente (FR-027). */
export async function modificarRepresentante(id: number, datos: DatosRepresentante): Promise<void> {
  const actual = await prisma.representante.findUnique({ where: { id }, select: { centroSaludId: true } });
  if (!actual) throw new ErrorDeNegocio("No existe el representante indicado");

  await verificarCiLibre(datos.ci, id);
  await verificarCentro(datos.centroSaludId, actual.centroSaludId);
  try {
    await prisma.representante.update({ where: { id }, data: prepararDatos(datos) });
  } catch (error) {
    await traducirDuplicado(error, datos.ci);
  }
}

/**
 * Desactiva un representante. RN-13: no se puede mientras tenga pedidos PENDIENTE o PARCIAL,
 * porque esos pedidos todavía se deben distribuir o anular.
 */
export async function desactivarRepresentante(id: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const representante = await tx.representante.findUnique({ where: { id }, select: { activo: true } });
    if (!representante) throw new ErrorDeNegocio("No existe el representante indicado");
    if (!representante.activo) throw new ErrorDeNegocio("El representante ya está inactivo");

    const pedidosPorAtender = await tx.pedido.count({ where: { representanteId: id, estado: { in: ["PENDIENTE", "PARCIAL"] } } });
    if (pedidosPorAtender > 0) {
      throw new ErrorDeNegocio(`No se puede desactivar: tiene ${pluralizar(pedidosPorAtender, "pedido", "pedidos")} por atender`);
    }
    await tx.representante.update({ where: { id }, data: { activo: false } });
  });
}

/** Reactiva un representante. RN-17: su centro de salud debe estar activo. */
export async function reactivarRepresentante(id: number): Promise<void> {
  const representante = await prisma.representante.findUnique({
    where: { id },
    select: { activo: true, centroSalud: { select: { nombre: true, activo: true } } },
  });
  if (!representante) throw new ErrorDeNegocio("No existe el representante indicado");
  if (representante.activo) throw new ErrorDeNegocio("El representante ya está activo");
  if (!representante.centroSalud.activo) {
    throw new ErrorDeNegocio(`Primero reactiva el centro de salud '${representante.centroSalud.nombre}'`);
  }
  await prisma.representante.update({ where: { id }, data: { activo: true } });
}

/** Ficha del representante con su centro de salud, o null si no existe. */
export function obtenerRepresentante(id: number) {
  return prisma.representante.findUnique({
    where: { id },
    include: { centroSalud: { select: { id: true, nombre: true, activo: true } } },
  });
}

/**
 * Listado con filtro de estado y búsqueda por nombre, apellido, CI o centro de salud, en memoria
 * (research C-01). Ordenado por apellido y nombre.
 */
export async function listarRepresentantes({ q, estado }: FiltroCatalogo) {
  const representantes = await prisma.representante.findMany({
    where: { activo: condicionDeEstado(estado) },
    include: { centroSalud: { select: { nombre: true } } },
  });
  return representantes
    .filter((r) => coincideBusqueda(q, r.nombre, r.apellido, r.ci, r.centroSalud.nombre))
    .sort(compararPorApellido)
    .map((r) => ({
      id: r.id,
      nombreCompleto: nombreCompleto(r),
      // Para los filtros de pedidos, distribuciones y reportes: el formato sale de un solo lugar (D-23).
      etiqueta: etiquetaRepresentante({ ...r, centroSalud: r.centroSalud.nombre }),
      ci: r.ci,
      centroSalud: r.centroSalud.nombre,
      activo: r.activo,
    }));
}

/**
 * Opciones del selector de representantes de F-004: "Quispe, Ana · Policlínico Norte". Solo activos (RN-14),
 * más el actual marcado si está inactivo (FR-003).
 */
export async function listarRepresentantesParaSelector(idActual?: number) {
  const representantes = await prisma.representante.findMany({
    where: { OR: [{ activo: true }, ...(idActual ? [{ id: idActual }] : [])] },
    select: { id: true, nombre: true, apellido: true, activo: true, centroSalud: { select: { nombre: true } } },
  });
  return representantes.sort(compararPorApellido).map((r) => {
    const etiqueta = etiquetaRepresentante({ ...r, centroSalud: r.centroSalud.nombre });
    return { id: r.id, etiqueta: r.activo ? etiqueta : `${etiqueta} (inactivo)`, activo: r.activo };
  });
}
