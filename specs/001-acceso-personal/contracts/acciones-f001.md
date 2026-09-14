# Contrato de Server Actions y servicios · F-001

**Plan**: [../plan.md](../plan.md) · **Especificación**: [../spec.md](../spec.md)

El sistema no expone una API pública: la interfaz llama a **Server Actions**, y cada una llama a un
**servicio**. Este contrato fija, para F-001, qué recibe y qué devuelve cada una. Los planes
siguientes siguen el mismo formato.

## Convenciones comunes (todas las funcionalidades)

**Resultado de una acción** (`src/lib/errores.ts`):

```ts
type ResultadoAccion<T = void> =
  | { ok: true; datos: T; mensaje?: string }
  | { ok: false; mensaje: string; errores?: Partial<Record<string, string[]>> }
```

- `errores` lleva los mensajes por campo, con los mismos nombres de campo del esquema Zod.
- `mensaje` es el texto general en español ("Ya existe un usuario con el nombre de usuario 'jperez'").
- Una acción que termina navegando (por ejemplo, ingresar) llama a `redirect()` en lugar de devolver
  `ok: true`.

**Orden fijo dentro de cada Server Action**:

1. `requerirSesion()` (salvo `ingresar` y `salir`).
2. Validar `FormData` con el esquema Zod compartido; si falla, devolver `ok: false` con `errores`.
3. Llamar al servicio.
4. Capturar `ErrorDeNegocio` → `ok: false` con su mensaje; otro error → mensaje genérico y log sin
   datos sensibles.
5. `revalidatePath()` de las páginas afectadas y devolver el resultado o redirigir.

**Esquemas Zod** en `src/esquemas/acceso.ts` y `src/esquemas/personal.ts`. Nunca aceptan campos que el
usuario no debe cambiar (`activo`, `debeCambiarContrasena`, `contrasenaHash`, ids ajenos).

---

## Acciones de acceso · `src/app/ingreso/acciones.ts` y `src/app/(sistema)/acciones-sesion.ts`

### `ingresar(estadoPrevio, formData)`

| | |
|---|---|
| Entrada (`esquemaIngreso`) | `nombreUsuario`: texto, se recorta y pasa a minúsculas, obligatorio · `contrasena`: texto, obligatorio |
| Servicio | `iniciarSesion(nombreUsuario, contrasena)` en `src/servicios/acceso.ts` |
| Éxito | crea la fila de `sesion`, escribe la cookie `sesion` (HttpOnly, SameSite=Lax, Path=/, dura 24 h; la vigencia de 8 h la controla el servidor) y redirige a `/`, o a `/cambiar-contrasena` si tiene el cambio pendiente |
| Error | `ok: false`, `mensaje: "Usuario o contraseña incorrectos"` — **idéntico** para usuario inexistente, contraseña incorrecta o usuario inactivo (FR-003) |
| Requisitos | FR-001 a FR-005, FR-021 |

Nota: cuando el usuario no existe, el servicio igual ejecuta una comparación bcrypt contra un hash fijo,
para que el tiempo de respuesta no revele si la cuenta existe (SC-007).

### `salir()`

| | |
|---|---|
| Entrada | — |
| Servicio | `cerrarSesion(tokenHash, 'USUARIO')` |
| Éxito | llena `fin` y `motivoCierre = USUARIO`, borra la cookie y redirige a `/ingreso` |
| Requisitos | FR-006 |

### `requerirSesion(opciones?)` · `src/lib/sesion.ts` (no es Server Action; la usan todas)

| | |
|---|---|
| Entrada | `{ permitirCambioPendiente?: boolean }` |
| Servicio | `validarSesion(token)` en `src/servicios/acceso.ts` |
| Devuelve | `{ sesionId, usuario: { id, nombre, apellido, nombreUsuario } }` (sin datos sensibles) |
| Sin cookie o sesión inexistente/cerrada | redirige a `/ingreso` |
| Vencida (`inicio + 8 h` pasado) | cierra con `EXPIRADA` y fin `inicio + 8 h`; redirige a `/ingreso?expirada=1` |
| Usuario inactivo | cierra con `DESACTIVACION` si aún estaba abierta; redirige a `/ingreso` |
| Cambio de contraseña pendiente | redirige a `/cambiar-contrasena`, salvo `permitirCambioPendiente` |
| Requisitos | FR-004, FR-007, FR-008, FR-021 |

Se memoriza por solicitud con `cache()` de React para no consultar la base varias veces en una misma
página.

---

## Acciones de personal · `src/app/(sistema)/personal/acciones.ts`

### `registrarPersonalAccion(estadoPrevio, formData)`

| | |
|---|---|
| Entrada (`esquemaRegistroPersonal`) | `nombre`, `apellido`, `cargo` (obligatorios, ≤ 60) · `direccion` (≤ 150) · `telefono` (≤ 20, `[0-9 +-]`) · `nombreUsuario` (3–30, `[a-z0-9._]`, en minúsculas) · `contrasena` (≥ 8) · `confirmacion` (igual a `contrasena`) |
| Servicio | `registrarPersonal(datos)` en `src/servicios/personal.ts` |
| Éxito | crea el usuario activo con `debeCambiarContrasena = false` y redirige a `/personal/[id]` |
| Errores de negocio | `nombreUsuario` repetido → "Ya existe un usuario con el nombre de usuario '…'" en `errores.nombreUsuario` |
| Requisitos | FR-010 a FR-014 |

