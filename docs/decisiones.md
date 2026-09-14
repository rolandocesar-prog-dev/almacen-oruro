# Registro de decisiones técnicas

Toda decisión de diseño relevante se registra aquí con su fundamento (constitución, principio I).
Las decisiones de alcance y de negocio están en
[`especificacion/00-decisiones-y-alcance.md`](especificacion/00-decisiones-y-alcance.md) (D-01 a D-16).

**Formato de cada entrada:** fecha · decisión · fundamento · alternativas descartadas · enlace al
detalle.

---

## Arquitectura (plan de F-001, 13/09/2026)

Detalle completo en [`specs/001-acceso-personal/research.md`](../specs/001-acceso-personal/research.md).

| # | Fecha | Decisión | Fundamento | Alternativas descartadas |
|---|---|---|---|---|
| T-01 | 13/09 | Versiones exactas y estables: Next.js 16.3.5, React 19.3, TypeScript 5.9.3, Prisma 7.10, Zod 4.6, Vitest 4.1, Tailwind 4.3 | Sin margen para depurar versiones recién publicadas; instalación idéntica en otra computadora | Prisma 8 RC, TypeScript 7, Vitest 5 (R-01) |
| T-02 | 13/09 | Un solo proyecto Next.js; flujo página → Server Action → servicio → Prisma | Lo exige la constitución; se explica en una línea | Monorepo, repositorios genéricos (R-02) |
| T-03 | 13/09 | Sesiones en base de datos sin librería: token aleatorio en cookie, hash SHA-256 en la tabla `sesion` | Bitácora con motivo, cierre inmediato al desactivar y sesiones simultáneas; unas 80 líneas propias | Auth.js, iron-session, jose, Better Auth (R-03) |
| T-04 | 13/09 | `bcryptjs` con costo 12 | JavaScript puro, se instala en Windows sin compilar | `bcrypt` nativo, Argon2 (R-04) |
| T-05 | 13/09 | Prisma 7 con adaptador `pg`, nombres en español y `@map` a snake_case | Guía oficial de Prisma 7; mismo vocabulario en código y base | Drizzle, SQL a mano (R-05) |
| T-06 | 13/09 | Unicidad sin mayúsculas ni espacios con columnas `*_normalizado` únicas | Regla legible en TypeScript y garantizada por la base | `citext`, índices sobre expresiones (R-06) |
| T-07 | 13/09 | Índices únicos parciales en el esquema y restricciones CHECK en una migración SQL comentada | La base garantiza la integridad (principio II) | Validar solo en servicios, triggers (R-07) |
| T-08 | 13/09 | Tailwind CSS y componentes propios mínimos | Todo el código de interfaz es del proyecto | shadcn/ui, Material UI (R-08) |
| T-09 | 13/09 | Un esquema Zod por formulario, usado en cliente y servidor, con `useActionState` | Principio VI; patrón oficial de Next.js | React Hook Form (R-09) |
| T-10 | 13/09 | `ErrorDeNegocio` para errores esperables; mensaje genérico para el resto | Separa "no permitido" de "falló el sistema" | Códigos de error por módulo (R-10) |
| T-11 | 13/09 | Única función `registrarMovimiento()` con `SELECT … FOR UPDATE` | Principio III: stock nunca negativo, explicable en una frase | `SERIALIZABLE` con reintentos (R-11) |
| T-12 | 13/09 | Fechas de documento como `date`; "hoy" en `America/La_Paz` | Evita que un registro nocturno quede con la fecha siguiente | Todo en UTC (R-12) |
| T-13 | 13/09 | Pruebas de integración contra PostgreSQL real en `almacen_oruro_test` | Demuestran también restricciones, transacciones y bloqueos | Simular Prisma (R-13) |
| T-14 | 13/09 | Docker Compose, `.env.example` y semilla idempotente con `admin` | Levantar en local con un comando (constitución) | Instalación manual de PostgreSQL (R-14) |
| T-15 | 13/09 | Cookie `Secure` configurable, falsa por defecto; la cookie dura 24 h y la vigencia de 8 h la decide el servidor | Uso por http en red local; poder detectar y registrar la expiración | Cookie `Secure` fija, cookie de 8 h (R-03, R-15) |

---

## Implementación

Decisiones tomadas durante la implementación que no estaban en el plan.

| # | Fecha | Decisión | Fundamento |
|---|---|---|---|
| I-01 | 13/09 | `.npmrc` con `legacy-peer-deps=true` | npm 10.9 se detiene con "Cannot read properties of null (reading 'edgesOut')" al resolver las dependencias opcionales de Vite que trae Vitest. Las dependencias de pares necesarias (React, TypeScript, ESLint) ya están declaradas en `package.json` |
| I-02 | 13/09 | Los índices únicos parciales quedan en `schema.prisma` | La vista previa `partialIndexes` de Prisma 7.10 los generó correctamente en la migración inicial; no hizo falta moverlos a SQL |
| I-04 | 13/09 | Un único hook `useValidacion` para todos los formularios, que llama a la Server Action desde `onSubmit` | React 19 vacía el formulario después de cada envío por `<form action>`: si el servidor rechazaba los datos, había que volver a escribirlos. Además, al salir de un campo solo se muestra el error de ese campo |
| I-03 | 13/09 | Vulnerabilidades de `npm audit` aceptadas | Las 4 alertas están en dependencias de desarrollo de la CLI de Prisma (`deepmerge-ts`, `mysql2`); las dependencias de producción tienen 0 vulnerabilidades |
