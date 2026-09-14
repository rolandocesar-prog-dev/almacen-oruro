# Investigación técnica · F-001 Acceso y personal (y arquitectura del sistema)

**Fecha**: 2026-09-13 · **Plan**: [plan.md](plan.md)

Este documento resuelve las decisiones técnicas del primer plan. Como F-001 fija la arquitectura, casi
todas las decisiones valen para F-002 a F-007. Cada una sigue el formato **Decisión / Fundamento /
Alternativas descartadas**, y el criterio que desempata es siempre el principio I de la constitución:
**que lo pueda explicar alguien que no escribió el código**.

Las versiones se verificaron en el registro de npm el 13/09/2026.

---

## R-01 · Versiones del stack

**Decisión**: fijar versiones exactas y estables.

| Paquete | Versión | Nota |
|---|---|---|
| Node.js | 22 LTS (22.23.2 instalado) | Exigido por la constitución |
| next | 16.3.5 | App Router; `proxy.ts` reemplaza a `middleware.ts` |
| react, react-dom | 19.3.0 | |
| typescript | 5.9.3 | **No** 7.0 (ver alternativas) |
| prisma, @prisma/client, @prisma/adapter-pg | 7.10.0 | **No** 8.0.0-rc (ver alternativas) |
| pg | última 8.x | Controlador que usa el adaptador de Prisma |
| zod | 4.6.5 | |
| vitest | 4.1.11 | **No** 5.0.0 (ver alternativas) |
| bcryptjs | 3.0.3 | Ver R-04 |
| tailwindcss | 4.3.3 | Ver R-08 |
| tsx | 4.23.x | Ejecuta la semilla y el generador en TypeScript |
| dotenv | 17.x | Lo requiere `prisma.config.ts` |
| PostgreSQL | 16 (imagen `postgres:16-alpine`) | Exigido por la constitución |

**Fundamento**: con 8 días de plazo no hay margen para depurar incompatibilidades de versiones recién
publicadas. Versiones exactas en `package.json` hacen que la instalación de Raymond sea idéntica a la
de desarrollo.

**Alternativas descartadas**:
- *Prisma 8.0.0-rc.14*: el registro la marca como `latest`, pero es una versión candidata. Prisma 7.10.0
  es la última estable y su documentación sigue vigente.
- *TypeScript 7.0.2*: es la reescritura nativa, publicada hace poco; el ecosistema (Next.js, Prisma,
  ESLint) todavía se prueba sobre 5.x. Se usa la última 5.9.
- *Vitest 5.0.0*: recién publicada; la 4.1 es la línea estable anterior y cubre todo lo necesario.

---

## R-02 · Estructura del proyecto

**Decisión**: una sola aplicación Next.js en la raíz del repositorio, junto a `docs/` y `specs/`.
Capas: páginas y Server Actions en `src/app/`, reglas de negocio en `src/servicios/` (un archivo por
módulo), esquemas Zod compartidos en `src/esquemas/`, utilidades en `src/lib/`.

**Fundamento**: la constitución exige un solo repositorio y un solo proyecto, lógica en
`src/servicios/` y ninguna regla en la interfaz. El flujo se explica en una línea:
**página → Server Action → servicio → Prisma → PostgreSQL**.

**Alternativas descartadas**: monorepo con backend separado (prohibido por la constitución);
repositorios genéricos o capa de casos de uso (principio I).

---

## R-03 · Manejo de sesión

**Decisión**: **sesiones en base de datos implementadas sin librería**, con el módulo `node:crypto`,
siguiendo la guía de autenticación de Next.js 16 y *The Copenhagen Book*:

1. Al ingresar se genera un token aleatorio de 32 bytes (`crypto.randomBytes`) y se envía al navegador
   en una cookie `sesion` con `HttpOnly`, `SameSite=Lax` y `Path=/`, que dura **24 horas**. La
   vigencia de 8 horas la decide siempre el servidor con `inicio` de la tabla: si la cookie venciera
   a las 8 h, el navegador la borraría y el servidor no podría distinguir "sesión expirada" de
   "nunca ingresó", así que no se mostraría el aviso ni se registraría la expiración.
