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

## Catálogos (plan de F-002, 14/09/2026)

Detalle completo en [`specs/002-catalogos/research.md`](../specs/002-catalogos/research.md).

| # | Fecha | Decisión | Fundamento | Alternativas descartadas |
|---|---|---|---|---|
| C-01 | 14/09 | Búsqueda sin mayúsculas ni tildes filtrando en memoria con `coincideBusqueda` (`src/lib/texto.ts`) | Los catálogos tienen decenas de registros; la regla queda en una función pura con pruebas unitarias | Extensión `unaccent` con SQL crudo, columna de búsqueda normalizada, `mode: "insensitive"` (distingue tildes) |
| C-02 | 14/09 | Listados de catálogos sin paginar, con el total de registros | Con decenas de filas una tabla completa se lee y se busca más rápido (SC-006) | Paginar de 50 en 50, desplazamiento infinito |
| C-03 | 14/09 | Un archivo explícito por catálogo en esquemas, servicios y páginas, más utilidades comunes pequeñas | Cada regla especial (RN-13, RN-16, RN-17) queda en el archivo de su catálogo | CRUD genérico parametrizado, una página con pestañas |
| C-04 | 14/09 | Duplicado de un registro inactivo: mensaje con enlace "Ver y reactivar" a su ficha (campo `enlace` en `ErrorDeNegocio`) | No reactiva nada por sorpresa y no requiere una acción nueva | Botón "Reactivar" en el formulario de alta, solo texto |
| C-05 | 14/09 | Nombres únicos con `nombre_normalizado`; código y CI en mayúsculas; el servicio verifica y la restricción UNIQUE decide en simultáneo (P2002 → mismo mensaje) | Aplica T-06 a cada catálogo | — |
| C-06 | 14/09 | RN-13, RN-16 y RN-17 en los servicios de catálogo, con conteos en transacción | Las reglas pertenecen a la baja del catálogo; se prueban insertando pedidos y movimientos de prueba | Esperar a F-003–F-005, bloquear filas |
| C-07 | 14/09 | `listar…ParaSelector(idActual?)`: solo activos, más el actual marcado si está inactivo | Una sola función decide qué se puede elegir (RN-14, FR-003) | Repetir el filtro en cada pantalla |
| C-08 | 14/09 | Precio referencial como texto con coma o punto, guardado con `Prisma.Decimal` y mostrado "Bs 12,50" | Sin redondeos de coma flotante; en Bolivia se escribe con coma | Campo numérico del navegador |
| C-09 | 14/09 | La ficha del producto advierte el stock al confirmar la baja | Desactivar con stock está permitido, pero conviene saberlo | Bloquear la baja con stock |
| C-10 | 14/09 | Menú con una segunda fila "Catálogos" que se ajusta en pantallas chicas | Sin JavaScript extra y sin desplazamiento horizontal | Menú desplegable, barra lateral |
| C-11 | 14/09 | Ayudantes de prueba `tests/ayudantes/catalogos.ts`, incluidos pedidos con saldo y movimientos mínimos | Las reglas que dependen de otras funcionalidades se prueban ya contra la base real | Depender de los servicios de F-003 y F-004 |

---

## Implementación

Decisiones tomadas durante la implementación que no estaban en el plan.

| # | Fecha | Decisión | Fundamento |
|---|---|---|---|
| I-01 | 13/09 | `.npmrc` con `legacy-peer-deps=true` | npm 10.9 se detiene con "Cannot read properties of null (reading 'edgesOut')" al resolver las dependencias opcionales de Vite que trae Vitest. Las dependencias de pares necesarias (React, TypeScript, ESLint) ya están declaradas en `package.json` |
| I-02 | 13/09 | Los índices únicos parciales quedan en `schema.prisma` | La vista previa `partialIndexes` de Prisma 7.10 los generó correctamente en la migración inicial; no hizo falta moverlos a SQL |
| I-04 | 13/09 | Un único hook `useValidacion` para todos los formularios, que llama a la Server Action desde `onSubmit` | React 19 vacía el formulario después de cada envío por `<form action>`: si el servidor rechazaba los datos, había que volver a escribirlos. Además, al salir de un campo solo se muestra el error de ese campo |
| I-05 | 13/09 | La conexión de Prisma fuerza `TimeZone=UTC` (`src/lib/prisma.ts`) | El adaptador `pg` envía las fechas en UTC sin indicar la zona y PostgreSQL las interpretaba en la zona del servidor (America/La_Paz): quedaban 4 horas corridas y la expiración calculada en SQL fallaba. Lo detectó una prueba de integración; hay una prueba de regresión en `tests/integracion/zona-horaria.test.ts` |
| I-06 | 14/09 | Contraseñas de hasta 72 caracteres | bcrypt ignora lo que pasa de 72 bytes: dos contraseñas largas que solo difieran al final valdrían lo mismo. El límite lo avisa el formulario |
| I-07 | 14/09 | Cada listado tiene su propio componente de filtros de cliente (`filtros-personal.tsx`, `filtros-sesiones.tsx`) | Un esquema Zod no se puede pasar desde una página del servidor a un componente de cliente; el componente importa su esquema y usa el genérico `Filtros` |
| I-08 | 14/09 | La verificación visual de páginas internas se hizo con una sesión de prueba creada en la base, sin escribir contraseñas en el navegador | Los pasos del recorrido manual que requieren contraseñas quedan para la revisión con Raymond; sus reglas están cubiertas por pruebas de integración |
| I-03 | 13/09 | Vulnerabilidades de `npm audit` aceptadas | Las 4 alertas están en dependencias de desarrollo de la CLI de Prisma (`deepmerge-ts`, `mysql2`); las dependencias de producción tienen 0 vulnerabilidades |
| I-09 | 14/09 | Esquemas comunes en `src/esquemas/comunes.ts` (textos, teléfono, enteros, ids, filtro de estado, aviso de ficha) usados también por personal | Mismas reglas y mensajes en todos los formularios; las 77 pruebas de F-001 siguieron en verde tras la extracción |
| I-10 | 14/09 | Un campo vacío de número o selector se convierte en "sin valor" antes de `z.coerce.number` (`vacioComoAusente`) | `Number("")` es 0: sin esto, un stock mínimo o un selector vacíos pasaban como válidos |
| I-11 | 14/09 | Al editar un producto con movimientos, el selector de unidad va deshabilitado y el valor viaja en un campo oculto | Un `<select>` deshabilitado no se envía; el servidor vuelve a verificar RN-16 |
| I-12 | 14/09 | Etiqueta "(inactiva)" o "(inactivo)" según el género del catálogo en selectores y fichas | Se lee natural ("Desinfectantes (inactiva)"); la regla FR-003 no cambia |
| I-13 | 14/09 | Componentes compartidos de catálogos: `CambioDeEstado` (generalizado desde personal), `InsigniaEstado`, `Selector`, `Dato`, `MensajeVacio`, `EncabezadoListado` | Evita repetir el mismo marcado en seis catálogos sin esconder la lógica de cada uno |
| I-14 | 14/09 | La búsqueda y el filtro por categoría se implementaron junto con cada catálogo (fases 3 a 6) y la fase de la Historia 5 agregó su prueba | Escribir cada listado una sola vez; el resultado es el mismo que el orden de tareas previsto |
| I-15 | 14/09 | El recorrido de F-002 se verificó con un servidor de desarrollo contra la base de pruebas, datos cargados por esquemas y servicios, y una sesión de prueba creada en la base | Mismo criterio que I-08: sin escribir contraseñas en el navegador y sin dejar datos en la base de desarrollo |
