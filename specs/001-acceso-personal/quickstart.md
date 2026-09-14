# Guía de validación · F-001 Acceso y personal

**Plan**: [plan.md](plan.md) · **Especificación**: [spec.md](spec.md)

Pasos para levantar el sistema en local y comprobar, de punta a punta, que F-001 cumple su
especificación. No reemplaza a las pruebas automatizadas: las complementa con la verificación manual
que se hará en la demostración.

## 1. Requisitos previos

| Herramienta | Versión | Cómo verificar |
|---|---|---|
| Node.js | 22 LTS | `node -v` → `v22.x` |
| npm | 10.x | `npm -v` |
| Docker Desktop | en ejecución | `docker info` responde sin error |
| Navegador | Chrome o Edge de escritorio | — |

## 2. Preparación (una sola vez)

```bash
npm install
```

```bash
cp .env.example .env
```

Revisar en `.env` al menos `DATABASE_URL`, `DATABASE_URL_TEST` y `CONTRASENA_INICIAL`
(ver [research.md R-14](research.md#r-14--entorno-local-y-datos-iniciales)).

```bash
docker compose up -d
```

```bash
npx prisma migrate deploy
```

```bash
npx prisma db seed
```

**Resultado esperado:** el contenedor `postgres` en estado *healthy*, las dos migraciones aplicadas
(esquema inicial y restricciones de negocio) y el mensaje de la semilla indicando que se creó el usuario
`admin`.

**Ajustes encontrados al implementar (13–14/09):**

- `npm install` usa el `.npmrc` del proyecto (`legacy-peer-deps=true`): sin él, npm 10.9 se detiene con
  "Cannot read properties of null (reading 'edgesOut')" (`docs/decisiones.md`, I-01).
- Docker Desktop tiene que estar **abierto antes** de `docker compose up -d` y de `npm test`. Si la
  computadora se suspende, puede cerrarse: `npm test` falla con `P1001: Can't reach database server`.
- `docker compose up -d` crea la base de pruebas solo la **primera vez** que se crea el volumen.

## 3. Pruebas automatizadas

```bash
npm test
```

**Resultado esperado:** todas en verde. Para F-001 deben existir, como mínimo, pruebas de:

| Regla | Tipo | Requisito |
|---|---|---|
| Esquemas Zod de ingreso, personal y contraseñas (casos válidos e inválidos) | unitaria | FR-010, FR-011, FR-013 |
| Normalización del nombre de usuario | unitaria | FR-002, FR-011 |
| Ingreso correcto, contraseña incorrecta, usuario inexistente e inactivo con el mismo mensaje | integración | FR-001, FR-003 |
| Duplicado de nombre de usuario sin distinguir mayúsculas, incluidos inactivos | integración | FR-012 |
| La contraseña se guarda como hash bcrypt y nunca se devuelve | integración | FR-014 |
| Sesión vencida a las 8 h: se rechaza y queda cerrada con `EXPIRADA` | integración | FR-007 |
| Desactivar y restablecer cierran las sesiones abiertas de esa persona | integración | FR-008 |
| No desactivarse a sí mismo | integración | FR-017 |
| Cambio obligatorio de contraseña tras restablecer y para el usuario inicial | integración | FR-021 |
| Restricciones CHECK de `usuario` y `sesion` rechazan datos inválidos insertados directamente | integración | data-model §4 |

## 4. Levantar la aplicación

```bash
npm run dev
```

Abrir `http://localhost:3000`.

## 5. Recorrido de validación manual

Cada paso indica la historia y el escenario de [spec.md](spec.md) que comprueba.

| # | Acción | Resultado esperado | Spec |
|---|---|---|---|
| 1 | Abrir `http://localhost:3000/personal` sin haber ingresado | Redirige a `/ingreso` | H1 · E6 |
| 2 | Ingresar con `admin` y una contraseña incorrecta | "Usuario o contraseña incorrectos" | H1 · E3 |
| 3 | Ingresar con `noexiste` y cualquier contraseña | El mismo mensaje exacto | H1 · E4 |
| 4 | Ingresar con `ADMIN` y `CONTRASENA_INICIAL` | Entra y lo lleva a `/cambiar-contrasena` | H1 · E2, H5 · E5 |
| 5 | Intentar abrir `/personal` sin cambiar la contraseña | Vuelve a `/cambiar-contrasena` | FR-021 |
| 6 | Cambiar la contraseña (actual = inicial, nueva de 8 o más) | Llega al inicio con "Contraseña actualizada" | H5 · E1 |
| 7 | Registrar a Juan Pérez con usuario `jperez` y contraseña `almacen2026` | Queda activo y aparece en `/personal` | H3 · E1 |
| 8 | Registrar otra persona con usuario ` JPerez ` | "Ya existe un usuario con el nombre de usuario 'jperez'" | H3 · E2 |
| 9 | Registrar con contraseña `1234567` o usuario `juan perez` | Errores en el campo, sin enviar al servidor | H3 · E3, E4 |
| 10 | Revisar la ficha y el listado de Juan Pérez | La contraseña no aparece en ningún lugar | H3 · E6 |
| 11 | En otra ventana privada, ingresar como `jperez` | Entra al inicio | H1 · E1 |
| 12 | Como `admin`, desactivar a `jperez`; en la ventana de `jperez`, hacer clic en cualquier enlace | `jperez` vuelve a `/ingreso`; su intento de ingresar da el mensaje genérico | H4 · E2, H1 · E5 |
| 13 | Como `admin`, intentar desactivar a `admin` | "No puedes desactivar tu propio usuario" | H4 · E3 |
| 14 | Reactivar a `jperez` e ingresar con `almacen2026` | Entra normalmente | H4 · E4 |
| 15 | Como `admin`, restablecer la contraseña de `jperez` con `temporal123`; `jperez` ingresa con ella | Se le exige definir una nueva antes de seguir | H5 · E4 |
| 16 | Como `admin`, abrir `/sesiones` y filtrar por Juan Pérez | Sus sesiones con inicio, fin y motivo: "Cerrada por desactivación o restablecimiento", "Abierta", etc. | H6 · E1, E2 |
| 17 | Cerrar sesión como `admin` | Vuelve a `/ingreso`; `/personal` ya no abre sin ingresar | H2 · E1 |

**Comprobación de expiración sin esperar 8 horas** (entorno de desarrollo): en la base de desarrollo,
retroceder 9 horas el `inicio` de una sesión abierta y hacer clic en cualquier enlace con esa sesión.

```bash
npx prisma studio
```

Resultado esperado: redirige a `/ingreso?expirada=1` con "Tu sesión expiró. Ingresa nuevamente", y
en `/sesiones` esa sesión figura como "Expirada" con fin igual a inicio + 8 h (H2 · E2, E3).

**Comprobación de que no se guarda la contraseña:** en Prisma Studio, la columna `contrasena_hash` de
`usuario` empieza con `$2b$12$` y no contiene la contraseña; la columna `token_hash` de `sesion` no
coincide con el valor de la cookie `sesion` del navegador (SC-004).

## 6. Criterio de terminado

F-001 está lista cuando las pruebas automatizadas están en verde y los 17 pasos del recorrido dan el
resultado esperado.

## 7. Estado de la validación (14/09/2026)

| Parte | Estado | Cómo se verificó |
|---|---|---|
| Preparación (§2) | ✅ | Instalación, contenedor *healthy*, 2 migraciones (18 tablas, 27 CHECK), semilla idempotente |
| Pruebas automatizadas (§3) | ✅ | 77 pruebas en verde (14 archivos), más `lint`, `typecheck` y `build` sin errores |
| Pasos 1 y 2 | ✅ | En el navegador: redirección sin sesión y mensaje genérico |
| Pasos 4 y 5 (desvío al cambio obligatorio), 10, 13 (botón oculto en la ficha propia), 16 y aviso de expiración | ✅ parcial | Páginas pedidas con una sesión de prueba creada en la base (sin escribir contraseñas en el navegador) |
| Pasos 3, 6 a 9, 11, 12, 14, 15 y 17, y tiempos SC-001 y SC-002 | ⏳ Pendiente de recorrido manual | Requieren escribir contraseñas en el navegador; las reglas que comprueban ya están cubiertas por las pruebas de integración |
