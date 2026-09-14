---
description: "Lista de tareas de implementación de F-001 · Acceso y personal"
---

# Tareas: F-001 · Acceso y personal

**Entrada**: documentos de diseño de `specs/001-acceso-personal/`

**Prerrequisitos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Pruebas**: se incluyen. La constitución (principio IX) exige pruebas automatizadas de las reglas
críticas, y [quickstart.md §3](quickstart.md#3-pruebas-automatizadas) fija el mínimo para F-001. Las
pruebas de integración usan PostgreSQL real (research R-13): **Docker Desktop debe estar abierto**.

**Organización**: las tareas se agrupan por historia de usuario de la especificación, para poder
implementar y probar cada una por separado.

**Alcance especial**: la fase 2 crea el **esquema completo de las 18 tablas**, no solo las de F-001
(plan, "Alcance especial").

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[US#]**: historia de usuario de [spec.md](spec.md) a la que pertenece
- Todas las rutas son relativas a la raíz del repositorio

| Etiqueta | Historia de spec.md | Prioridad |
|---|---|---|
| US1 | Historia 1 · Ingresar al sistema | P1 |
| US2 | Historia 2 · Cerrar sesión y expiración | P1 |
| US3 | Historia 3 · Registrar personal | P1 |
| US4 | Historia 4 · Modificar, desactivar y reactivar personal | P1 |
| US5 | Historia 5 · Cambiar la propia contraseña y restablecer la de otro | P2 |
| US6 | Historia 6 · Consultar el historial de sesiones | P3 |

---

## Fase 1: Preparación (infraestructura compartida)

**Propósito**: crear el proyecto Next.js con las versiones exactas y el entorno local.

- [X] T001 Crear `package.json` a mano (sin `create-next-app`, porque la carpeta ya tiene `docs/` y `specs/`) con nombre `almacen-oruro`, `"private": true`, `"type": "module"`, `"engines": { "node": ">=22 <23" }` y versiones **exactas** de research R-01: dependencias `next@16.3.5`, `react@19.3.0`, `react-dom@19.3.0`, `@prisma/client@7.10.0`, `@prisma/adapter-pg@7.10.0`, `pg` (última 8.x), `zod@4.6.5`, `bcryptjs@3.0.3`, `server-only`; desarrollo `prisma@7.10.0`, `typescript@5.9.3`, `@types/node` (22.x), `@types/react@19.3.0`, `@types/react-dom`, `@types/pg`, `tailwindcss@4.3.3`, `@tailwindcss/postcss`, `vitest@4.1.11`, `tsx`, `dotenv`, `eslint`, `eslint-config-next@16.3.5`; scripts `dev`, `build`, `start`, `lint` (`eslint .`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `test:unitarios`, `test:integracion`, `db:migrar` (`prisma migrate deploy`), `db:semilla` (`prisma db seed`), `postinstall` (`prisma generate`); luego ejecutar `npm install` y confirmar que `package-lock.json` queda generado
- [X] T002 [P] Crear `tsconfig.json` con `"strict": true`, `"noUncheckedIndexedAccess": true`, `"moduleResolution": "bundler"`, `"jsx": "preserve"`, plugin `next`, e `"paths": { "@/*": ["./src/*"] }`; y `next.config.ts` mínimo
- [X] T003 [P] Crear `eslint.config.mjs` con la configuración plana de `eslint-config-next` (core-web-vitals y typescript), ignorando `src/generado/**` y `.next/**`
- [X] T004 [P] Actualizar `.gitignore` para agregar `src/generado/`, `.next/`, `next-env.d.ts` y `*.tsbuildinfo` (sin quitar las entradas existentes), y crear `.gitattributes` con `* text=auto eol=lf` (plan, "Riesgos")
- [X] T005 [P] Crear `docker-compose.yml` con un servicio `postgres` (`postgres:16-alpine`), usuario y contraseña tomados de variables con valores por defecto de desarrollo, base `almacen_oruro`, puerto `5432`, volumen con nombre `datos-postgres`, `healthcheck` con `pg_isready`, y montaje de `docker/postgres/crear-base-pruebas.sql` en `/docker-entrypoint-initdb.d/`; crear ese archivo SQL con `CREATE DATABASE almacen_oruro_test;`
- [X] T006 [P] Crear `.env.example` con comentarios en español para `DATABASE_URL` (base `almacen_oruro`), `DATABASE_URL_TEST` (base `almacen_oruro_test`), `TZ=America/La_Paz`, `CONTRASENA_INICIAL` (al menos 8 caracteres), `COOKIE_SEGURA=false` y `BCRYPT_COSTO=12` (research R-04, R-14, R-15); copiarlo a `.env` local (no se versiona)
- [X] T007 [P] Crear `prisma.config.ts` según research R-05: `import "dotenv/config"`, `defineConfig` con `schema: "prisma/schema.prisma"`, `migrations: { path: "prisma/migrations", seed: "tsx prisma/semilla.ts" }` y `datasource: { url: env("DATABASE_URL") }`
- [X] T008 [P] Crear `postcss.config.mjs` con `@tailwindcss/postcss`, `src/app/globals.css` con `@import "tailwindcss";` y colores base accesibles, y `src/app/layout.tsx` con `<html lang="es">`, título "Almacén Regional Oruro" y los estilos globales
- [X] T009 [P] Crear `vitest.config.ts` con `import "dotenv/config"` al inicio y dos proyectos: `unitarios` (`tests/unitarios/**/*.test.ts`, entorno node) e `integracion` (`tests/integracion/**/*.test.ts`, entorno node, `fileParallelism: false`, `test.env` con `DATABASE_URL: process.env.DATABASE_URL_TEST` y `BCRYPT_COSTO: "4"` —si falta `DATABASE_URL_TEST`, lanzar un error claro—, `globalSetup: tests/ayudantes/preparar-base-de-pruebas.ts`); alias `@` → `src`; y `resolve.alias` que mapee `server-only` a `tests/ayudantes/modulo-vacio.ts` (crear ese archivo vacío), para que las pruebas no fallen si algún servicio lo importa de forma indirecta
- [X] T010 [P] Crear `docs/decisiones.md` con encabezado, formato de registro (fecha, decisión, fundamento, alternativas) y una entrada por cada decisión R-01 a R-15 de `specs/001-acceso-personal/research.md` resumida en 2 o 3 líneas con enlace; y `docs/trabajo-futuro.md` con los "Fuera de alcance" de F-001 (roles, recuperación por correo, registro y bloqueo de intentos fallidos, doble factor, cierre por inactividad) — constitución, principios I y XI

**Punto de control**: `npm run typecheck` y `npm run lint` terminan sin errores; `docker compose up -d` deja el contenedor *healthy*.

---

## Fase 2: Fundamentos (bloquea todas las historias)

**Propósito**: base de datos completa, utilidades comunes, semilla e infraestructura de pruebas.

**⚠️ CRÍTICO**: ninguna historia empieza antes de terminar esta fase.

### Base de datos

- [X] T011 Crear `prisma/schema.prisma` copiando **exactamente** el esquema de `specs/001-acceso-personal/data-model.md` §3: `generator client { provider = "prisma-client", output = "../src/generado/prisma", previewFeatures = ["partialIndexes"] }`, `datasource db { provider = "postgresql" }`, los 5 enums (`MotivoCierreSesion`, `EstadoDocumento`, `EstadoPedido`, `TipoMovimiento`, `TipoInforme`) y los 18 modelos con sus `@map`, `@@map`, tipos `@db.*`, relaciones con nombre, índices, `@@unique([proveedorId, nroFactura], where: raw("estado = 'REGISTRADA'"), map: "compra_factura_vigente_unica")` y `@@unique([nroVale], where: raw("estado = 'REGISTRADA'"), map: "distribucion_vale_vigente_unico")`; ejecutar `npx prisma validate` y `npx prisma generate`
- [X] T012 Generar la migración inicial con `npx prisma migrate dev --name esquema_inicial` en `prisma/migrations/`; verificar en el SQL generado que existen las 18 tablas y los dos índices únicos parciales con su cláusula `WHERE` (si Prisma no los genera, aplicar la mitigación del plan: quitarlos del esquema y crearlos en T013)
- [X] T013 Crear la migración de restricciones con `npx prisma migrate dev --create-only --name restricciones_de_negocio` y escribir en `prisma/migrations/<fecha>_restricciones_de_negocio/migration.sql` las **27** restricciones `CHECK` de `data-model.md` §4, cada una con `ALTER TABLE … ADD CONSTRAINT <nombre> CHECK (<condición>)` usando el nombre y la condición exactos de la tabla, precedida de un comentario `-- RN-xx / FR-xx: <explicación en una línea>`; en `movimiento_origen_coherente` exigir `compra_id IS NOT NULL AND distribucion_id IS NULL` para `ENTRADA_COMPRA` y `ANULACION_COMPRA`, y lo inverso para `SALIDA_DISTRIBUCION` y `ANULACION_DISTRIBUCION`; en `movimiento_signo_coherente` exigir `cantidad > 0` para `ENTRADA_COMPRA` y `ANULACION_DISTRIBUCION` y `cantidad < 0` para las otras dos; aplicar con `npx prisma migrate dev`
- [X] T014 Crear `src/lib/prisma.ts` según research R-05: importar `PrismaClient` desde `@/generado/prisma/client` y `PrismaPg` desde `@prisma/adapter-pg`, crear un único cliente con `new PrismaPg({ connectionString: process.env.DATABASE_URL })`, reutilizarlo en desarrollo mediante `globalThis` y exportar `prisma`. **No** usar `server-only` aquí: este archivo también lo importan la semilla (`tsx`) y las pruebas (Vitest), donde ese paquete lanza un error; solo lo importan archivos de servidor

### Utilidades comunes

- [X] T015 [P] Crear `src/lib/errores.ts` con la clase `ErrorDeNegocio extends Error` (propiedades `mensaje` en español y `campo?: string`), el tipo `ResultadoAccion<T = void>` exactamente como en `contracts/acciones-f001.md` ("Convenciones comunes") y la función `aResultadoDeError(error: unknown): ResultadoAccion<never>` que convierte `ErrorDeNegocio` en `{ ok: false, mensaje, errores: { [campo]: [mensaje] } }` y cualquier otro error en `{ ok: false, mensaje: "Ocurrió un error inesperado. Intenta nuevamente" }`, registrando en consola solo el nombre y mensaje técnico del error (research R-10)
- [X] T016 [P] Crear `src/lib/texto.ts` con `normalizarTexto(valor: string): string` (recortar extremos, reducir espacios internos a uno, pasar a minúsculas, conservar tildes) y `recortarEspacios(valor: string): string` (recortar extremos y reducir espacios internos, conservando mayúsculas), con comentario del porqué (RN-10, research R-06)
- [X] T017 [P] Crear `src/lib/fechas.ts` con `ZONA_HORARIA = "America/La_Paz"`, `hoyEnLaPaz(): string` (formato `AAAA-MM-DD`), `inicioDelMesEnCurso(): string` y `sumarHoras(fecha: Date, horas: number): Date`, usando `Intl.DateTimeFormat` sin librerías (research R-12)
- [X] T018 [P] Crear `src/lib/contrasenas.ts` (sin `server-only`, por el mismo motivo que T014) con `calcularHashContrasena(contrasena)` y `compararContrasena(contrasena, hash)` usando `bcryptjs` y costo `Number(process.env.BCRYPT_COSTO ?? 12)`, y la constante `HASH_FICTICIO` (hash bcrypt de un texto fijo) para comparar cuando el usuario no existe (contracts, `ingresar`) — research R-04
- [X] T019 [P] Crear las utilidades de sesión de research R-03 en dos archivos, para que los servicios no dependan de Next.js ni se forme un ciclo de imports: `src/lib/token-sesion.ts` (funciones puras, sin `next/headers` ni `server-only`) con `DURACION_SESION_HORAS = 8`, `generarToken()` (32 bytes de `crypto.randomBytes` en base64url) y `calcularHashToken(token)` (SHA-256 en hexadecimal, 64 caracteres); y `src/lib/sesion.ts` (con `import "server-only"`) con `NOMBRE_COOKIE = "sesion"`, `DURACION_COOKIE_HORAS = 24`, `escribirCookieSesion(token)` (`httpOnly: true`, `sameSite: "lax"`, `path: "/"`, `secure: process.env.COOKIE_SEGURA === "true"`, `maxAge` de 24 h), `leerTokenDeCookie()` y `borrarCookieSesion()`, usando `cookies()` asíncrono de `next/headers`, con un comentario que explique que la cookie dura más que la sesión para que el servidor pueda detectar la expiración (ver T037)

### Datos iniciales e interfaz base

- [X] T020 Crear `prisma/semilla.ts` según `contracts/acciones-f001.md` ("Semilla"): crear con `upsert` la fila `configuracion` con `id: 1` y `modoDemostracion: false`, y el usuario `admin` solo si no existe (nombre "Administrador", apellido "Sistema", cargo "Encargado de almacén", `nombreUsuario: "admin"`, hash de `CONTRASENA_INICIAL` —fallar con mensaje claro si falta o tiene menos de 8 caracteres—, `debeCambiarContrasena: true`, `activo: true`); imprimir en español qué creó y qué ya existía; ejecutar `npx prisma db seed` dos veces y confirmar que no duplica (FR-023, RN-05)
- [X] T021 [P] Crear los componentes de `src/componentes/ui/`: `boton.tsx` (variantes principal, secundario, peligro; estado deshabilitado), `campo.tsx` (etiqueta `<label htmlFor>`, entrada, texto de ayuda y lista de errores enlazada con `aria-describedby` y `aria-invalid`), `aviso.tsx` (éxito, error, información, con `role="status"` o `role="alert"`), `tabla.tsx` (tabla con desplazamiento horizontal en pantallas chicas) y `filtros.tsx` (formulario GET con botón "Aplicar" y "Limpiar") — research R-08

### Infraestructura de pruebas

- [X] T022 Crear `tests/ayudantes/preparar-base-de-pruebas.ts` (global setup de Vitest: ejecutar `npx prisma migrate deploy` con `execSync`, pasando `env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST }`) y `tests/ayudantes/base-de-datos.ts` con `vaciarTablas()` (antes de vaciar, lanzar un error si `process.env.DATABASE_URL` no termina en `_test`, para no borrar nunca la base de desarrollo; luego `TRUNCATE … RESTART IDENTITY CASCADE` de las 18 tablas mediante `prisma.$executeRawUnsafe` con la lista fija de nombres) y `crearUsuarioDePrueba(datos?)` que inserta un usuario activo con contraseña conocida y devuelve `{ usuario, contrasena }` — research R-13
- [X] T023 [P] Crear `tests/unitarios/texto.test.ts` y `tests/unitarios/fechas.test.ts`: `normalizarTexto(" Lavandina  1 L ") === "lavandina 1 l"`, conservación de tildes, `recortarEspacios`, formato `AAAA-MM-DD` de `hoyEnLaPaz`, y que a las 23:30 del 31/08 en La Paz (03:30 UTC del 01/09) la fecha es `2026-08-31`
- [X] T024 [P] Crear `tests/integracion/restricciones-acceso.test.ts` que inserta directamente con Prisma datos inválidos y espera error de la base: `usuario.nombre_usuario` con mayúsculas o espacios (`usuario_nombre_usuario_formato`), `telefono` con letras (`usuario_telefono_formato`), dos usuarios con el mismo `nombre_usuario` (UNIQUE), `sesion` con `fin` sin `motivo_cierre` (`sesion_cierre_coherente`), `sesion` con `fin` anterior a `inicio` (`sesion_fin_posterior`) y una segunda fila de `configuracion` con `id: 2` (`configuracion_fila_unica`)

**Punto de control**: `npm test` pasa; `npx prisma studio` muestra las 18 tablas, la fila de `configuracion` y el usuario `admin`.

---

## Fase 3: Historia 1 · Ingresar al sistema (Prioridad: P1) 🎯 MVP

**Objetivo**: un usuario activo ingresa con usuario y contraseña; sin sesión no se ve ninguna página
interna; el mensaje de error nunca revela qué falló.

**Prueba independiente**: con un usuario de prueba activo, ingresar con credenciales correctas e
incorrectas y abrir una página interna sin sesión (quickstart, pasos 1 a 3 y 11).

**Nota de alcance**: el desvío obligatorio a `/cambiar-contrasena` se agrega en US5 (T058). Hasta
entonces, `admin` entra directo al inicio.

### Pruebas de la Historia 1

- [X] T025 [P] [US1] Crear `tests/unitarios/esquema-ingreso.test.ts`: `esquemaIngreso` acepta `{ nombreUsuario: " ADMIN ", contrasena: "x" }` y lo convierte en `nombreUsuario: "admin"`; rechaza usuario vacío o contraseña vacía con mensajes en español; no recorta la contraseña
- [X] T026 [P] [US1] Crear `tests/integracion/acceso-ingreso.test.ts` sobre `iniciarSesion()`: credenciales correctas devuelven token y crean una fila `sesion` con `inicio`, sin `fin` y con `token_hash` igual a `calcularHashToken(token)` (distinto del token); `JPerez` ingresa como `jperez`; contraseña incorrecta, usuario inexistente y usuario inactivo lanzan `ErrorDeNegocio` con el mensaje **idéntico** `"Usuario o contraseña incorrectos"` y no crean sesión; y sobre `validarSesion()`: token válido devuelve el usuario sin `contrasenaHash`; token desconocido devuelve `null`; dos ingresos del mismo usuario generan dos sesiones vigentes a la vez (FR-001 a FR-005, aclaración 3)

### Implementación de la Historia 1

- [X] T027 [P] [US1] Crear `src/esquemas/acceso.ts` con `esquemaIngreso` (Zod 4): `nombreUsuario` string que se recorta y pasa a minúsculas, mínimo 1 con mensaje "Escribe tu nombre de usuario"; `contrasena` string sin recortar, mínimo 1 con mensaje "Escribe tu contraseña"; exportar el tipo inferido
- [X] T028 [US1] Crear `src/servicios/acceso.ts` con `iniciarSesion(nombreUsuario, contrasena)`: buscar por `nombreUsuario` normalizado; si no existe, comparar contra `HASH_FICTICIO` y lanzar el error genérico; si la contraseña no coincide o `activo` es falso, lanzar `ErrorDeNegocio("Usuario o contraseña incorrectos")`; si todo es correcto, generar el token con las funciones de `@/lib/token-sesion`, crear `sesion` con `tokenHash` e `inicio` y devolver `{ token, debeCambiarContrasena }` — comentarios con el porqué de cada paso (FR-001 a FR-003, FR-005)
- [X] T029 [US1] Agregar a `src/servicios/acceso.ts` `validarSesion(token)`: calcular el hash, buscar la sesión con su usuario; devolver `null` si no existe o tiene `fin`; si el usuario está inactivo, cerrarla con `fin: ahora` y `motivoCierre: "DESACTIVACION"` y devolver `null`; si es vigente, devolver `{ sesionId, usuario: { id, nombre, apellido, nombreUsuario, debeCambiarContrasena } }` (la regla de expiración se agrega en T037)
- [X] T030 [US1] Agregar a `src/lib/sesion.ts` `requerirSesion()` envuelta en `cache()` de React: leer el token, llamar a `validarSesion`, redirigir a `/ingreso` con `redirect()` si no hay sesión vigente, y devolver la sesión (contracts, `requerirSesion`); y `obtenerSesionOpcional()` que devuelve la sesión o `null` sin redirigir (para la página de ingreso)
- [X] T031 [P] [US1] Crear `src/proxy.ts` (función `proxy` exportada por defecto y `config.matcher` que excluye `_next/static`, `_next/image` y `favicon.ico`): si la ruta no empieza con `/ingreso` y no existe la cookie `sesion`, redirigir a `/ingreso`; no consultar la base; comentario que explique que es solo una comprobación optimista (contracts/rutas.md, research R-03)
- [X] T032 [US1] Crear `src/app/ingreso/acciones.ts` (`"use server"`) con `ingresar(estadoPrevio, formData)`: validar con `esquemaIngreso`, llamar a `iniciarSesion`, escribir la cookie con `escribirCookieSesion(token)` y `redirect("/")`; ante error devolver `ResultadoAccion` con `aResultadoDeError` (contracts, `ingresar`)
- [X] T033 [US1] Crear `src/app/ingreso/formulario-ingreso.tsx` (`"use client"`) con `useActionState(ingresar)`, campos "Nombre de usuario" y "Contraseña" con el componente `Campo`, validación previa con `esquemaIngreso.safeParse` al enviar y al salir de cada campo, mensaje general con `Aviso` y botón deshabilitado mientras envía; y `src/app/ingreso/page.tsx` que, si `obtenerSesionOpcional()` devuelve sesión, redirige a `/`, y si no, muestra el título "Almacén Regional Oruro" y el formulario
- [X] T034 [US1] Crear `src/app/(sistema)/layout.tsx` (llama a `requerirSesion()`, muestra encabezado con el nombre del sistema, nombre y apellido del usuario y menú con Inicio, Personal y Sesiones, adaptable a pantallas chicas) y `src/app/(sistema)/page.tsx` (llama a `requerirSesion()` y muestra "Bienvenido, {nombre}" con accesos a los módulos disponibles)

**Punto de control**: pruebas T025–T026 en verde; pasos 1 a 3 del quickstart dan el resultado esperado.

---

## Fase 4: Historia 2 · Cerrar sesión y expiración (Prioridad: P1)

**Objetivo**: cerrar sesión deja la bitácora con hora de fin; una sesión con más de 8 horas deja de
valer y queda registrada como expirada.

**Prueba independiente**: ingresar, cerrar sesión y verificar que las páginas internas ya no abren;
retroceder 9 horas el inicio de una sesión y verificar la redirección (quickstart, paso 17 y
"Comprobación de expiración").

### Pruebas de la Historia 2

- [X] T035 [P] [US2] Crear `tests/integracion/acceso-cierre-expiracion.test.ts`: `cerrarSesion(token)` llena `fin` y `motivoCierre: "USUARIO"` y luego `validarSesion(token)` devuelve `null`; cerrar una de dos sesiones del mismo usuario no cierra la otra; una sesión con `inicio` de hace 8 h y 1 min devuelve `{ expirada: true }` y queda con `motivoCierre: "EXPIRADA"` y `fin` exactamente igual a `inicio + 8 h`; una sesión de hace 7 h 59 min sigue vigente; `cerrarSesionesVencidas()` cierra una sesión abandonada de hace 10 h con `fin = inicio + 8 h` y no toca una de hace 2 h; y una cookie todavía presente 8 h y 1 min después del ingreso lleva a `{ expirada: true }` (FR-006, FR-007, FR-009, SC-005)

### Implementación de la Historia 2

- [X] T036 [US2] Agregar a `src/servicios/acceso.ts` `cerrarSesion(token)`: calcular el hash y actualizar la sesión abierta con `fin: ahora` y `motivoCierre: "USUARIO"`; si no hay sesión abierta, no hacer nada (FR-006)
- [X] T037 [US2] Agregar a `src/servicios/acceso.ts` `cerrarSesionesVencidas()`: un `prisma.$executeRaw` parametrizado `UPDATE sesion SET fin = inicio + interval '8 hours', motivo_cierre = 'EXPIRADA', actualizado_en = now() WHERE fin IS NULL AND inicio < now() - interval '8 hours'`, con comentario de por qué no alcanza `updateMany` (`fin` depende de `inicio`); llamarla al comienzo de `iniciarSesion()`, para que la bitácora quede completa aunque nadie abra el historial (FR-007, SC-005). Luego modificar `validarSesion` para que, si `inicio + DURACION_SESION_HORAS` es anterior a ahora, cierre la sesión con `fin: inicio + 8 h` y `motivoCierre: "EXPIRADA"` y devuelva `{ expirada: true }`; y modificar `requerirSesion` en `src/lib/sesion.ts` para redirigir en ese caso a `/ingreso?expirada=1` (FR-007, RN-03)
- [X] T038 [US2] Crear `src/app/(sistema)/acciones-sesion.ts` (`"use server"`) con `salir()`: leer el token, llamar a `cerrarSesion`, `borrarCookieSesion()` y `redirect("/ingreso")`; `salir()` **no** llama a `requerirSesion()`, porque debe funcionar aunque la sesión esté vencida o con cambio de contraseña pendiente (caso borde "Cambio obligatorio pendiente"); agregar en `src/app/(sistema)/layout.tsx` un formulario con el botón "Cerrar sesión" que invoca `salir`
- [X] T039 [US2] Modificar `src/app/ingreso/page.tsx` para mostrar, cuando `searchParams.expirada === "1"`, el aviso informativo "Tu sesión expiró. Ingresa nuevamente". **No** borrar la cookie en la página: Next.js solo permite modificar cookies en Server Actions, Route Handlers o `proxy.ts`. La cookie vencida no molesta: `obtenerSesionOpcional()` la trata como sesión inexistente (sin bucle de redirecciones) y el siguiente ingreso la sobrescribe

**Punto de control**: prueba T035 en verde; paso 17 y la comprobación de expiración del quickstart dan el resultado esperado.

---

## Fase 5: Historia 3 · Registrar personal (Prioridad: P1)

**Objetivo**: el encargado registra personas con sus datos, usuario y contraseña inicial; se rechazan
duplicados y datos inválidos; la contraseña nunca se muestra.

**Prueba independiente**: registrar una persona, ingresar con ella y probar duplicados y datos
inválidos (quickstart, pasos 7 a 11).

### Pruebas de la Historia 3

- [X] T040 [P] [US3] Crear `tests/unitarios/esquemas-personal.test.ts` para `esquemaRegistroPersonal`: acepta datos válidos y convierte `" JPerez "` en `"jperez"`; rechaza nombre, apellido o cargo vacíos o de más de 60 caracteres, dirección de más de 150, teléfono `"77abc"` o de más de 20 caracteres, nombre de usuario de 2 o 31 caracteres o con `juan perez`, `juan-pérez`; contraseña de 7 caracteres; confirmación distinta; y para `esquemaFiltroPersonal`: un `estado` desconocido pasa a `activos` y un `q` de más de 60 caracteres se rechaza; en todos los casos verifica que cada mensaje está en español y dice cómo corregir
- [X] T041 [P] [US3] Crear `tests/integracion/personal-registro.test.ts` sobre `registrarPersonal`: crea usuario activo con `debeCambiarContrasena: false` y `contrasenaHash` que empieza con `$2` y no contiene la contraseña; la persona puede ingresar con `iniciarSesion`; registrar `JPerez` cuando existe `jperez` (activo o inactivo) lanza `ErrorDeNegocio` con campo `nombreUsuario` y mensaje `"Ya existe un usuario con el nombre de usuario 'jperez'"`; `obtenerPersonal` y `listarPersonal` no incluyen `contrasenaHash` en el objeto devuelto (FR-010 a FR-014)

### Implementación de la Historia 3

- [X] T042 [P] [US3] Crear `src/esquemas/personal.ts` con `esquemaDatosPersonales` (Zod 4, con los límites de `data-model.md` §5.1): `nombre`, `apellido`, `cargo` "obligatorio, 1 a 60 caracteres tras recortar espacios"; `direccion` "opcional, hasta 150"; `telefono` "opcional, hasta 20, solo dígitos, espacios, `+` y `-`" (cadena vacía se convierte en `undefined`); `nombreUsuario` que se recorta, pasa a minúsculas y cumple `^[a-z0-9._]{3,30}$` con el mensaje "Usa de 3 a 30 caracteres: letras minúsculas sin tildes, dígitos, punto o guion bajo"; y `esquemaRegistroPersonal` que agrega `contrasena` (mínimo 8, sin recortar, mensaje "La contraseña debe tener al menos 8 caracteres") y `confirmacion` igual a `contrasena` ("Las contraseñas no coinciden"); y `esquemaFiltroPersonal` (`q` texto opcional recortado de hasta 60 caracteres; `estado` `activos` | `inactivos` | `todos` con `.catch("activos")`), que usa T052
- [X] T043 [US3] Crear `src/servicios/personal.ts` con `registrarPersonal(datos)`: calcular el hash con `calcularHashContrasena`, crear el usuario y, si Prisma lanza error de unicidad (`P2002`) sobre `nombre_usuario`, lanzar `ErrorDeNegocio("Ya existe un usuario con el nombre de usuario '<valor>'", "nombreUsuario")`; comprobar también antes de insertar para dar el mensaje sin depender del error; devolver solo `{ id }` (FR-010 a FR-014)
- [X] T044 [US3] Agregar a `src/servicios/personal.ts` `obtenerPersonal(id)` y `listarPersonal({ texto?, estado })` con `select` explícito de los campos de `contracts/acciones-f001.md` ("Consultas") —nunca `contrasenaHash`—; en esta historia `listarPersonal` devuelve los activos ordenados por apellido y nombre (los filtros se agregan en T052)
- [X] T045 [US3] Crear `src/app/(sistema)/personal/formulario-personal.tsx` (`"use client"`), reutilizable para registro y edición: campos nombre, apellido, cargo, dirección, teléfono y nombre de usuario, y contraseña con confirmación solo en modo registro; validación previa con el esquema correspondiente al enviar y al salir de cada campo; errores por campo y mensaje general con `useActionState`
- [X] T046 [US3] Crear `src/app/(sistema)/personal/acciones.ts` (`"use server"`) con `registrarPersonalAccion(estadoPrevio, formData)` siguiendo el orden fijo del contrato (requerirSesion → Zod → servicio → `aResultadoDeError` → `revalidatePath("/personal")` → `redirect("/personal/<id>")`); y `src/app/(sistema)/personal/nuevo/page.tsx` con el formulario en modo registro
- [X] T047 [US3] Crear `src/app/(sistema)/personal/[id]/page.tsx` (ficha: nombre completo, cargo, dirección, teléfono, nombre de usuario, estado "Activo"/"Inactivo", fecha de registro; `notFound()` si no existe; sin ningún dato de contraseña) y `src/app/(sistema)/personal/page.tsx` (listado con `Tabla`: nombre completo, cargo, nombre de usuario, estado y enlace a la ficha; botón "Registrar personal")

**Punto de control**: pruebas T040–T041 en verde; pasos 7 a 11 del quickstart dan el resultado esperado.

---

## Fase 6: Historia 4 · Modificar, desactivar y reactivar personal (Prioridad: P1)

**Objetivo**: corregir datos, desactivar (cerrando sus sesiones) y reactivar personas, sin borrar a
nadie; buscar y filtrar el listado.

**Prueba independiente**: modificar una persona, desactivarla, verificar que no ingresa y que su
sesión abierta se cierra, reactivarla y verificar que ingresa (quickstart, pasos 12 a 14).

### Pruebas de la Historia 4

- [X] T048 [P] [US4] Crear `tests/integracion/personal-mantenimiento.test.ts`: `modificarPersonal` guarda los cambios y permite ingresar con el nombre de usuario nuevo; cambiar a un nombre de usuario de otra persona lanza el error de duplicado y guardar sin cambiar el propio no lo lanza; `desactivarPersonal(id, idQueOpera)` pone `activo: false` y cierra **todas** sus sesiones abiertas con `motivoCierre: "DESACTIVACION"` en la misma transacción, sin tocar sesiones de otros usuarios; desactivarse a sí mismo lanza `"No puedes desactivar tu propio usuario"`; `reactivarPersonal` permite ingresar con la contraseña anterior; `listarPersonal` filtra por `texto` en nombre, apellido o nombre de usuario sin distinguir mayúsculas y por `estado` (`activos` por defecto, `inactivos`, `todos`); no existe ninguna función de borrado en `src/servicios/personal.ts` (FR-008, FR-012, FR-015 a FR-018)

### Implementación de la Historia 4

- [X] T049 [US4] Agregar a `src/servicios/personal.ts` `modificarPersonal(id, datos)`: lanzar `ErrorDeNegocio("No existe la persona indicada")` si no existe; verificar duplicado de `nombreUsuario` excluyendo el propio `id`; actualizar solo nombre, apellido, cargo, dirección, teléfono y nombre de usuario (nunca `contrasenaHash`, `activo` ni `debeCambiarContrasena`) (FR-015)
- [X] T050 [US4] Agregar a `src/servicios/personal.ts` `desactivarPersonal(id, idUsuarioQueOpera)` y `reactivarPersonal(id)`: si `id === idUsuarioQueOpera`, lanzar `ErrorDeNegocio("No puedes desactivar tu propio usuario")`; si ya está en el estado pedido, lanzar un error claro; la desactivación ejecuta en `prisma.$transaction` el `update` de `activo: false` y el `updateMany` de sus sesiones con `fin: null` a `fin: ahora, motivoCierre: "DESACTIVACION"`; la reactivación solo pone `activo: true`, con comentario de que conserva contraseña y marca de cambio pendiente (FR-008, FR-016, FR-017, RN-04, RN-06)
- [X] T051 [US4] Agregar a `src/app/(sistema)/personal/acciones.ts` `modificarPersonalAccion(id, estadoPrevio, formData)` (esquema `esquemaDatosPersonales`), `desactivarPersonalAccion(id)` y `reactivarPersonalAccion(id)`, pasando el `id` del usuario de `requerirSesion()` como usuario que opera y revalidando `/personal` y `/personal/<id>`; crear `src/app/(sistema)/personal/[id]/editar/page.tsx` con el formulario en modo edición precargado
- [X] T052 [US4] Completar `listarPersonal` en `src/servicios/personal.ts` con búsqueda `contains` sin distinguir mayúsculas (`mode: "insensitive"`) sobre nombre, apellido y nombre de usuario, y filtro de estado; y agregar en `src/app/(sistema)/personal/page.tsx` el componente `Filtros` con campo de búsqueda `q` y selector `estado` (Activos por defecto, Inactivos, Todos): el formulario valida con `esquemaFiltroPersonal` (creado en T042) al enviar y la página lo aplica a `searchParams`, usando los valores por defecto si algo no es válido (constitución, principio VI)
- [X] T053 [US4] Agregar en `src/app/(sistema)/personal/[id]/page.tsx` los botones "Editar", "Desactivar" (con confirmación "¿Desactivar a <nombre>? Ya no podrá ingresar y se cerrarán sus sesiones abiertas"; oculto cuando la ficha es del propio usuario) y "Reactivar" (solo si está inactivo), mostrando el resultado con `Aviso`

**Punto de control**: prueba T048 en verde; pasos 12 a 14 del quickstart dan el resultado esperado.

---

## Fase 7: Historia 5 · Cambiar la propia contraseña y restablecer la de otro (Prioridad: P2)

**Objetivo**: cada usuario cambia su contraseña indicando la actual; el encargado restablece la de
otra persona con una temporal que esa persona debe cambiar al ingresar; el usuario inicial también
debe cambiarla.

**Prueba independiente**: cambiar la propia contraseña y entrar con la nueva; restablecer la de otra
persona y verificar que al ingresar se le exige cambiarla (quickstart, pasos 4 a 6 y 15).

### Pruebas de la Historia 5

- [ ] T054 [P] [US5] Crear `tests/unitarios/esquemas-contrasena.test.ts` para `esquemaCambioContrasena` (actual obligatoria; nueva de al menos 8; confirmación igual a la nueva) y `esquemaRestablecimiento` (temporal de al menos 8; confirmación igual), con mensajes en español
- [ ] T055 [P] [US5] Crear `tests/integracion/personal-contrasenas.test.ts`: `cambiarContrasenaPropia` con la actual correcta cambia el hash, pone `debeCambiarContrasena: false`, la anterior deja de servir y la sesión actual sigue vigente; con la actual incorrecta lanza `"La contraseña actual no es correcta"` (campo `contrasenaActual`) sin cambiar nada; con la nueva igual a la actual lanza `"La contraseña nueva debe ser distinta de la actual"`; `restablecerContrasena(id, temporal, idQueOpera)` cambia el hash, pone `debeCambiarContrasena: true` y cierra sus sesiones abiertas con `motivoCierre: "RESTABLECIMIENTO"` en una transacción; restablecer la propia lanza `"Para cambiar tu propia contraseña usa 'Cambiar mi contraseña'"`; `validarSesion` de un usuario con cambio pendiente devuelve `debeCambiarContrasena: true` (FR-008, FR-019 a FR-021)

### Implementación de la Historia 5

- [ ] T056 [P] [US5] Agregar a `src/esquemas/personal.ts` `esquemaCambioContrasena` (`contrasenaActual` mínimo 1 "Escribe tu contraseña actual"; `contrasenaNueva` mínimo 8; `confirmacion` igual a la nueva) y `esquemaRestablecimiento` (`contrasenaTemporal` mínimo 8; `confirmacion` igual), ninguno recorta contraseñas
- [ ] T057 [US5] Agregar a `src/servicios/personal.ts` `cambiarContrasenaPropia(idUsuario, actual, nueva)` y `restablecerContrasena(id, temporal, idUsuarioQueOpera)` según `contracts/acciones-f001.md`, con la transacción de cierre de sesiones en el restablecimiento y comentario de por qué la temporal obliga a cambiarla (RN-06)
- [ ] T058 [US5] Modificar `requerirSesion` en `src/lib/sesion.ts` para aceptar `{ permitirCambioPendiente?: boolean }` y redirigir a `/cambiar-contrasena` cuando `usuario.debeCambiarContrasena` es verdadero y la opción no está activa; y modificar `ingresar` en `src/app/ingreso/acciones.ts` para redirigir a `/cambiar-contrasena` cuando `iniciarSesion` devuelve `debeCambiarContrasena: true` (FR-021, RN-05)
- [ ] T059 [US5] Crear `src/app/(sistema)/cambiar-contrasena/acciones.ts` con `cambiarMiContrasenaAccion` (usa `requerirSesion({ permitirCambioPendiente: true })`, redirige a `/` con aviso "Contraseña actualizada"), `src/app/(sistema)/cambiar-contrasena/formulario.tsx` (tres campos de contraseña con validación previa) y `src/app/(sistema)/cambiar-contrasena/page.tsx` que, si el cambio es obligatorio, muestra "Debes definir una contraseña nueva antes de continuar" y solo ofrece cambiarla o cerrar sesión; hacer que `src/app/(sistema)/layout.tsx` oculte el menú en esa situación y agregue el enlace "Cambiar mi contraseña" en el caso normal
- [ ] T060 [US5] Agregar a `src/app/(sistema)/personal/acciones.ts` `restablecerContrasenaAccion(id, estadoPrevio, formData)` y en `src/app/(sistema)/personal/[id]/page.tsx` la sección "Restablecer contraseña" (contraseña temporal y confirmación, con nota "Comunica la contraseña temporal en persona; deberá cambiarla al ingresar"), visible solo cuando la ficha no es del propio usuario; en la propia ficha, mostrar en su lugar el enlace a "Cambiar mi contraseña" (Historia 5 · E6)

**Punto de control**: pruebas T054–T055 en verde; pasos 4 a 6 y 15 del quickstart dan el resultado esperado.

---

## Fase 8: Historia 6 · Consultar el historial de sesiones (Prioridad: P3)

**Objetivo**: ver quién ingresó y cuándo, con cómo terminó cada sesión, filtrando por persona y
fechas.

**Prueba independiente**: con varias sesiones registradas, filtrar por persona y por fechas y comparar
con los ingresos realizados (quickstart, paso 16).

### Pruebas de la Historia 6

- [ ] T061 [P] [US6] Crear `tests/integracion/acceso-historial.test.ts` sobre `listarSesiones`: ordena de la más reciente a la más antigua; filtra por `usuarioId` y por rango de fechas de `inicio` interpretado en `America/La_Paz` (una sesión iniciada a las 23:00 del último día del rango se incluye); pagina de 50 en 50 con `total`; traduce el estado a `"Abierta"`, `"Cerrada por el usuario"`, `"Expirada"` y `"Cerrada por desactivación o restablecimiento"`; y antes de consultar cierra en la base las sesiones sin `fin` con más de 8 horas, dejándolas con `fin = inicio + 8 h` y `motivoCierre: "EXPIRADA"` (FR-022, Historia 2 · E3)

### Implementación de la Historia 6

- [ ] T062 [US6] Agregar a `src/servicios/acceso.ts` `listarSesiones({ usuarioId?, desde, hasta, pagina })`: primero llamar a `cerrarSesionesVencidas()` (creada en T037); luego consultar con `select` de persona (nombre y apellido), `nombreUsuario`, `inicio`, `fin` y `motivoCierre`, convertir el rango de fechas a límites en `America/La_Paz` con `src/lib/fechas.ts`, y devolver `{ filas, total }` con el texto de estado (FR-022)
- [ ] T063 [US6] Crear en `src/esquemas/acceso.ts` `esquemaFiltroSesiones` (`usuario` entero positivo opcional con `z.coerce`; `desde` y `hasta` fechas `AAAA-MM-DD` válidas, por defecto `inicioDelMesEnCurso()` y `hoyEnLaPaz()`; regla `desde ≤ hasta` con el mensaje "La fecha «desde» no puede ser posterior a «hasta»"; `pagina` entero ≥ 1, por defecto 1), usado por el formulario de filtros y por la página (constitución, principio VI), con su prueba `tests/unitarios/esquema-filtro-sesiones.test.ts` (fechas inválidas, rango invertido y valores por defecto); y crear `src/app/(sistema)/sesiones/page.tsx`: `requerirSesion()`, filtros con `Filtros` (selector de persona con todo el personal, activo e inactivo; `desde` y `hasta` con valores por defecto `inicioDelMesEnCurso()` y `hoyEnLaPaz()`), `Tabla` con persona, nombre de usuario, inicio, fin y estado en formato de fecha y hora de Bolivia, paginación con `pagina` y mensaje "No hay sesiones para los filtros aplicados" cuando no hay filas; agregar el enlace "Sesiones" al menú de `src/app/(sistema)/layout.tsx` si aún no está

**Punto de control**: prueba T061 en verde; paso 16 del quickstart da el resultado esperado.

---

## Fase 9: Cierre y aspectos transversales

**Propósito**: verificar calidad, seguridad y documentación de F-001 antes de pasar a F-002.

- [ ] T064 [P] Revisar con `grep` que ningún archivo de `src/` devuelve, registra en consola ni envía al cliente `contrasenaHash`, `tokenHash`, contraseñas o tokens (FR-014, SC-004), y que todas las páginas de `src/app/(sistema)/` y todas las funciones de sus `acciones.ts` llaman a `requerirSesion` como primera instrucción (FR-004), **excepto `salir()`** en `acciones-sesion.ts`, que es la excepción documentada en T038; corregir lo que falte
- [ ] T065 [P] Revisar accesibilidad y pantallas chicas en `src/app/ingreso/`, `src/app/(sistema)/layout.tsx`, `personal/`, `cambiar-contrasena/` y `sesiones/`: todo campo con etiqueta, errores anunciados, navegación con teclado, tablas con desplazamiento horizontal a 400 px de ancho
- [ ] T066 Ejecutar `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` y corregir todos los errores y advertencias
- [ ] T067 Ejecutar el recorrido completo de `specs/001-acceso-personal/quickstart.md` (preparación, pruebas, 17 pasos, comprobación de expiración y de hashes), medir con cronómetro el ingreso (SC-001, menos de 30 s) y el registro de una persona (SC-002, menos de 2 min), y anotar en `quickstart.md` cualquier ajuste de comandos que haya hecho falta
- [ ] T068 [P] Crear `docs/instalacion.md` con la primera versión de la guía para Raymond (requisitos, preparación, semilla, ingreso con `admin` y cambio de contraseña inicial), en español y sin asumir conocimientos de programación; se completará con F-002 a F-007 el 20/09
- [ ] T069 [P] Actualizar `docs/decisiones.md` con las decisiones tomadas durante la implementación que no estaban en research.md (si las hubo) y marcar en `docs/especificacion/README.md` que F-001 está implementada

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Preparación (fase 1)**: sin dependencias.
- **Fundamentos (fase 2)**: depende de la fase 1; **bloquea todas las historias**. Dentro de la fase,
  T011 → T012 → T013 → T014 van en orden; T015 a T019 y T021 son paralelas entre sí; T020 depende de
  T014 y T018; T022 depende de T013 y T014.
- **Historias (fases 3 a 8)**: dependen de la fase 2.
- **Cierre (fase 9)**: depende de las historias que se vayan a entregar.

### Dependencias entre historias

| Historia | Depende de | Motivo |
|---|---|---|
| US1 Ingresar | Fundamentos | — |
| US2 Cierre y expiración | US1 | Modifica `validarSesion` y `requerirSesion`, y usa el layout del sistema |
| US3 Registrar personal | US1 | Las páginas del sistema exigen sesión |
| US4 Mantener personal | US3 | Usa el formulario, la ficha y el listado de US3 |
| US5 Contraseñas | US1 y US3 | Modifica `requerirSesion` y la ficha de personal |
| US6 Historial | US1 y US2 | Lista sesiones y usa la regla de expiración |

Las pruebas de servicios de US3 (T041) y de US6 (T061) no dependen de la interfaz y pueden escribirse
en cuanto termine la fase 2.

### Dentro de cada historia

- Pruebas y esquemas marcados [P] primero; las pruebas de integración deben fallar antes de implementar
  el servicio.
- Esquema → servicio → Server Action → página.
- Hacer commit al terminar cada fase (sin líneas de autoría).

---

## Ejemplos de trabajo en paralelo

```text
# Fase 2, después de T014:
T015 src/lib/errores.ts
T016 src/lib/texto.ts
T017 src/lib/fechas.ts
T018 src/lib/contrasenas.ts
T019 src/lib/sesion.ts
T021 src/componentes/ui/*

# Historia 1, al empezar:
T025 tests/unitarios/esquema-ingreso.test.ts
T026 tests/integracion/acceso-ingreso.test.ts
T027 src/esquemas/acceso.ts
T031 src/proxy.ts

# Historia 3, al empezar:
T040 tests/unitarios/esquemas-personal.test.ts
T041 tests/integracion/personal-registro.test.ts
T042 src/esquemas/personal.ts
```

---

## Estrategia de implementación

### MVP (Historia 1)

1. Fase 1 · Preparación.
2. Fase 2 · Fundamentos (esquema completo, restricciones, semilla, pruebas).
3. Fase 3 · Historia 1.
4. **Validar**: quickstart, pasos 1 a 3 y 11 con un usuario de prueba.

### Entrega incremental (plan del martes 15/09)

| Paso | Fases | Resultado verificable |
|---|---|---|
| 1 | 1 y 2 | Base con 18 tablas y `admin`; pruebas de restricciones en verde |
| 2 | 3 y 4 (US1, US2) | Ingreso, cierre y expiración funcionando |
| 3 | 5 y 6 (US3, US4) | Gestión completa de personal |
| 4 | 7 (US5) | Contraseñas y cambio obligatorio |
| 5 | 8 (US6) | Bitácora de sesiones |
| 6 | 9 | Calidad, guía de instalación y quickstart completo |

Si el martes se atrasa, se aplica el orden de corte de `00-decisiones-y-alcance.md` §5: **US6 (P3) es
lo primero que se posterga**, luego US5 (P2); US1 a US4 son imprescindibles.

---

## Notas

- [P] = archivos distintos y sin dependencias pendientes.
- La etiqueta [US#] enlaza cada tarea con su historia de `spec.md`.
- Toda tarea que toque reglas cita su requisito (FR-xx) o regla (RN-xx) en un comentario del código,
  explicando el **por qué** (constitución, principio I).
- Si durante la implementación aparece algo que la especificación no cubre, **no se improvisa**: se
  corrige `spec.md` o `02-modelo-de-dominio.md` y se regenera lo que corresponda.
