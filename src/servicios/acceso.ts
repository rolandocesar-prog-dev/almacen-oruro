// Reglas de acceso: ingreso, validación y cierre de sesiones (F-001, research R-03).
import { prisma } from "@/lib/prisma";
import { ErrorDeNegocio } from "@/lib/errores";
import { compararContrasena, HASH_FICTICIO } from "@/lib/contrasenas";
import { normalizarTexto } from "@/lib/texto";
import { sumarHoras } from "@/lib/fechas";
import { calcularHashToken, DURACION_SESION_HORAS, generarToken } from "@/lib/token-sesion";

// El mismo mensaje para cualquier falla: no revela si el usuario existe (FR-003, RN-01).
const MENSAJE_INGRESO_INCORRECTO = "Usuario o contraseña incorrectos";

/** Datos del usuario de una sesión vigente. Nunca incluye el hash de la contraseña. */
export type SesionVigente = {
  sesionId: number;
  usuario: {
    id: number;
    nombre: string;
    apellido: string;
    nombreUsuario: string;
    debeCambiarContrasena: boolean;
  };
};

export type ResultadoValidacionSesion =
  | { estado: "vigente"; sesion: SesionVigente }
  | { estado: "inexistente" }
  | { estado: "expirada" };

/**
 * Ingreso con usuario y contraseña (FR-001 a FR-005).
 * Devuelve el token que irá en la cookie; en la base solo queda su hash.
 */
export async function iniciarSesion(nombreUsuario: string, contrasena: string) {
  // Cada ingreso aprovecha para cerrar las sesiones que nadie volvió a usar, así la bitácora
  // queda completa aunque nunca se consulte el historial (FR-007, SC-005).
  await cerrarSesionesVencidas();

  const usuario = await prisma.usuario.findUnique({
    where: { nombreUsuario: normalizarTexto(nombreUsuario) },
    select: { id: true, contrasenaHash: true, activo: true, debeCambiarContrasena: true },
  });

  if (!usuario) {
    // Se compara igual contra un hash ficticio para que la respuesta tarde lo mismo que con un
    // usuario real: así nadie puede averiguar qué cuentas existen midiendo el tiempo (SC-007).
    await compararContrasena(contrasena, HASH_FICTICIO);
    throw new ErrorDeNegocio(MENSAJE_INGRESO_INCORRECTO);
  }

  const contrasenaCorrecta = await compararContrasena(contrasena, usuario.contrasenaHash);
  // Un usuario inactivo recibe el mismo mensaje: no se revela que la cuenta existe (RN-01).
  if (!contrasenaCorrecta || !usuario.activo) {
    throw new ErrorDeNegocio(MENSAJE_INGRESO_INCORRECTO);
  }

  const token = generarToken();
  await prisma.sesion.create({
    data: { usuarioId: usuario.id, tokenHash: calcularHashToken(token), inicio: new Date() },
  });

  return { token, debeCambiarContrasena: usuario.debeCambiarContrasena };
}

/**
 * Comprueba si el token de la cookie corresponde a una sesión vigente (FR-004).
 * Una sesión vigente existe, no tiene fin y su usuario está activo.
 */
export async function validarSesion(token: string): Promise<ResultadoValidacionSesion> {
  const sesion = await prisma.sesion.findUnique({
    where: { tokenHash: calcularHashToken(token) },
    select: {
      id: true,
      inicio: true,
      fin: true,
      usuario: {
        select: { id: true, nombre: true, apellido: true, nombreUsuario: true, debeCambiarContrasena: true, activo: true },
      },
    },
  });

  if (!sesion || sesion.fin) {
    return { estado: "inexistente" };
  }

  // La sesión vale 8 horas desde el ingreso, sin importar la actividad (RN-03, aclaración 4).
  // Al detectarla vencida se cierra con fin = inicio + 8 h: el momento en que realmente dejó de valer.
  const venceEn = sumarHoras(sesion.inicio, DURACION_SESION_HORAS);
  if (venceEn <= new Date()) {
    await prisma.sesion.update({
      where: { id: sesion.id },
      data: { fin: venceEn, motivoCierre: "EXPIRADA" },
    });
    return { estado: "expirada" };
  }

  // Si el usuario fue desactivado, la sesión deja de valer y se registra por qué terminó (FR-008).
  if (!sesion.usuario.activo) {
    await prisma.sesion.update({
      where: { id: sesion.id },
      data: { fin: new Date(), motivoCierre: "DESACTIVACION" },
    });
    return { estado: "inexistente" };
  }

  const { id, nombre, apellido, nombreUsuario, debeCambiarContrasena } = sesion.usuario;
  return {
    estado: "vigente",
    sesion: { sesionId: sesion.id, usuario: { id, nombre, apellido, nombreUsuario, debeCambiarContrasena } },
  };
}

/** Cierra la sesión del token cuando el usuario elige "Cerrar sesión" (FR-006). */
export async function cerrarSesion(token: string): Promise<void> {
  // updateMany no falla si la sesión ya estaba cerrada o no existe: cerrar sesión siempre funciona.
  await prisma.sesion.updateMany({
    where: { tokenHash: calcularHashToken(token), fin: null },
    data: { fin: new Date(), motivoCierre: "USUARIO" },
  });
}

/**
 * Cierra en la base las sesiones abiertas que pasaron las 8 horas sin que nadie las volviera a usar
 * (por ejemplo, se apagó la computadora), con fin = inicio + 8 h (Historia 2, escenario 3).
 *
 * Se usa SQL parametrizado porque el fin de cada sesión depende de su propio inicio, y un
 * `updateMany` de Prisma solo puede asignar el mismo valor a todas las filas.
 */
export async function cerrarSesionesVencidas(): Promise<void> {
  await prisma.$executeRaw`
    UPDATE sesion
    SET fin = inicio + make_interval(hours => ${DURACION_SESION_HORAS}::int),
        motivo_cierre = 'EXPIRADA',
        actualizado_en = now()
    WHERE fin IS NULL
      AND inicio + make_interval(hours => ${DURACION_SESION_HORAS}::int) <= now()`;
}
