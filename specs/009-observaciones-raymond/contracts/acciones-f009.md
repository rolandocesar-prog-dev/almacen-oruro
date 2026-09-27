# Contrato de Server Actions, servicios y rutas · F-009

**Plan**: [../plan.md](../plan.md) · **Especificación**: [../spec.md](../spec.md) · **Convenciones
comunes**: [F-001 `contracts/acciones-f001.md`](../../001-acceso-personal/contracts/acciones-f001.md)
(`ResultadoAccion`, orden fijo requerirSesion → Zod → servicio → errores → revalidar/redirigir).

Sin cambios a las convenciones comunes.

---

## 1. Rutas

| Ruta | Cambio | Protección |
|---|---|---|
| `/respaldo` | **Nueva** (Historia 4). Grupo "Administración" del menú y de la pantalla de inicio | `requerirSesion()` |
| `/centros-salud/[id]` | Muestra el representante activo o "Sin representante activo", y los anteriores (FR-007) | sin cambios |
| `/representantes`, `/representantes/nuevo`, `/representantes/[id]`, `/representantes/[id]/editar` | Sin "Servicio"; columna y dato "Centro de salud"; selector de centros disponibles (FR-005) | sin cambios |
| `/pedidos`, `/pedidos/[id]`, `/pedidos/nuevo`, `/pedidos/[id]/editar` | Representante con su centro; columna "Centro de salud" | sin cambios |
| `/distribuciones`, `/distribuciones/[id]`, `/distribuciones/nueva`, `/distribuciones/[id]/vale` | Representante con su centro; sin "Servicio" | sin cambios |
| `/reportes/pedidos`, `/reportes/distribuciones` y sus `/imprimir` | Columna "Centro de salud"; filtro de representante con su centro | sin cambios |
| `/kardex/[productoId]`, `/reportes/kardex` y su `/imprimir` | Texto del movimiento con el centro | sin cambios |
| `/ia/informes/[id]` y su `/imprimir` | Tabla "Por centro de salud" (o "Servicio" en informes anteriores) | sin cambios |
| `/ingreso`, `/cambiar-contrasena`, `/personal/nuevo`, `/personal/[id]` | Campos de contraseña con "Mostrar / Ocultar" | sin cambios |

No se agregan manejadores de ruta (`route.ts`): el respaldo se entrega con una Server Action
(research O-09).

---

## 2. Server Actions

### Nueva · `src/app/(sistema)/respaldo/acciones.ts`

| Acción | Entrada | Servicio | Éxito | Errores |
|---|---|---|---|---|
| `generarRespaldoAccion()` | — | `generarRespaldo()` | `{ ok: true, datos: { nombreArchivo, contenido } }`; el cliente descarga el archivo | los cuatro de research O-10, con `ok: false` y sin contenido |

No revalida ni redirige: no cambia datos.

### Cambian · `src/app/(sistema)/representantes/acciones.ts`

| Acción | Cambio |
|---|---|
| `registrarRepresentanteAccion` | El esquema ya no tiene `servicio`. Nuevo error de negocio: el centro ya tiene representante activo (RN-18), con campo `centroSaludId` |
| `modificarRepresentanteAccion` | Igual; el error de RN-18 solo si cambia el centro de un representante activo |
| `desactivarRepresentanteAccion` | **Ya no** devuelve el error de "pedidos por atender" (RN-13 modificada) |
| `reactivarRepresentanteAccion` | Nuevo error de negocio: el centro ya tiene otro representante activo (RN-18) |

**Mensaje de RN-18** (uno solo para las tres vías, research O-01):

> El centro de salud '{centro}' ya tiene como representante activo a '{Apellido, Nombre}':
> desactívalo antes de {registrar a otra persona | reactivar a este representante | cambiar a este
> representante de centro}

Sin cambios de firma en las demás acciones de F-001 a F-007.

---

## 3. Servicios

### Nuevos

| Función | Archivo | Devuelve |
|---|---|---|
| `generarRespaldo(ejecutar = ejecutarPgDump)` | `src/servicios/respaldo.ts` | `{ nombreArchivo, contenido }` o `ErrorDeNegocio` con el mensaje de O-10. El ejecutor se inyecta para las pruebas (O-14) |
| `nombreArchivoRespaldo(fecha: Date)` | `src/servicios/respaldo.ts` | `respaldo-almacen-oruro-AAAA-MM-DD-HHMM.sql`, en hora de Oruro |
| `etiquetaRepresentante({ apellido, nombre, centroSalud })` | `src/servicios/catalogos/representantes.ts` | "Apellido, Nombre · Centro de salud" |
| `listarCentrosParaRepresentante(idActual?)` | `src/servicios/catalogos/centros-salud.ts` | `{ id, nombre }[]` (research O-06) |
| `contarPedidosPorAtender(representanteId)` | `src/servicios/catalogos/representantes.ts` | número de pedidos PENDIENTE o PARCIAL, para el aviso de baja |
| `obtenerRepresentantesDelCentro(centroId)` | `src/servicios/catalogos/centros-salud.ts` | `{ activo: … \| null, anteriores: …[] }` para la ficha del centro |

### Cambian

| Función | Cambio |
|---|---|
| `registrarRepresentante`, `modificarRepresentante`, `reactivarRepresentante` | Verifican RN-18 en la transacción; traducen P2002 de `representante_centro_activo_unico` al mismo mensaje |
| `desactivarRepresentante` | Sin la verificación de pedidos por atender |
| `desactivarCentroSalud` | El rechazo de RN-13 nombra al representante activo en lugar de contarlos (FR-027) |
| Las funciones de la tabla §5 de [data-model.md](../data-model.md) | `servicio` → `centroSalud` |
| Generador de F-007 | `CENTROS` en lugar de `REPRESENTANTES` y `CENTRO_SALUD` (research O-07) |

---

## 4. Componentes

| Componente | Archivo | Tipo | Uso |
|---|---|---|---|
| `CampoContrasena` | `src/componentes/ui/campo-contrasena.tsx` | cliente, **nuevo** | Los 8 campos de contraseña (research O-13). Mismas propiedades que `Campo` salvo `type` |
| `BotonRespaldo` | `src/app/(sistema)/respaldo/boton-respaldo.tsx` | cliente, **nuevo** | Llama a `generarRespaldoAccion`, muestra el error con `Aviso` o descarga el archivo |
| `Icono` | `src/componentes/ui/icono.tsx` | sin cambio de tipo | Suma el trazo `respaldo` |
| `TablaDatosInforme` | `src/componentes/ia/tabla-datos-informe.tsx` | sin cambio de tipo | Columna según el formato del informe guardado (research O-05) |

---

## 5. Variables de entorno

| Variable | Nueva | Por defecto | Uso |
|---|---|---|---|
| `CONTENEDOR_BASE_DATOS` | **sí** | `almacen-oruro-postgres` | Contenedor donde se ejecuta `pg_dump` (research O-08). Se documenta en `.env.example` |
| `DATABASE_URL` | no | — | De ahí salen el usuario y el nombre de la base para `pg_dump` |
