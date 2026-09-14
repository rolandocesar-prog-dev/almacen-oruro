// Configuración de pruebas (research R-13):
// - unitarios: funciones puras, sin base de datos.
// - integracion: servicios contra PostgreSQL real, en la base almacen_oruro_test.
import "dotenv/config";
import path from "node:path";
import { defineConfig } from "vitest/config";

const raiz = import.meta.dirname;

const urlBasePruebas = process.env.DATABASE_URL_TEST;
if (!urlBasePruebas) {
  throw new Error("Falta DATABASE_URL_TEST en .env: las pruebas de integración necesitan su propia base.");
}

const alias = {
  "@": path.join(raiz, "src"),
  // server-only lanza un error fuera de Next.js; en las pruebas se reemplaza por un módulo vacío.
  "server-only": path.join(raiz, "tests/ayudantes/modulo-vacio.ts"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unitarios",
          environment: "node",
          include: ["tests/unitarios/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integracion",
          environment: "node",
          include: ["tests/integracion/**/*.test.ts"],
          // Un archivo a la vez: todos comparten la misma base de pruebas.
          fileParallelism: false,
          env: {
            DATABASE_URL: urlBasePruebas,
            BCRYPT_COSTO: "4",
            TZ: "America/La_Paz",
          },
          globalSetup: ["tests/ayudantes/preparar-base-de-pruebas.ts"],
          testTimeout: 20000,
          hookTimeout: 60000,
        },
      },
    ],
  },
});
