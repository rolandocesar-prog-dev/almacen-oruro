# Modelo de datos · F-009 Observaciones de Raymond

**Fecha**: 2026-09-26 · **Plan**: [plan.md](plan.md) · **Referencia común**:
[`docs/especificacion/02-modelo-de-dominio.md`](../../docs/especificacion/02-modelo-de-dominio.md)
(ya actualizado: `centro_salud`, `representante`, RN-13 y RN-18)

F-009 cambia **una tabla** (`representante`) y **ninguna otra**. No agrega tablas: el respaldo no se
guarda en el sistema (FR-017) y mostrar la contraseña no persiste nada.

---

## 1. `representante` (cambia)

| Campo | Antes | Después | Motivo |
|---|---|---|---|
| `servicio` | texto(60), obligatorio | **se elimina** | D-22: el representante se identifica por su centro |
| `centro_salud_id` | FK, obligatorio, centro activo | igual, y el centro no puede tener **otro representante activo** | RN-18 |

**Restricción nueva** (research O-01):

```prisma
@@unique([centroSaludId], where: raw("activo = true"), map: "representante_centro_activo_unico")
```

Se lee: "entre los representantes activos, un centro de salud no se repite". Los inactivos no cuentan,
así que un centro conserva el historial de todas las personas que tuvo.

**Migración** `…_representante_por_centro` (research O-02): guardia que aborta con un mensaje en
español si algún centro tiene más de un representante activo → `DROP COLUMN servicio` → índice
parcial. No convierte datos: una base de demostración anterior se recrea.

## 2. `centro_salud` (sin cambios en la tabla)

Cambia la relación, no los campos: tiene **como máximo un representante activo** (RN-18). Su ficha
muestra el activo y los anteriores (FR-007).

## 3. Reglas que cambian

| Regla | Antes | Después |
|---|---|---|
| RN-13 | No se puede desactivar un representante con pedidos PENDIENTE o PARCIAL | **Sí se puede**, con aviso del conteo; los pedidos siguen a su nombre (D-22, research O-03). Para categorías, unidades, productos y centros no cambia |
| RN-18 | — | **Nueva**: un representante activo por centro; se verifica al registrar, reactivar y cambiar de centro |
| RN-17 | Reactivar un representante exige su centro activo | Igual, y además que el centro no tenga otro representante activo (RN-18) |

## 4. Transiciones del representante

```text
            registrar (centro sin activo)
                     │
                     ▼
               ┌──────────┐   desactivar (con aviso si tiene pedidos por atender)   ┌───────────┐
               │  ACTIVO  │ ─────────────────────────────────────────────────────▶ │ INACTIVO  │
               └──────────┘ ◀───────────────────────────────────────────────────── └───────────┘
                     │       reactivar (centro activo y sin otro activo)
                     │
   cambiar de centro │ (destino sin representante activo)
                     ▼
               ACTIVO en el otro centro
```

Reemplazar a la persona responsable = desactivar a la anterior + registrar a la nueva (dos
operaciones que ya existen).

## 5. Datos que cambian de forma (sin tablas nuevas)

### Representante en consultas y documentos (research O-04)

Donde los servicios devolvían `servicio: string`, devuelven `centroSalud: string` (nombre del centro).
Donde arman texto, usan:

```text
etiquetaRepresentante({ apellido, nombre, centroSalud }) → "Apellido, Nombre · Centro de salud"
```

| Servicio | Función | Campo que cambia |
|---|---|---|
| `catalogos/representantes.ts` | `listarRepresentantes`, `listarRepresentantesParaSelector` | `servicio` → `centroSalud`; `etiqueta` con el centro |
| `pedidos.ts` | `obtenerPedido`, `listarPedidos` | `servicio` → `centroSalud` |
| `distribuciones.ts` | `obtenerPedidoParaDistribuir`, `obtenerDistribucion`, `listarDistribuciones` | `servicio` → `centroSalud` |
| `reportes.ts` | `reporteDistribuciones`, `reportePedidos` | `servicio` → `centroSalud` |
| `inventario.ts` | kardex (texto del movimiento) | "Vale N · Apellido, Nombre · Centro" |
| `ia/informes.ts` | `datosInformeDistribuciones` | filas con `centroSalud` en lugar de `servicio` |

### Datos de entrada del informe IA de distribuciones (research O-05)

```text
porRepresentante: { centroSalud: string; representante: string; unidades: number }[]
```

Los informes guardados antes de F-009 conservan `servicio` en su `datos_entrada` (no se modifican,
principio IV); la tabla de datos muestra la columna según el formato que encuentre.

### Selector de centros para el formulario de representante (research O-06)

```text
listarCentrosParaRepresentante(idActual?) → { id, nombre }[]
  = centros activos sin representante activo
  + el centro actual del representante idActual (al modificar)
```

## 6. Respaldo (sin persistencia)

Resultado de `generarRespaldo()` (research O-08 a O-10):

| Campo | Ejemplo | Regla |
|---|---|---|
| `nombreArchivo` | `respaldo-almacen-oruro-2026-09-26-0715.sql` | fecha y hora de Oruro |
| `contenido` | texto SQL de `pg_dump` | solo si `pg_dump` terminó con código 0 y salida no vacía |

Contenido: las 18 tablas del sistema más `_prisma_migrations`, con esquema, datos y secuencias. No
incluye el código ni `.env` (FR-018).

## 7. Datos simulados (research O-07)

| Antes | Después |
|---|---|
| 1 centro ("Centro de Salud Oruro Central") y 5 representantes, uno por servicio | 5 centros (nombres de Raymond, Q-07; provisorios hasta entonces), **un representante activo cada uno** |
| Motivos de anulación con "servicio" | Con "centro de salud" |

Sin cambios: 25 productos en 6 categorías, 3 proveedores, 36 meses, asignación de productos a
representantes y cantidades generadas con la misma semilla.
