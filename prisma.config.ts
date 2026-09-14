// Configuración de Prisma 7: dónde está el esquema, las migraciones, la semilla
// y a qué base conectarse (research R-05).
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/semilla.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
