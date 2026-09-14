// Reglas del personal que opera el sistema (F-001, historias 3 a 5).
// El personal nunca se borra: se desactiva (D-15, RN-12).
import { Prisma } from "@/generado/prisma/client";
import { prisma } from "@/lib/prisma";
import { ErrorDeNegocio } from "@/lib/errores";
import { calcularHashContrasena, compararContrasena } from "@/lib/contrasenas";
import { recortarEspacios } from "@/lib/texto";
import type { DatosPersonales, DatosRegistroPersonal, FiltroPersonal } from "@/esquemas/personal";

// Solo los campos que muestran las pantallas. Nunca el hash de la contraseña (FR-014).
const camposPublicos = {
  id: true,
  nombre: true,
  apellido: true,
  cargo: true,
  direccion: true,
  telefono: true,
  nombreUsuario: true,
  activo: true,
  debeCambiarContrasena: true,
  creadoEn: true,
} satisfies Prisma.UsuarioSelect;

function mensajeDuplicado(nombreUsuario: string) {
  return `Ya existe un usuario con el nombre de usuario '${nombreUsuario}'`;
}

/** ¿El error de Prisma es de valor único repetido? (código P2002) */
function esDuplicado(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Verifica que el nombre de usuario no lo use otra persona, activa o inactiva (FR-012).
 * `exceptoId` permite guardar a una persona sin cambiar su propio nombre de usuario.
 */
async function verificarNombreUsuarioLibre(nombreUsuario: string, exceptoId?: number) {
  const existente = await prisma.usuario.findUnique({ where: { nombreUsuario }, select: { id: true } });
  if (existente && existente.id !== exceptoId) {
    throw new ErrorDeNegocio(mensajeDuplicado(nombreUsuario), "nombreUsuario");
  }
}

/** Datos personales listos para guardar: espacios internos simples en los textos. */
function prepararDatosPersonales(datos: DatosPersonales) {
  return {
    nombre: recortarEspacios(datos.nombre),
    apellido: recortarEspacios(datos.apellido),
    cargo: recortarEspacios(datos.cargo),
    direccion: datos.direccion ? recortarEspacios(datos.direccion) : null,
    telefono: datos.telefono ?? null,
    nombreUsuario: datos.nombreUsuario,
  };
}

/** Registra a una persona que va a operar el sistema (FR-010 a FR-014). */
export async function registrarPersonal(datos: DatosRegistroPersonal): Promise<{ id: number }> {
  // Se verifica antes para dar un mensaje claro; la restricción UNIQUE de la base decide si
  // dos personas intentan registrar el mismo nombre de usuario al mismo tiempo.
  await verificarNombreUsuarioLibre(datos.nombreUsuario);

  try {
    return await prisma.usuario.create({
      data: {
        ...prepararDatosPersonales(datos),
        contrasenaHash: await calcularHashContrasena(datos.contrasena),
        activo: true,
        debeCambiarContrasena: false,
      },
      select: { id: true },
    });
  } catch (error) {
    if (esDuplicado(error)) throw new ErrorDeNegocio(mensajeDuplicado(datos.nombreUsuario), "nombreUsuario");
    throw error;
  }
}

/**
 * Modifica los datos personales y el nombre de usuario (FR-015).
 * Nunca toca la contraseña, el estado ni la marca de cambio pendiente: esos cambian solo con sus
 * propias acciones.
 */
export async function modificarPersonal(id: number, datos: DatosPersonales): Promise<void> {
  await obtenerExistente(id);
  await verificarNombreUsuarioLibre(datos.nombreUsuario, id);

  try {
    await prisma.usuario.update({ where: { id }, data: prepararDatosPersonales(datos) });
  } catch (error) {
    if (esDuplicado(error)) throw new ErrorDeNegocio(mensajeDuplicado(datos.nombreUsuario), "nombreUsuario");
    throw error;
  }
}

/**
 * Desactiva a una persona: ya no puede ingresar y se cierran sus sesiones abiertas (FR-008, FR-016).
 * Nadie puede desactivarse a sí mismo: así siempre queda al menos un usuario activo (RN-04).
 */
export async function desactivarPersonal(id: number, idUsuarioQueOpera: number): Promise<void> {
  if (id === idUsuarioQueOpera) {
    throw new ErrorDeNegocio("No puedes desactivar tu propio usuario");
  }
  const persona = await obtenerExistente(id);
  if (!persona.activo) {
    throw new ErrorDeNegocio("La persona ya está inactiva");
  }

  // En una sola transacción: o se desactiva y se cierran sus sesiones, o no cambia nada.
  const ahora = new Date();
  await prisma.$transaction([
    prisma.usuario.update({ where: { id }, data: { activo: false } }),
    prisma.sesion.updateMany({ where: { usuarioId: id, fin: null }, data: { fin: ahora, motivoCierre: "DESACTIVACION" } }),
  ]);
}

/** Reactiva a una persona. Conserva su contraseña y su marca de cambio pendiente (FR-016). */
export async function reactivarPersonal(id: number): Promise<void> {
  const persona = await obtenerExistente(id);
  if (persona.activo) {
    throw new ErrorDeNegocio("La persona ya está activa");
  }
  await prisma.usuario.update({ where: { id }, data: { activo: true } });
}

/**
 * Cambio de la propia contraseña indicando la actual (FR-019). También resuelve el cambio
 * obligatorio: la "actual" es entonces la temporal o la inicial con la que acaba de ingresar (FR-021).
 * La sesión en uso sigue vigente.
 */
export async function cambiarContrasenaPropia(idUsuario: number, actual: string, nueva: string): Promise<void> {
  const usuario = await prisma.usuario.findUnique({ where: { id: idUsuario }, select: { contrasenaHash: true } });
  if (!usuario || !(await compararContrasena(actual, usuario.contrasenaHash))) {
    throw new ErrorDeNegocio("La contraseña actual no es correcta", "contrasenaActual");
  }
  if (nueva === actual) {
    throw new ErrorDeNegocio("La contraseña nueva debe ser distinta de la actual", "contrasenaNueva");
  }

  await prisma.usuario.update({
    where: { id: idUsuario },
    data: { contrasenaHash: await calcularHashContrasena(nueva), debeCambiarContrasena: false },
  });
}

/**
 * Restablece la contraseña de OTRA persona con una temporal que escribe el encargado (FR-020).
 * La temporal la conoce quien la escribió, por eso la persona debe cambiarla al ingresar, y sus
 * sesiones abiertas se cierran para que nadie siga usando la cuenta con la contraseña anterior (RN-06).
 */
export async function restablecerContrasena(id: number, temporal: string, idUsuarioQueOpera: number): Promise<void> {
  if (id === idUsuarioQueOpera) {
    throw new ErrorDeNegocio("Para cambiar tu propia contraseña usa 'Cambiar mi contraseña'");
  }
  await obtenerExistente(id);

  const hash = await calcularHashContrasena(temporal);
  const ahora = new Date();
  await prisma.$transaction([
    prisma.usuario.update({ where: { id }, data: { contrasenaHash: hash, debeCambiarContrasena: true } }),
    prisma.sesion.updateMany({ where: { usuarioId: id, fin: null }, data: { fin: ahora, motivoCierre: "RESTABLECIMIENTO" } }),
  ]);
}

async function obtenerExistente(id: number) {
  const persona = await prisma.usuario.findUnique({ where: { id }, select: { id: true, activo: true } });
  if (!persona) {
    throw new ErrorDeNegocio("No existe la persona indicada");
  }
  return persona;
}

/** Ficha de una persona, o null si no existe. */
export function obtenerPersonal(id: number) {
  return prisma.usuario.findUnique({ where: { id }, select: camposPublicos });
}

/** Listado del personal con búsqueda y filtro de estado, ordenado por apellido y nombre (FR-018). */
export async function listarPersonal({ q, estado }: Pick<FiltroPersonal, "estado"> & { q?: string }) {
  const texto = q?.trim();
  const personas = await prisma.usuario.findMany({
    where: {
      activo: estado === "todos" ? undefined : estado === "activos",
      OR: texto
        ? [
            { nombre: { contains: texto, mode: "insensitive" } },
            { apellido: { contains: texto, mode: "insensitive" } },
            { nombreUsuario: { contains: texto, mode: "insensitive" } },
          ]
        : undefined,
    },
    select: { id: true, nombre: true, apellido: true, cargo: true, nombreUsuario: true, activo: true },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });

  return personas.map(({ nombre, apellido, ...resto }) => ({ ...resto, nombreCompleto: `${nombre} ${apellido}` }));
}
