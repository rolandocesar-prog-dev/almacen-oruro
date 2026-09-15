# Modelo de datos · F-006 Reportes

**Fecha**: 2026-09-15 · **Plan**: [plan.md](plan.md)

**Cambios en el esquema: ninguno.** F-006 no crea ni modifica datos (FR-005): lee `compra`,
`compra_detalle`, `distribucion`, `distribucion_detalle`, `producto`, `movimiento_inventario`, `pedido`,
`pedido_detalle`, `usuario` y `configuracion`, todas creadas en la migración de F-001. Definición física:
[`specs/001-acceso-personal/data-model.md` §3 y §4](../001-acceso-personal/data-model.md).

Índices que sostienen los reportes (ya existen): `compra(fecha)`, `distribucion(fecha)`,
`pedido(estado, fecha)`, `movimiento_inventario(producto_id, fecha_documento)` y
`movimiento_inventario(fecha_documento)`.

---

## 1. Filtros comunes

| Campo | Esquema Zod | Por defecto | Mensajes |
|---|---|---|---|
| `desde` | `fechaDeFiltro(inicioDelMesEnCurso)` | día 1 del mes en curso | "Usa una fecha válida" |
| `hasta` | `fechaDeFiltro(hoyEnLaPaz)` | hoy | "La fecha «desde» no puede ser posterior a «hasta»" (en `hasta`) |
| `incluirAnulados` | `z.literal("si").optional()` → booleano | `false` | — |
| `pagina` | entero ≥ 1 con `.catch(1)` | 1 | — |

Sin filas en el rango, los totales de cada reporte valen 0 (`"0.00"` en el gasto de R-1) y la tabla muestra
"Sin resultados para los filtros aplicados" (regla común de la especificación).

Las fechas filtran por la **fecha del documento**, no por el momento de registro (RN-53, FR-002). Un valor
inválido en la URL toma el valor por defecto y la página avisa "Se muestra el mes en curso".

---

## 2. Reporte por reporte

### R-1 · Compras (FR-009)

| Parte | Detalle |
|---|---|
| Filtros | rango (obligatorio), `proveedor` (id opcional, incluye inactivos), `incluirAnulados` |
| Fila | fecha, Nº de factura, proveedor, ítems (`_count` de líneas), total (Bs, 2 decimales), estado |
| Orden | `fecha` e `id` ascendentes |
| Totales | `totalGastado` (suma de `compra.total` de las REGISTRADAS del rango, como texto con `toFixed(2)`; `"0.00"` si no hay ninguna) y `compras` (cuántas son) |
| Fuente | `compra` con `proveedor` y `_count.lineas`; agregado aparte para los totales (research E-02) |

### R-2 · Distribuciones (FR-010)

| Parte | Detalle |
|---|---|
| Filtros | rango (obligatorio), `representante`, `producto`, `incluirAnulados` |
| Fila | fecha, Nº de vale, representante ("Apellido, Nombre"), servicio, código y producto, unidad, cantidad, estado |
| Orden | `distribucion.fecha`, `distribucion.id` y `distribucion_detalle.id` ascendentes |
| Totales | por producto: `{ codigo, nombre, unidad, cantidad }`, solo de líneas de distribuciones REGISTRADAS del rango, ordenados por nombre; se agrupan en la base por línea de pedido y se suman por producto (research E-02) |
| Fuente | `distribucion_detalle` con su distribución (y el pedido, para el representante) y el producto de la línea del pedido (X-08) |

### R-3 · Existencias (FR-011)

| Parte | Detalle |
|---|---|
| Filtros | `categoria` (id opcional), `soloBajoMinimo` (casilla). **Sin rango de fechas**: es la situación al emitir (Historia 3 · E4) |
| Fila | código, producto, categoría, unidad, stock actual, stock mínimo, indicador: "Bajo mínimo" (activo y `stockActual ≤ stockMinimo`, RN-52), "Inactivo" o "—" |
| Agrupación | por categoría, y dentro por nombre (comparación en español) |
| Totales | `bajoMinimo` (cuántos productos) y `productos` (cuántas filas) |
| Fuente | `listarExistencias({ estado: "activos", categoriaId, soloBajoMinimo })` de F-003, que ya incluye los inactivos con stock |