2. En la tabla `sesion` se guarda **solo el hash SHA-256 del token** (`token_hash`), nunca el token.
3. En cada página y cada Server Action (salvo `salir()`), la función `requerirSesion()` busca la sesión por el hash y
   verifica: que exista, que no tenga `fin`, que `inicio + 8 h` no haya pasado y que el usuario siga
   activo. Si expiró, la cierra con motivo `EXPIRADA` antes de redirigir. Las sesiones que nadie
   vuelve a usar se cierran con `cerrarSesionesVencidas()` cada vez que alguien ingresa y al
   consultar el historial.
4. Cerrar sesión, desactivar un usuario o restablecer su contraseña llenan `fin` y `motivo_cierre`:
   la sesión deja de valer de inmediato en todas las computadoras.
5. `proxy.ts` solo hace una comprobación optimista (¿existe la cookie?) para redirigir rápido; la
   comprobación que vale es la de `requerirSesion()`, junto a los datos.

Las utilidades del token (generarlo y calcular su hash) están en `src/lib/token-sesion.ts`, sin
dependencias de Next.js, y las de la cookie y `requerirSesion()` en `src/lib/sesion.ts`. Así los
servicios se pueden probar con Vitest y no se forma un ciclo de imports entre `lib` y `servicios`.

**Fundamento**:
- La especificación exige cosas que solo una sesión en base de datos resuelve: bitácora con inicio,
  fin y motivo (FR-005 a FR-009), cierre inmediato al desactivar o restablecer (FR-008) y varias
  sesiones simultáneas (aclaración 3).
- Son unas 80 líneas propias, legibles de principio a fin: token aleatorio, hash, búsqueda, cuatro
  condiciones. No hay nada oculto que explicar.
- Guardar el hash y no el token hace que, aunque alguien lea la base, no pueda usar una sesión ajena.

**Alternativas descartadas**:
- *Auth.js (NextAuth v5)*: su proveedor de credenciales está pensado como caso secundario, usa JWT por
  defecto (no permite cerrar sesiones al instante sin configurar un adaptador) y agrega callbacks,
  adaptadores y configuración que habría que explicar sin haberlos escrito.
- *iron-session* o *jose* (sesión sin estado en cookie cifrada): no permiten cerrar una sesión desde el
  servidor ni llevar la bitácora sin agregar igual una tabla; se tendrían dos mecanismos.
- *Better Auth, Clerk y similares*: servicios o librerías completas con registro, correo y roles que el
  proyecto no usa; Clerk además depende de un servicio externo.

---

## R-04 · Hash de contraseñas

**Decisión**: `bcryptjs` 3.0.3 con factor de costo **12**.

**Fundamento**: bcrypt lo exige la constitución (principio VII). `bcryptjs` está escrito en
JavaScript puro: se instala igual en Windows, Linux y Docker sin compilar nada, lo que evita el
problema más común al instalar en la computadora de otra persona. Con costo 12 un ingreso tarda
cerca de medio segundo: aceptable para pocos usuarios (SC-001 pide menos de 30 s) y por encima del
mínimo de 10 que recomienda OWASP.

**Alternativas descartadas**: `bcrypt` nativo (requiere compilación y herramientas de C++ en
Windows); Argon2 (mejor algoritmo, pero la constitución fija bcrypt y también es nativo).

---

## R-05 · Acceso a datos con Prisma 7

**Decisión**:
- `schema.prisma` con `generator client { provider = "prisma-client", output = "../src/generado/prisma", previewFeatures = ["partialIndexes"] }`.
- `prisma.config.ts` con la URL de la base y la semilla (`tsx prisma/semilla.ts`).
- Un único cliente en `src/lib/prisma.ts` con el adaptador `@prisma/adapter-pg`, reutilizado entre
  recargas en desarrollo.
- Modelos en PascalCase singular y en español (`Usuario`, `MovimientoInventario`); campos en
  camelCase (`stockActual`); tablas y columnas en `snake_case` con `@@map` y `@map` (principio X).
- La carpeta del cliente generado (`src/generado/`) no se versiona.

**Fundamento**: es la configuración de la guía oficial de Prisma 7 para Next.js. Nombres en español en
el código y en la base, sin traducciones intermedias.

**Alternativas descartadas**: Drizzle o Kysely (la constitución fija Prisma); SQL escrito a mano
(principio VII: acceso a datos solo por Prisma).

---

## R-06 · Unicidad sin distinguir mayúsculas ni espacios (RN-10)

**Decisión**: **columnas normalizadas** que calcula el servicio y que llevan la restricción `UNIQUE`.

