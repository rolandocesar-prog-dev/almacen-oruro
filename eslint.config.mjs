import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // El cliente de Prisma es código generado: no se revisa.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/generado/**"]),
]);