### R-4 · Kardex (FR-012)

| Parte | Detalle |
|---|---|
| Filtros | `producto` (**obligatorio**), rango (con los valores por defecto comunes). Sin "incluir anulados": los movimientos de anulación son parte del kardex (Historia 4 · E4) |
| Fila | fecha del documento, tipo ("Entrada por compra", "Salida por distribución", "Anulación de compra", "Anulación de distribución"), documento de origen, entrada, salida, saldo resultante |
| Orden | `id` ascendente (orden de registro, RN-51) |
| Totales | `saldoInicial` (suma de movimientos con fecha del documento anterior a `desde`) y `saldoFinal` (suma hasta `hasta`), RN-53 |
| Fuente | `obtenerKardex(productoId, { desde, hasta })` de F-003 |
| Vacío | "Sin movimientos en el período", con saldo inicial y final iguales (caso borde) |

### R-5 · Pedidos (FR-013)

| Parte | Detalle |
|---|---|
| Filtros | rango (obligatorio), `estado` (`todos`, `pendientes`, `parciales`, `atendidos`, `anulados`), `representante`, `incluirAnulados` |
| Fila | Nº de pedido, fecha, representante, servicio, productos (líneas), % atendido (⌊entregadas × 100 / solicitadas⌋, como F-004), estado |
| Orden | `fecha` e `id` ascendentes |
| Totales | `porEstado`: cuántos pedidos hay en PENDIENTE, PARCIAL, ATENDIDO y ANULADO en el rango |
| Regla | con `estado = anulados` se muestran los anulados aunque `incluirAnulados` sea falso (FR-013) |

---

## 3. Encabezado del reporte (FR-006, FR-007)

| Dato | Origen |
|---|---|
| Nombre del sistema | "Almacén Regional Oruro" (constante) |
| Nombre del reporte | "Reporte de compras", "Reporte de distribuciones", "Reporte de existencias", "Kardex de {código} · {producto}", "Reporte de pedidos" |
| Filtros aplicados | texto armado con los filtros vigentes: "Del 01/09/2026 al 15/09/2026 · Proveedor: Distribuidora Andina · Incluye anuladas" |
| Emisión | `formatearFechaHora(new Date())` |
| Emitido por | `usuario.nombre` y `usuario.apellido` de `requerirSesion()` |
| Leyenda de demostración | "Datos simulados con fines de demostración" si `configuracion.modoDemostracion` (la marca la pone F-007) |

---

## 4. Lo que F-006 NO hace

| Regla | Cómo se garantiza |
|---|---|
| No modifica datos (FR-005) | `src/servicios/reportes.ts` no llama a `create`, `update`, `upsert`, `delete` ni `$executeRaw`, y no importa `registrarMovimiento`; se verifica leyendo el código (research E-12) |
| No suma anulados (FR-003) | los totales filtran por estado vigente, sin importar `incluirAnulados` (research E-02, E-03) |
| No inventa stock a una fecha pasada | R-3 es del momento de emisión; el pasado se consulta con R-4 (supuesto de la especificación) |

---

## 5. Relación con otras funcionalidades

| Funcionalidad | Qué aporta o consume |
|---|---|
| F-002 | catálogos para los filtros (proveedores, representantes, productos, categorías), incluidos los inactivos (FR-004) |
| F-003 | `listarExistencias` y `obtenerKardex` (R-3 y R-4); compras para R-1 |
| F-004 | pedidos y su porcentaje atendido para R-5 |
| F-005 | distribuciones y sus líneas para R-2; el grupo de rutas `(impresion)` y `BotonImprimir` |
| F-007 | escribe `configuracion.modoDemostracion`, que F-006 solo lee; los informes redactados citarán estos mismos números |
