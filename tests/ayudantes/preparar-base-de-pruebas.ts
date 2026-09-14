// Se ejecuta una vez antes de todas las pruebas de integración:
// aplica las migraciones sobre la base de pruebas (research R-13).
import "dotenv/config";
import { execSync } from "node:child_process";

export default function prepararBaseDePruebas() {
  const urlPruebas = process.env.DATABASE_URL_TEST;
  if (!urlPruebas?.endsWith("_test")) {
    throw new Error("DATABASE_URL_TEST debe apuntar a una base cuyo nombre termine en _test.");
  }

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: urlPruebas },
  });
}