| Tabla | Campo que ve el usuario | Campo único |
|---|---|---|
| usuario | — | `nombre_usuario` (se guarda ya en minúsculas y sin espacios) |
| categoria, unidad_medida, centro_salud | `nombre` | `nombre_normalizado` |
| producto | `nombre` | `nombre_normalizado` |
| producto | — | `codigo` (se guarda ya en mayúsculas) |
| proveedor | — | `nit` (solo dígitos) |
| representante | — | `ci` (se guarda ya en mayúsculas) |

La normalización es una sola función, `normalizarTexto()` en `src/lib/texto.ts`: quitar espacios de
los extremos, reducir espacios internos a uno y pasar a minúsculas. Las tildes se conservan.

**Fundamento**: la regla de negocio queda en TypeScript, que se lee y se prueba, y la base garantiza
la unicidad con un índice común. Ante dos guardados simultáneos con el mismo valor, gana la base.

**Alternativas descartadas**: tipo `citext` de PostgreSQL (no reduce espacios internos); índice sobre
una expresión `lower(...)` (Prisma no lo representa en el esquema y habría que explicar SQL escondido
en una migración).

---

## R-07 · Restricciones que Prisma no expresa

**Decisión**:
- **Índices únicos parciales** (factura única por proveedor entre compras REGISTRADAS, RN-26; vale único
  entre distribuciones REGISTRADAS, RN-31): con la función en vista previa `partialIndexes` de Prisma 7,
  que los escribe en el propio `schema.prisma`.
- **Restricciones `CHECK`** (stock ≥ 0, cantidades > 0, entregado ≤ solicitado, motivo obligatorio si
  está anulado, etc.): Prisma no las soporta; se agregan en una migración SQL propia, creada con
  `prisma migrate dev --create-only`, con un comentario por restricción que cite la regla RN-xx.

**Fundamento**: la constitución (principio II) pide que la base garantice la integridad con claves
foráneas, `UNIQUE`, `CHECK` y transacciones. La migración de restricciones es un archivo corto y
comentado que se puede leer como una lista de reglas.

**Alternativas descartadas**: validar solo en el servicio (una segunda línea de defensa en la base es
exigencia de la constitución); triggers (prohibidos para lógica de negocio).

---

## R-08 · Interfaz

**Decisión**: Server Components para las páginas; Client Components solo para formularios. Estilos con
**Tailwind CSS 4** y un puñado de componentes propios en `src/componentes/ui/` (Boton, Campo,
Tabla, Aviso, Filtros). Sin librería de componentes.

**Fundamento**: componentes simples y accesibles (etiquetas `<label>`, errores asociados al campo con
`aria-describedby`), adaptables a pantallas chicas con utilidades de Tailwind, y todo el código de la
interfaz es del proyecto.

**Alternativas descartadas**: shadcn/ui (copia al proyecto cientos de líneas basadas en Radix que nadie
del equipo escribió); Material UI o similares (dependencia grande, estilo difícil de ajustar).

---

## R-09 · Formularios y validación en dos lugares (principio VI)

**Decisión**:
- Cada formulario tiene un esquema Zod en `src/esquemas/` que importan **el formulario y la Server
  Action**.
- En el cliente, el formulario ejecuta `esquema.safeParse()` al enviar y al salir de un campo, y muestra
  los errores sin llamar al servidor.
- En el servidor, la Server Action vuelve a validar con el mismo esquema, llama al servicio y devuelve
  un `ResultadoAccion`: `{ ok: true, datos }` o `{ ok: false, mensaje, errores }`.
- El formulario usa `useActionState` de React para mostrar el resultado.
- Los mensajes de Zod se escriben en español dentro de cada esquema.

**Fundamento**: es el patrón de la guía oficial de Next.js, sin librerías de formularios. Un solo
esquema garantiza que cliente y servidor no se contradigan.

**Alternativas descartadas**: React Hook Form (otra API más que explicar); validar solo en el servidor
(lo prohíbe el principio VI).

---

## R-10 · Errores de negocio

**Decisión**: una clase `ErrorDeNegocio` en `src/lib/errores.ts`. Los servicios la lanzan con un mensaje
en español y, si corresponde, el campo afectado. Las Server Actions la capturan y la convierten en
`{ ok: false, mensaje, errores }`. Cualquier otro error se registra en el log del servidor (sin datos
sensibles) y se muestra como "Ocurrió un error inesperado. Intenta nuevamente".

**Fundamento**: separa "el usuario hizo algo no permitido" (mensaje claro) de "falló algo del
sistema" (mensaje genérico), con una sola clase.

