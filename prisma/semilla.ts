// Datos iniciales de la base (FR-023, RN-05).
// Ejecutar con: npx prisma db seed
//
// Es idempotente: ejecutarla dos veces no duplica nada ni cambia la contraseña de admin.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { calcularHashContrasena } from "../src/lib/contrasenas";

async function main() {
  const contrasenaInicial = process.env.CONTRASENA_INICIAL;
  if (!contrasenaInicial || contrasenaInicial.length < 8) {
    throw new Error("Define CONTRASENA_INICIAL en .env con al menos 8 caracteres antes de cargar la semilla.");
  }

  // La configuración es una sola fila (id 1). Una base nueva no es de demostración.
  const configuracionExistente = await prisma.configuracion.findUnique({ where: { id: 1 } });
  if (configuracionExistente) {
    console.log("• La configuración ya existía: no se modificó.");
  } else {
    await prisma.configuracion.create({ data: { id: 1, modoDemostracion: false } });
    console.log("✓ Configuración creada.");
  }

  // Usuario inicial: debe cambiar su contraseña en el primer ingreso (RN-05).
  const adminExistente = await prisma.usuario.findUnique({ where: { nombreUsuario: "admin" } });
  if (adminExistente) {
    console.log("• El usuario 'admin' ya existía: no se modificó su contraseña.");
  } else {
    await prisma.usuario.create({
      data: {
        nombre: "Administrador",
        apellido: "Sistema",
        cargo: "Encargado de almacén",
        nombreUsuario: "admin",
        contrasenaHash: await calcularHashContrasena(contrasenaInicial),
        debeCambiarContrasena: true,
        activo: true,
      },
    });
    console.log("✓ Usuario 'admin' creado. Ingresa con la contraseña de CONTRASENA_INICIAL y cámbiala.");
  }
}

main()
  .catch((error: unknown) => {
    console.error("✗ No se pudo cargar la semilla:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
