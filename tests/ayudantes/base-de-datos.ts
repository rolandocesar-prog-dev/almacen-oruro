// Ayudantes para las pruebas de integración.
import { prisma } from "@/lib/prisma";
import { calcularHashContrasena } from "@/lib/contrasenas";

// Orden indiferente: TRUNCATE ... CASCADE vacía todas juntas.
const TABLAS = [
  "movimiento_inventario",
  "distribucion_detalle",
  "distribucion",
  "pedido_detalle",
  "pedido",
  "compra_detalle",
  "compra",
  "proveedor_producto",
  "representante",
  "centro_salud",
  "producto",
  "unidad_medida",
  "categoria",
  "proveedor",
  "informe_ia",
  "sesion",
  "usuario",
  "configuracion",
];

/** Deja todas las tablas vacías. Se niega a correr fuera de la base de pruebas. */
export async function vaciarTablas(): Promise<void> {
  if (!process.env.DATABASE_URL?.endsWith("_test")) {
    throw new Error("vaciarTablas() solo puede usarse con una base cuyo nombre termine en _test.");
  }
  const lista = TABLAS.map((tabla) => `"${tabla}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE ${lista} RESTART IDENTITY CASCADE`);
}

let contador = 0;

/** Crea un usuario activo con contraseña conocida. */
export async function crearUsuarioDePrueba(
  datos: Partial<{ nombreUsuario: string; contrasena: string; activo: boolean; debeCambiarContrasena: boolean; nombre: string; apellido: string }> = {},
) {
  contador += 1;
  const contrasena = datos.contrasena ?? "clave-de-prueba";
  const usuario = await prisma.usuario.create({
    data: {
      nombre: datos.nombre ?? "Persona",
      apellido: datos.apellido ?? `Prueba ${contador}`,
      cargo: "Encargado de almacén",
      nombreUsuario: datos.nombreUsuario ?? `usuario${contador}`,
      contrasenaHash: await calcularHashContrasena(contrasena),
      activo: datos.activo ?? true,
      debeCambiarContrasena: datos.debeCambiarContrasena ?? false,
    },
  });
  return { usuario, contrasena };
}
