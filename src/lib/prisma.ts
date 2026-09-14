// Cliente único de Prisma para todo el sistema (research R-05).
//
// No lleva `import "server-only"`: este archivo también lo usan la semilla (tsx) y las pruebas
// (Vitest), donde ese paquete lanza un error. En la aplicación solo lo importan los servicios,
// que corren en el servidor.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generado/prisma/client";

function crearCliente() {
  const adaptador = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // El adaptador envía las fechas en UTC pero sin indicar la zona, y PostgreSQL las interpreta en
    // la zona de la conexión. Si el servidor está en America/La_Paz, quedarían guardadas 4 horas
    // corridas y todo cálculo de fechas en SQL fallaría. Forzar UTC en la conexión lo evita,
    // sin importar cómo esté configurado el PostgreSQL de cada computadora.
    options: "-c TimeZone=UTC",
  });
  return new PrismaClient({ adapter: adaptador });
}

// En desarrollo, Next.js recarga los módulos en cada cambio. Guardar el cliente en globalThis
// evita abrir una conexión nueva a la base en cada recarga.
const globalConPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalConPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") {
  globalConPrisma.prisma = prisma;
}