### `modificarPersonalAccion(id, estadoPrevio, formData)`

| | |
|---|---|
| Entrada (`esquemaModificacionPersonal`) | los mismos campos que el registro, **sin** contraseña |
| Servicio | `modificarPersonal(id, datos)` |
| Éxito | guarda y redirige a `/personal/[id]` |
| Errores de negocio | persona inexistente · `nombreUsuario` repetido (excluyendo a la misma persona) |
| Requisitos | FR-012, FR-015 |

### `desactivarPersonalAccion(id)`

| | |
|---|---|
| Servicio | `desactivarPersonal(id, idUsuarioQueOpera)` — en una transacción: `activo = false` y cierre de sus sesiones abiertas con `DESACTIVACION` |
| Errores de negocio | `id` igual al usuario que opera → "No puedes desactivar tu propio usuario" · ya inactivo |
| Requisitos | FR-008, FR-016, FR-017 |

### `reactivarPersonalAccion(id)`

| | |
|---|---|
| Servicio | `reactivarPersonal(id)` — `activo = true`; conserva su contraseña y su marca de cambio pendiente |
| Errores de negocio | ya activo |
| Requisitos | FR-016 |

### `restablecerContrasenaAccion(id, estadoPrevio, formData)`

| | |
|---|---|
| Entrada (`esquemaRestablecimiento`) | `contrasenaTemporal` (≥ 8) · `confirmacion` (igual) |
| Servicio | `restablecerContrasena(id, contrasenaTemporal, idUsuarioQueOpera)` — en una transacción: nuevo hash, `debeCambiarContrasena = true`, cierre de sus sesiones abiertas con `RESTABLECIMIENTO` |
| Errores de negocio | `id` igual al usuario que opera → "Para cambiar tu propia contraseña usa 'Cambiar mi contraseña'" |
| Requisitos | FR-008, FR-020 |

---

## Acciones de contraseña propia · `src/app/(sistema)/cambiar-contrasena/acciones.ts`

### `cambiarMiContrasenaAccion(estadoPrevio, formData)`

| | |
|---|---|
| Sesión | `requerirSesion({ permitirCambioPendiente: true })` |
| Entrada (`esquemaCambioContrasena`) | `contrasenaActual` (obligatoria) · `contrasenaNueva` (≥ 8) · `confirmacion` (igual a la nueva) |
| Servicio | `cambiarContrasenaPropia(idUsuario, actual, nueva)` en `src/servicios/personal.ts` |
| Éxito | nuevo hash, `debeCambiarContrasena = false`; la sesión actual sigue vigente; redirige a `/` con aviso "Contraseña actualizada" |
| Errores de negocio | actual incorrecta → "La contraseña actual no es correcta" en `errores.contrasenaActual` · nueva igual a la actual → "La contraseña nueva debe ser distinta de la actual" |
| Requisitos | FR-019, FR-021 |

En el cambio obligatorio, la "contraseña actual" es la temporal o la inicial con la que acaba de
ingresar: el mismo formulario y la misma regla cubren los dos casos.

---

## Consultas · `src/servicios/personal.ts` y `src/servicios/acceso.ts`

Las páginas (Server Components) llaman directamente a estas funciones después de `requerirSesion()`.
Devuelven objetos con solo los campos que la pantalla necesita; **ninguna** devuelve `contrasenaHash`
ni `tokenHash`.

| Función | Parámetros | Devuelve | Requisito |
|---|---|---|---|
| `listarPersonal` | `{ texto?, estado: 'activos' \| 'inactivos' \| 'todos' }` | `{ id, nombreCompleto, cargo, nombreUsuario, activo }[]` ordenado por apellido y nombre | FR-018 |
| `obtenerPersonal` | `id` | `{ id, nombre, apellido, cargo, direccion, telefono, nombreUsuario, activo, debeCambiarContrasena, creadoEn }` o `null` | FR-015 |
| `listarSesiones` | `{ usuarioId?, desde, hasta, pagina }` | `{ filas: { id, persona, nombreUsuario, inicio, fin, estado }[], total }` de 50 en 50, de la más reciente a la más antigua; antes de consultar llama a `cerrarSesionesVencidas()` | FR-022, Historia 2 escenario 3 |

`estado` de una sesión: `"Abierta"`, `"Cerrada por el usuario"`, `"Expirada"` o `"Cerrada por
desactivación o restablecimiento"`.

---

## Semilla · `prisma/semilla.ts`

| | |
|---|---|
| Ejecución | `npx prisma db seed` (configurada en `prisma.config.ts`) |
| Efecto | crea, si no existen, la fila `configuracion` (id 1, `modoDemostracion = false`) y el usuario `admin` (nombre "Administrador", cargo "Encargado de almacén", contraseña de `CONTRASENA_INICIAL`, `debeCambiarContrasena = true`) |
| Idempotencia | ejecutarla dos veces no duplica nada ni cambia la contraseña de `admin` |
| Requisito | FR-023, RN-05 |