---

## R-11 · Transacciones y bloqueo de stock (arquitectura para F-003 y F-005)

**Decisión**:
- Toda operación que cambia más de una fila usa una transacción interactiva de Prisma
  (`prisma.$transaction(async (tx) => { ... })`).
- La **única** función que modifica `stock_actual` es `registrarMovimiento(tx, datos)` en
  `src/servicios/inventario.ts`. Dentro de la transacción: bloquea la fila del producto con
  `SELECT ... FOR UPDATE`, lee el stock, verifica que no quede negativo, inserta el movimiento con su
  saldo y actualiza el producto.
- Cuando un documento toca varios productos, se bloquean en orden de `id` para evitar interbloqueos.
- El orden del kardex de un producto es el orden de `id` de sus movimientos, que coincide con el orden
  de registro gracias al bloqueo.

**Fundamento**: principio III de la constitución. "Bloqueo la fila, leo, verifico, escribo" se explica
en una frase y se prueba con dos transacciones simultáneas.

**Alternativas descartadas**: `UPDATE ... WHERE stock_actual >= x` sin bloqueo explícito (correcto,
pero menos evidente de explicar); nivel de aislamiento `SERIALIZABLE` con reintentos (más difícil de
explicar y probar).

---

## R-12 · Fechas y zona horaria

**Decisión**: las fechas de documento se guardan como `date` (sin hora); los momentos, como
`timestamptz`. "Hoy", "mes en curso" y "fecha no futura" se calculan en la zona `America/La_Paz`
(UTC−4, sin horario de verano) con funciones de `src/lib/fechas.ts`.

**Fundamento**: evita que una compra registrada a las 21:00 en Oruro quede con la fecha del día
siguiente por usar UTC.

---

## R-13 · Pruebas (principio IX)

**Decisión**:
- **Vitest** con dos grupos: `tests/unitarios/` (funciones puras: esquemas Zod, normalización, cálculo de
  estados, pronóstico) y `tests/integracion/` (servicios contra PostgreSQL real).
- La integración usa una base aparte, `almacen_oruro_test`, en el mismo contenedor de Docker. Antes de
  la suite se aplican las migraciones; antes de cada archivo se vacían las tablas.
- No se simulan (mock) Prisma ni la base: las pruebas verifican también las restricciones `UNIQUE` y
  `CHECK`, las transacciones y los bloqueos.

**Fundamento**: las reglas críticas (duplicados, stock no negativo, transacciones) viven en parte en la
base; una prueba con la base simulada no las demostraría.

---

## R-14 · Entorno local y datos iniciales

**Decisión**:
- `docker-compose.yml` con un servicio `postgres:16-alpine`, volumen persistente y un script de
  inicio que crea también la base de pruebas.
- `.env.example` versionado con `DATABASE_URL`, `DATABASE_URL_TEST`, `TZ=America/La_Paz`,
  `CONTRASENA_INICIAL` y `COOKIE_SEGURA`; el `.env` real no se versiona (principio VII).
- La semilla (`prisma/semilla.ts`) crea la fila de `configuracion` y el usuario inicial `admin` con la
  contraseña de `CONTRASENA_INICIAL` y `debe_cambiar_contrasena = true` (RN-05). Es idempotente.

**Fundamento**: la constitución exige levantar el sistema en local con PostgreSQL en Docker y un comando
de semilla (pendiente Q-03).

---

## R-15 · Cookie segura en instalación local

**Decisión**: la opción `Secure` de la cookie se activa con `COOKIE_SEGURA=true`. Por defecto es `false`,
porque el sistema se usa por `http://` en red local.

**Fundamento**: con `Secure`, un navegador que entra por la IP de la red local (no `localhost`) sin
HTTPS descarta la cookie y nadie podría ingresar. La protección contra CSRF la dan igual
`SameSite=Lax` y la verificación de origen que Next.js aplica a las Server Actions.

---

## R-16 · Decisiones postergadas a otros planes

| Tema | Plan |
|---|---|
| Búsqueda sin distinguir tildes y paginación de listados | F-002 |
| Detalle del bloqueo en compras y anulaciones | F-003 |
| Vista de impresión y encabezados repetidos | F-006 |
| Librería del método Holt-Winters (o implementación propia), gráfico, servicio y modelo de lenguaje, generador | F-007 |

No quedan marcas **NEEDS CLARIFICATION** en el contexto técnico de este plan.
