// Representantes de los centros de salud (F-002, Historia 4): cada centro tiene como máximo uno
// activo, la persona responsable de pedir los productos para ese centro (F-009, RN-18, D-22).
// Nunca se borran: se desactivan (FR-002, principio V).
import { condicionDeEstado, type FiltroCatalogo } from "@/esquemas/comunes";
import type { DatosRepresentante } from "@/esquemas/catalogos/representante";
import { ErrorDeNegocio } from "@/lib/errores";
import { esErrorDeDuplicado, prisma } from "@/lib/prisma";
import { coincideBusqueda, compararEnEspanol, recortarEspacios } from "@/lib/texto";
import { errorDuplicado } from "./comun";

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

/**
 * Guardado simultáneo: si dos personas guardan a la vez, decide la restricción única de la base (P2002)
 * y se repiten las MISMAS verificaciones del caso normal para dar el mismo mensaje (research C-05).
 * Hay dos restricciones que pueden saltar —el CI y el representante activo del centro (RN-18)—, por
 * eso cada operación pasa sus propias verificaciones y no se adivina cuál de las dos fue.
 */
async function traducirDuplicado(error: unknown, verificar: () => Promise<void>): Promise<never> {
  if (esErrorDeDuplicado(error)) await verificar();
  throw error;
}

type AccionSobreElCentro = "registrar" | "reactivar" | "cambiar";

const QUE_HACER: Record<AccionSobreElCentro, string> = {
  registrar: "registrar a otra persona",
  reactivar: "reactivar a este representante",
  cambiar: "cambiar a este representante de centro",
};

/**
 * RN-18: un centro de salud tiene como máximo un representante activo (D-22, research O-01). El
 * mensaje nombra al que está activo, porque si cambió la persona responsable es a quien hay que
 * desactivar primero. `idExcluido` deja fuera al propio representante cuando se lo modifica.
 */
async function verificarCentroLibre(centroSaludId: number, accion: AccionSobreElCentro, idExcluido?: number) {
  const activo = await prisma.representante.findFirst({
    where: { centroSaludId, activo: true, ...(idExcluido ? { id: { not: idExcluido } } : {}) },
    select: { nombre: true, apellido: true, centroSalud: { select: { nombre: true } } },
  });
  if (activo) {
    throw new ErrorDeNegocio(
      `El centro de salud '${activo.centroSalud.nombre}' ya tiene como representante activo a '${nombreCompleto(activo)}': desactívalo antes de ${QUE_HACER[accion]}`,
      "centroSaludId",
    );
  }
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
export function nombreCompleto(representante: { nombre: string; apellido: string }) {
  return `${representante.apellido}, ${representante.nombre}`;
}

/**
 * "Quispe, Ana · Policlínico Norte": cómo se muestra un representante en selectores y textos (D-23,
 * research O-04). El formato se escribe solo aquí; si cambia, cambia en todo el sistema.
 */
export function etiquetaRepresentante(representante: { nombre: string; apellido: string; centroSalud: string }) {
  return `${nombreCompleto(representante)} · ${representante.centroSalud}`;
}

export function compararPorApellido(a: { nombre: string; apellido: string }, b: { nombre: string; apellido: string }) {
  return compararEnEspanol(a.apellido, b.apellido) || compararEnEspanol(a.nombre, b.nombre);
}

/** Registra un representante activo en un centro de salud activo y sin otro representante activo (FR-010, RN-18). */
export async function registrarRepresentante(datos: DatosRepresentante): Promise<{ id: number }> {
  await verificarCiLibre(datos.ci);
  await verificarCentro(datos.centroSaludId);
  await verificarCentroLibre(datos.centroSaludId, "registrar");
  try {
    return await prisma.representante.create({ data: prepararDatos(datos), select: { id: true } });
  } catch (error) {
    return traducirDuplicado(error, async () => {
      await verificarCiLibre(datos.ci);
      await verificarCentroLibre(datos.centroSaludId, "registrar");
    });
  }
}

/**
 * Modifica los datos del representante. Los pedidos anteriores muestran el valor vigente (FR-027 de F-002).
 * RN-18 solo se evalúa si un representante ACTIVO cambia de centro: uno inactivo no ocupa el centro.
 */
export async function modificarRepresentante(id: number, datos: DatosRepresentante): Promise<void> {
  const actual = await prisma.representante.findUnique({ where: { id }, select: { centroSaludId: true, activo: true } });
  if (!actual) throw new ErrorDeNegocio("No existe el representante indicado");
  const cambiaDeCentroEstandoActivo = actual.activo && datos.centroSaludId !== actual.centroSaludId;

  await verificarCiLibre(datos.ci, id);
  await verificarCentro(datos.centroSaludId, actual.centroSaludId);
  if (cambiaDeCentroEstandoActivo) await verificarCentroLibre(datos.centroSaludId, "cambiar", id);
  try {
    await prisma.representante.update({ where: { id }, data: prepararDatos(datos) });
  } catch (error) {
    await traducirDuplicado(error, async () => {
      await verificarCiLibre(datos.ci, id);
      if (cambiaDeCentroEstandoActivo) await verificarCentroLibre(datos.centroSaludId, "cambiar", id);
    });
  }
}

/**
 * Pedidos PENDIENTE o PARCIAL del representante. La ficha los cuenta para avisar antes de desactivarlo
 * (FR-006): esos pedidos siguen a su nombre y se pueden distribuir o anular después.
 */
export function contarPedidosPorAtender(representanteId: number): Promise<number> {
  return prisma.pedido.count({ where: { representanteId, estado: { in: ["PENDIENTE", "PARCIAL"] } } });
}

/**
 * Desactiva un representante. Desde F-009 se permite aunque tenga pedidos por atender (RN-13 modificada,
 * D-22, research O-03): es la forma de reemplazar a la persona responsable de un centro. Sus pedidos
 * siguen a su nombre —es quien los hizo— y se pueden distribuir, anular y editar como cualquier otro.
 */
export async function desactivarRepresentante(id: number): Promise<void> {
  const representante = await prisma.representante.findUnique({ where: { id }, select: { activo: true } });
  if (!representante) throw new ErrorDeNegocio("No existe el representante indicado");
  if (!representante.activo) throw new ErrorDeNegocio("El representante ya está inactivo");
  await prisma.representante.update({ where: { id }, data: { activo: false } });
}

/** Reactiva un representante. RN-17: su centro de salud debe estar activo. RN-18: y sin otro representante activo. */
export async function reactivarRepresentante(id: number): Promise<void> {
  const representante = await prisma.representante.findUnique({
    where: { id },
    select: { activo: true, centroSaludId: true, centroSalud: { select: { nombre: true, activo: true } } },
  });
  if (!representante) throw new ErrorDeNegocio("No existe el representante indicado");
  if (representante.activo) throw new ErrorDeNegocio("El representante ya está activo");
  if (!representante.centroSalud.activo) {
    throw new ErrorDeNegocio(`Primero reactiva el centro de salud '${representante.centroSalud.nombre}'`);
  }
  await verificarCentroLibre(representante.centroSaludId, "reactivar");
  try {
    await prisma.representante.update({ where: { id }, data: { activo: true } });
  } catch (error) {
    await traducirDuplicado(error, () => verificarCentroLibre(representante.centroSaludId, "reactivar"));
  }
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
