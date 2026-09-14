// Reglas del personal que opera el sistema (F-001, historias 3 a 5).
// El personal nunca se borra: se desactiva (D-15, RN-12).
import { Prisma } from "@/generado/prisma/client";
import { prisma } from "@/lib/prisma";
import { ErrorDeNegocio } from "@/lib/errores";
import { calcularHashContrasena } from "@/lib/contrasenas";
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
