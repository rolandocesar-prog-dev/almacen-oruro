---
description: "Lista de tareas de implementación de F-006 · Reportes"
---

# Tareas: F-006 · Reportes

**Entrada**: documentos de diseño de `specs/006-reportes/`

**Prerrequisitos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/acciones-f006.md](contracts/acciones-f006.md),
[quickstart.md](quickstart.md). F-001 a F-005 implementadas (`listarExistencias`, `obtenerKardex`,
`listarCategorias`, `listarProveedores`, `listarRepresentantes`, `listarProductos`, `fechaDeFiltro`,
`Paginacion`, `InsigniaDocumento`, `InsigniaPedido`, grupo de rutas `(impresion)` y `BotonImprimir`).

**Pruebas**: se incluyen (constitución, principio IX; [quickstart §2](quickstart.md#2-pruebas-automatizadas)).
Las de integración usan PostgreSQL real: **Docker Desktop debe estar abierto**.

**Sin migraciones ni dependencias nuevas** (plan, "Contexto técnico"). **Ningún reporte escribe datos**
(FR-005): el servicio solo consulta.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[US#]**: historia de usuario de [spec.md](spec.md)

| Etiqueta | Historia de spec.md | Prioridad |
|---|---|---|
| US1 | Historia 1 · Reporte de compras (R-1) | P2 |
| US2 | Historia 2 · Reporte de distribuciones (R-2) | P2 |
| US3 | Historia 3 · Reporte de existencias (R-3) | P2 |
| US4 | Historia 4 · Reporte de kardex (R-4) | P3 |
| US5 | Historia 5 · Reporte de pedidos (R-5) | P3 |
| US6 | Historia 6 · Imprimir un reporte | P2 |

**Patrón de páginas**: el de F-002 a F-005: `requerirSesion()` como primera instrucción de cada página y
layout; `searchParams` validado con Zod (valor inválido → valores por defecto y aviso); un componente de
filtros de cliente por reporte con su esquema (I-07); comentario con el FR o la RN en cada regla. **F-006 no
tiene Server Actions**: los filtros viajan por la URL (contrato §2).

---

## Fase 1: Preparación

**Propósito**: confirmar que el punto de partida está sano antes de tocar código compartido.

- [X] T001 Verificar el entorno: `docker info` responde, el contenedor `almacen-oruro-postgres` está *healthy*, y `npm run lint`, `npm run typecheck` y `npm test` terminan sin errores con las 427 pruebas de F-001 a F-005 en verde; anotar el resultado para compararlo al final

---

## Fase 2: Fundamentos (bloquea todas las historias)

**Propósito**: los esquemas de filtros, el encabezado y la tabla de impresión, la marca de demostración y la
navegación que usan los cinco reportes.

**⚠️ CRÍTICO**: ninguna historia empieza antes de terminar esta fase.

- [X] T002 [P] Crear `tests/unitarios/esquemas-reportes.test.ts` (debe fallar antes de T003) con los casos de `textoDeFiltros(partes)`: `[["Del", "01/09/2026"], …]` no es la forma; recibe `{ etiqueta, valor }[]` y descarta las partes sin valor, une con " · " y devuelve "Del 01/09/2026 al 15/09/2026 · Proveedor: Distribuidora Andina · Incluye anuladas"; con solo el rango devuelve "Del 01/09/2026 al 15/09/2026"; con una lista vacía devuelve "Sin filtros"
- [X] T003 Crear `src/esquemas/reportes.ts` (data-model §1 y §2, research E-08) con: `rangoDeReporte` reutilizable (`desde` = `fechaDeFiltro(inicioDelMesEnCurso)`, `hasta` = `fechaDeFiltro(hoyEnLaPaz)`, `refine` de `desde ≤ hasta` con "La fecha «desde» no puede ser posterior a «hasta»" en `hasta`); `casillaSi` (`z.literal("si").optional()` → booleano) para `incluirAnulados` y `soloBajoMinimo`; `paginaDeReporte` (entero ≥ 1 con `.catch(1)`); los cinco esquemas `esquemaReporteCompras` (`proveedor` id opcional con `.catch(undefined)`), `esquemaReporteDistribuciones` (`representante`, `producto`), `esquemaReporteExistencias` (`categoria`, `soloBajoMinimo`, **sin rango**), `esquemaReporteKardex` (`producto` opcional en el esquema —la página exige elegirlo— y rango) y `esquemaReportePedidos` (`estado` con `z.enum(["todos", "pendientes", "parciales", "atendidos", "anulados"]).catch("todos")`, `representante`); `textoDeFiltros(partes: { etiqueta: string; valor?: string | null }[])`; y los tipos `FiltroReporteCompras`, `FiltroReporteDistribuciones`, `FiltroReporteExistencias`, `FiltroReporteKardex` y `FiltroReportePedidos`
- [X] T004 [P] Crear `src/servicios/configuracion.ts` con `obtenerConfiguracion()` que lee la fila única `configuracion` (id 1) y devuelve `{ modoDemostracion: boolean; datosSimuladosEn: Date | null }`, con `modoDemostracion: false` si la fila no existe, y comentario de que F-006 solo lee la marca y F-007 la escribe (research E-07); crear `tests/integracion/configuracion.test.ts`: sin fila devuelve `false`; con `prisma.configuracion.create({ data: { id: 1, modoDemostracion: true, datosSimuladosEn: new Date() } })` devuelve `true` y la fecha
- [X] T005 [P] Crear `src/componentes/reportes/encabezado-reporte.tsx` (servidor) con `EncabezadoReporte({ titulo, filtros, emitidoPor, demostracion })`: "Almacén Regional Oruro", el título del reporte, la línea de filtros aplicados, "Emitido el {dd/mm/aaaa hh:mm} por {Nombre Apellido}" con `formatearFechaHora(new Date())` y, si `demostracion`, la leyenda "Datos simulados con fines de demostración" destacada (FR-006, FR-007); y `src/componentes/reportes/tabla-reporte.tsx` con `TablaReporte({ encabezados, children, vacio })`: tabla **sin** contenedor con `overflow` para que el `<thead>` se repita en cada hoja (research E-06), con comentario de por qué no usa la `Tabla` común, y mensaje "Sin resultados para los filtros aplicados" cuando no hay filas
- [X] T006 [P] Mover `BotonImprimir` de `src/app/(impresion)/distribuciones/[id]/vale/boton-imprimir.tsx` a `src/componentes/ui/boton-imprimir.tsx` (research E-10) y actualizar el vale; sumar **Reportes** (`/reportes`) después de Distribuciones en el menú de `src/app/(sistema)/layout.tsx` y su acceso en `src/app/(sistema)/page.tsx` ("Consultar e imprimir compras, distribuciones, existencias, kardex y pedidos"); mostrar en el layout una banda "Datos simulados con fines de demostración" cuando `obtenerConfiguracion()` la marca (aclaración del 13/09); y crear `src/app/(sistema)/reportes/page.tsx` con `requerirSesion()` y una tarjeta por reporte (nombre y qué responde), con enlaces a los cinco

**Punto de control**: T002 y la prueba de T004 en verde; `npm test` y `npm run typecheck` sin errores.

---

## Fase 3: Historia 1 · Reporte de compras (R-1) (Prioridad: P2) 🎯 MVP

**Objetivo**: ver e imprimir las compras de un período con su total gastado, sin contar las anuladas.

**Prueba independiente**: quickstart §3, pasos 2 a 5.

- [X] T007 [P] [US1] Agregar a `tests/unitarios/esquemas-reportes.test.ts` los casos de `esquemaReporteCompras` (por defecto `desde` = inicio del mes en curso, `hasta` = hoy, `proveedor` ausente, `incluirAnulados` falso y `pagina` 1; `incluirAnulados: "si"` → `true` y cualquier otro valor → `false`; proveedor inválido → ausente; `desde > hasta` → "La fecha «desde» no puede ser posterior a «hasta»") y crear `tests/integracion/reporte-compras.test.ts` con `registrarCompra` y `anularCompra` reales: 3 compras vigentes de 100,00, 250,50 y 49,50 y una anulada de 500,00 en el mes, más una compra del mes anterior; sin "incluir anuladas" las filas son 3, ordenadas por fecha e `id` ascendentes, con `{ id, fecha, nroFactura, proveedor, items, total, estado }` y `total` como texto con 2 decimales; con "incluir anuladas" son 4 y la anulada trae `estado: "ANULADA"`; en **ambos casos** `totales` es `{ totalGastado: "400.00", compras: 3 }` (Historia 1 · E2, SC-001, FR-003); el filtro por proveedor deja solo sus compras y recalcula los totales (E3); la compra del mes anterior queda fuera del rango (RN-53); `todas: true` devuelve todas las filas sin paginar y `pagina: 2` respeta `FILAS_POR_PAGINA_REPORTE`; un rango sin compras devuelve `filas: []` y `totales: { totalGastado: "0.00", compras: 0 }` (regla de resultado vacío); un rango de fechas futuras se acepta y devuelve vacío (caso borde)
- [X] T008 [US1] Crear `src/servicios/reportes.ts` con el comentario de cabecera (solo lectura, FR-005; totales siempre sobre documentos vigentes, FR-003; fechas por fecha del documento, RN-53), `FILAS_POR_PAGINA_REPORTE = 100` y `reporteCompras({ desde, hasta, proveedorId, incluirAnulados, pagina = 1, todas = false })` según research E-01 a E-04: `where` con `fecha` entre `aFechaDocumento(desde)` y `aFechaDocumento(hasta)`, `proveedorId` y, si no se incluyen anuladas, `estado: "REGISTRADA"`; `orderBy: [{ fecha: "asc" }, { id: "asc" }]`; `skip`/`take` salvo con `todas`; `include` de proveedor y `_count.lineas`; y los totales con `compra.aggregate({ _sum: { total }, _count: true, where: { …rango, proveedorId, estado: "REGISTRADA" } })`, devolviendo `{ filas, total, totales: { totalGastado, compras } }` con `totalGastado` como texto (`_sum.total?.toFixed(2) ?? "0.00"`, porque sin filas Prisma devuelve `null`) y el `total` de cada fila también con `toFixed(2)`
- [X] T009 [US1] Crear `src/app/(sistema)/reportes/compras/page.tsx` y `filtros-compras.tsx` (cliente, con `esquemaReporteCompras`): filtros Desde, Hasta, Proveedor (`listarProveedores({ estado: "todos" })`, inactivos marcados, FR-004) y la casilla "Incluir anuladas"; `EncabezadoReporte` con el título "Reporte de compras" y `textoDeFiltros`; `TablaReporte` con Fecha, Nº de factura, Proveedor, Ítems, Total (con `formatearBolivianos`, como la ficha de compra, FR-008) y Estado (`InsigniaDocumento`); bloque de totales "Total gastado: Bs … · 3 compras (solo vigentes)"; aviso si los filtros son inválidos; `Paginacion` conservando los filtros; enlaces "← Volver a reportes" e "Imprimir" a `/reportes/compras/imprimir` con los mismos parámetros
- [X] T010 [US1] Crear `src/app/(impresion)/reportes/compras/imprimir/page.tsx`: `requerirSesion()`, mismos `searchParams` y esquema, `reporteCompras({ …filtro, todas: true })`, `EncabezadoReporte`, `TablaReporte` y los totales al final; controles "← Volver" e `BotonImprimir` dentro de un bloque `print:hidden` (research E-05)

**Punto de control**: T007 en verde; quickstart pasos 2 a 5.

---

## Fase 4: Historia 2 · Reporte de distribuciones (R-2) (Prioridad: P2)

**Objetivo**: ver e imprimir qué se entregó en un período, con el total por producto.

**Prueba independiente**: quickstart §3, pasos 6 y 7.

- [X] T011 [P] [US2] Agregar a `tests/unitarios/esquemas-reportes.test.ts` los casos de `esquemaReporteDistribuciones` (valores por defecto; `representante` y `producto` inválidos → ausentes) y crear `tests/integracion/reporte-distribuciones.test.ts` con `registrarDistribucion` y `anularDistribucion` reales: dos distribuciones vigentes de "Lavandina 1 L" por 6 y 4 unidades y una anulada de 5 en el mes; las filas son una por **línea entregada**, ordenadas por fecha, `id` de distribución e `id` de línea, con `{ fecha, nroVale, representante: "Apellido, Nombre", servicio, codigo, producto, unidad, cantidad, estado }`; `totales.porProducto` trae `{ codigo, nombre, unidad, cantidad: 10 }` para Lavandina (Historia 2 · E2, SC-003) tanto sin como con "incluir anuladas" (la anulada aparece marcada y no suma, E4); los filtros por representante y por producto combinados dejan solo las líneas que cumplen ambos y recalculan los totales (E3)
- [X] T012 [US2] Agregar a `src/servicios/reportes.ts` `reporteDistribuciones({ desde, hasta, representanteId, productoId, incluirAnulados, pagina, todas })` según data-model §2: consulta sobre `distribucionDetalle` con `where` por `distribucion.fecha` en el rango, `distribucion.pedido.representanteId`, `pedidoDetalle.productoId` y, si no se incluyen anuladas, `distribucion.estado: "REGISTRADA"`; `orderBy: [{ distribucion: { fecha: "asc" } }, { distribucionId: "asc" }, { id: "asc" }]`; `include` de la distribución con su pedido y representante, y del producto de la línea del pedido (X-08); totales por producto agrupando en la base con `distribucionDetalle.groupBy({ by: ["pedidoDetalleId"], _sum: { cantidad }, where: { …rango, distribucion: { estado: "REGISTRADA" }, … } })` y sumando por producto con una consulta de esas líneas de pedido (research E-02: se recorren decenas de líneas de pedido, no miles de líneas entregadas), ordenados por nombre con `compararEnEspanol`; sin líneas en el rango, `porProducto` es una lista vacía
- [X] T013 [US2] Crear `src/app/(sistema)/reportes/distribuciones/page.tsx` y `filtros-distribuciones.tsx`: filtros Desde, Hasta, Representante y Producto (ambos con inactivos, FR-004) e "Incluir anuladas"; tabla con Fecha, Nº de vale, Representante, Servicio, Código, Producto, Unidad, Cantidad y Estado; bloque "Total entregado por producto" con una línea por producto ("Lavandina 1 L: 10 BID5"); `Paginacion`; enlaces a reportes y a `/reportes/distribuciones/imprimir`
- [X] T014 [US2] Crear `src/app/(impresion)/reportes/distribuciones/imprimir/page.tsx` con el mismo patrón de T010 y `todas: true`

**Punto de control**: T011 en verde; quickstart pasos 6 y 7.

---

## Fase 5: Historia 3 · Reporte de existencias (R-3) (Prioridad: P2)

**Objetivo**: imprimir el estado actual del inventario, completo o solo lo que está bajo mínimo.

**Prueba independiente**: quickstart §3, pasos 8 y 9.

- [X] T015 [P] [US3] Agregar a `tests/unitarios/esquemas-reportes.test.ts` los casos de `esquemaReporteExistencias` (sin rango de fechas; `categoria` inválida → ausente; `soloBajoMinimo: "si"` → `true`) y crear `tests/integracion/reporte-existencias.test.ts`: con dos categorías, productos sobre y bajo el mínimo y un producto inactivo con stock, las filas son las mismas que `listarExistencias({ estado: "activos" })` (FR-011) con `{ codigo, nombre, categoria, unidad, stockActual, stockMinimo, indicador }` donde `indicador` es "Bajo mínimo", "Inactivo" o "—" (RN-52); vienen agrupadas por categoría (`grupos: { categoria, filas }[]`) ordenadas por nombre en español; `soloBajoMinimo` deja solo los activos con `stockActual ≤ stockMinimo` y `totales.bajoMinimo` los cuenta; el filtro por categoría deja solo sus productos
- [X] T016 [US3] Agregar a `src/servicios/reportes.ts` `reporteExistencias({ categoriaId, soloBajoMinimo })` que llama a `listarExistencias({ estado: "activos", categoriaId, soloBajoMinimo })` de F-003, arma el `indicador` de cada fila, agrupa por categoría y devuelve `{ grupos, totales: { productos, bajoMinimo } }`, con comentario de por qué reutiliza la consulta de existencias (FR-011, research E-01)
- [X] T017 [US3] Crear `src/app/(sistema)/reportes/existencias/page.tsx` y `filtros-existencias.tsx`: filtros Categoría (`listarCategorias({ estado: "todos" })`) y la casilla "Solo bajo mínimo"; encabezado sin rango de fechas ("Situación al momento de la emisión", Historia 3 · E4); una `TablaReporte` por categoría con Código, Producto, Unidad, Stock actual, Stock mínimo e Indicador; totales "{n} productos · {m} bajo mínimo"; enlaces a reportes y a `/reportes/existencias/imprimir`
- [X] T018 [US3] Crear `src/app/(impresion)/reportes/existencias/imprimir/page.tsx` con el mismo patrón de T010 (sin paginación: existencias son unos 25 productos)

**Punto de control**: T015 en verde; quickstart pasos 8 y 9.

---

## Fase 6: Historia 4 · Reporte de kardex (R-4) (Prioridad: P3)

**Objetivo**: imprimir el kardex de un producto con su saldo inicial y final.

**Prueba independiente**: quickstart §3, paso 10.

- [X] T019 [P] [US4] Agregar a `tests/unitarios/esquemas-reportes.test.ts` los casos de `esquemaReporteKardex` (producto ausente o inválido → `undefined`; rango por defecto) y crear `tests/integracion/reporte-kardex.test.ts`: con una compra anterior al rango y movimientos dentro (compra y distribución real), `reporteKardex(productoId, { desde, hasta })` devuelve `saldoInicial` con los movimientos anteriores, los movimientos del rango con `{ fechaDocumento, tipo, documento, entrada, salida, saldoResultante }` en orden de `id` (RN-51) y `saldoFinal`; con el rango terminando hoy, `saldoFinal` es igual al `stockActual` del producto (SC-002, Historia 4 · E2); los movimientos de anulación aparecen siempre (E4); un producto sin movimientos en el rango devuelve la lista vacía con `saldoInicial` igual a `saldoFinal` (caso borde); un producto inexistente devuelve `null`
- [X] T020 [US4] Agregar a `src/servicios/reportes.ts` `reporteKardex(productoId, { desde, hasta })` que reutiliza `obtenerKardex` de F-003 y devuelve `{ producto, movimientos, saldoInicial, saldoFinal }` o `null`, con comentario de que los saldos ya cumplen RN-53 y de que este reporte no ofrece "incluir anulados" porque las anulaciones son parte del kardex (FR-012)
- [X] T021 [US4] Crear `src/app/(sistema)/reportes/kardex/page.tsx` y `filtros-kardex.tsx`: filtros Producto (obligatorio, `listarProductos({ estado: "todos" })` con inactivos marcados), Desde y Hasta; si no hay producto elegido, muestra "Elige un producto para ver su kardex" y **no consulta nada** (Historia 4 · E3); si lo hay, título "Kardex de {código} · {producto}", saldo inicial arriba, tabla con Fecha, Tipo, Documento, Entrada, Salida y Saldo, y saldo final al pie; "Sin movimientos en el período" cuando corresponde; enlaces a reportes y a `/reportes/kardex/imprimir`
- [X] T022 [US4] Crear `src/app/(impresion)/reportes/kardex/imprimir/page.tsx` con el mismo patrón de T010; sin producto elegido, muestra el mismo aviso y ningún dato

**Punto de control**: T019 en verde; quickstart paso 10.

---

## Fase 7: Historia 5 · Reporte de pedidos (R-5) (Prioridad: P3)

**Objetivo**: ver e imprimir los pedidos de un período con el conteo por estado.

**Prueba independiente**: quickstart §3, pasos 11 y 12.

- [X] T023 [P] [US5] Agregar a `tests/unitarios/esquemas-reportes.test.ts` los casos de `esquemaReportePedidos` (estado por defecto `todos`; estado inválido → `todos`; representante inválido → ausente) y crear `tests/integracion/reporte-pedidos.test.ts` con pedidos creados por los servicios reales: 3 PENDIENTE, 2 PARCIAL, 4 ATENDIDO y 1 ANULADO en el mes; sin "incluir anulados" las filas son 9 y con la opción, 10 (el anulado marcado); `totales.porEstado` es `{ PENDIENTE: 3, PARCIAL: 2, ATENDIDO: 4, ANULADO: 1 }` en ambos casos (Historia 5 · E2); con `estado: "anulados"` aparece el anulado **sin** marcar "incluir anulados" (E3, FR-013); el filtro por representante deja solo sus pedidos (E4); cada fila trae `{ id, fecha, representante, servicio, productos, porcentajeAtendido, estado }` con el porcentaje redondeado hacia abajo como en F-004; un pedido del rango atendido por una distribución **posterior** al rango muestra ese porcentaje igual, porque refleja lo entregado a la fecha de emisión (caso borde); un rango sin pedidos devuelve `porEstado` en 0 para los cuatro estados
- [X] T024 [US5] Agregar a `src/servicios/reportes.ts` `reportePedidos({ desde, hasta, estado, representanteId, incluirAnulados, pagina, todas })` según data-model §2: `where` con `fecha` en el rango, `representanteId` y el estado elegido; si el estado es `todos` y no se incluyen anulados, excluye `ANULADO`; `orderBy: [{ fecha: "asc" }, { id: "asc" }]`; `_count.lineas`; porcentaje atendido con `pedidoDetalle.groupBy` de los pedidos de la página (como `listarPedidos` de F-004); y `totales.porEstado` con `pedido.groupBy({ by: ["estado"], _count: true, where: { …rango, representanteId } })`, que cuenta los cuatro estados del rango sin importar los filtros de estado o de anulados y devuelve 0 en los estados sin pedidos
- [X] T025 [US5] Crear `src/app/(sistema)/reportes/pedidos/page.tsx` y `filtros-pedidos.tsx`: filtros Desde, Hasta, Estado ("Todos", "Pendientes", "Parciales", "Atendidos", "Anulados"), Representante e "Incluir anulados"; tabla con Nº, Fecha, Representante, Servicio, Productos, % atendido y Estado (`InsigniaPedido`); totales "Pendientes: 3 · Parciales: 2 · Atendidos: 4 · Anulados: 1"; `Paginacion`; enlaces a reportes y a `/reportes/pedidos/imprimir`
- [X] T026 [US5] Crear `src/app/(impresion)/reportes/pedidos/imprimir/page.tsx` con el mismo patrón de T010 y `todas: true`

**Punto de control**: T023 en verde; quickstart pasos 11 y 12.

---

## Fase 8: Historia 6 · Imprimir un reporte (Prioridad: P2)

**Objetivo**: que cualquier hoja impresa diga qué reporte es, con qué filtros, cuándo se emitió y quién la
emitió, sin menús ni botones.

**Prueba independiente**: quickstart §3, pasos 13 y 14.

- [ ] T027 [P] [US6] Ampliar `tests/unitarios/esquemas-reportes.test.ts` con el texto de filtros de cada reporte (compras con proveedor e "Incluye anuladas"; distribuciones con representante y producto; existencias con categoría y "Solo bajo mínimo"; kardex con producto y rango; pedidos con estado). La leyenda de demostración en pantalla y en la hoja se verifica en el recorrido (T033, paso 14) y la lectura de la marca ya la prueba T004
- [ ] T028 [US6] Revisar y completar las cinco vistas de impresión: `EncabezadoReporte` con nombre del sistema, nombre del reporte, filtros aplicados (incluido "Incluye anuladas"), emisión y usuario; totales al final de cada una; controles solo dentro de bloques `print:hidden`; ampliar el ancho del layout `src/app/(impresion)/layout.tsx` para las tablas de reporte (el `max-w-3xl` actual se pensó para el vale), sin cambiar cómo se ve el vale; agregar en `src/app/globals.css` las reglas de impresión mínimas (`@media print`: fondo blanco, sin sombras, `thead { display: table-header-group }` explícito y saltos de página que no corten una fila) con comentario de que hacen que el encabezado de columnas se repita en cada hoja (Historia 6 · E2)

**Punto de control**: T027 en verde; quickstart pasos 13 y 14.

---

## Fase 9: Cierre y aspectos transversales

- [ ] T029 [P] Crear `tests/integracion/reportes-invariantes.test.ts`: leyendo `src/servicios/reportes.ts` con `readFileSync`, verifica que no contiene `.create(`, `.update(`, `.updateMany(`, `.upsert(`, `.delete(`, `.deleteMany(`, `$executeRaw` ni `registrarMovimiento` (FR-005); que todas sus exportaciones de función empiezan con `reporte` (salvo `FILAS_POR_PAGINA_REPORTE`); y que tras generar los cinco reportes sobre datos de prueba, el conteo de filas de `compra`, `distribucion`, `pedido`, `movimiento_inventario` y `producto` no cambió
- [ ] T030 [P] Revisar con `grep` que todas las páginas de `src/app/(sistema)/reportes/` y `src/app/(impresion)/reportes/` llaman a `requerirSesion` como primera instrucción y que todo `searchParams` se valida con un esquema Zod; corregir lo que falte
- [ ] T031 [P] Revisar accesibilidad e impresión: etiquetas en todos los filtros, casillas con etiqueta asociada, tablas de pantalla con desplazamiento propio y tablas de impresión sin él, indicadores con texto además de color, y las cinco vistas a 375 px y en A4 vertical
- [ ] T032 Ejecutar `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`; confirmar que las 427 pruebas de F-001 a F-005 siguen en verde junto con las de F-006 y corregir errores y advertencias
- [ ] T033 Ejecutar el recorrido de `specs/006-reportes/quickstart.md` §3 con el método de `docs/decisiones.md` I-15, I-22, I-29 e I-35 (script `.mts` en el scratchpad que carga compras, pedidos y distribuciones de dos meses con los servicios reales en la base de pruebas y crea la sesión de prueba; servidor de desarrollo contra esa base; páginas revisadas con `Invoke-WebRequest` y la cookie `sesion` desde un `.ps1` en UTF-8 con BOM; encender y apagar `modoDemostracion` para el paso 14; al terminar, detener el servidor y borrar el archivo del token), medir SC-005 con el rango más amplio disponible —dejándolo anotado como pendiente de medición real hasta que el generador de F-007 cargue los 36 meses— y anotar en una sección "4. Estado de la validación" qué se verificó y qué queda pendiente (la vista previa de impresión y SC-004 y SC-007 para el recorrido con Raymond)
- [ ] T034 [P] Actualizar `docs/decisiones.md` con la sección "Reportes (plan de F-006, 15/09/2026)" que resuma E-01 a E-12 de `specs/006-reportes/research.md` en el formato de tabla de V-01 a V-12, y con las decisiones de implementación nuevas (I-36 en adelante); `specs/001-acceso-personal/contracts/rutas.md` sumando `/reportes` y `/reportes/{reporte}/imprimir`; `docs/instalacion.md` con la sección "9. Consultar e imprimir reportes"; y `docs/especificacion/README.md` marcando F-006 como implementada en el cronograma

---

## Dependencias y orden de ejecución

### Entre fases

- **Preparación (fase 1)** → **Fundamentos (fase 2)** → historias → **Cierre (fase 9)**.
- En la fase 2, T004, T005 y T006 tocan archivos distintos y van en paralelo; T003 va después de T002 (la
  prueba debe fallar antes) y T006 necesita T004 (la banda de demostración usa `obtenerConfiguracion`).

### Entre historias

| Historia | Depende de | Motivo |
|---|---|---|
| US1 Compras | Fundamentos | Crea `src/servicios/reportes.ts` y el patrón de página + impresión que copian las demás |
| US2 Distribuciones | US1 | Agrega su función al mismo servicio y repite el patrón de página |
| US3 Existencias | US1 | Ídem; además reutiliza `listarExistencias` de F-003 |
| US4 Kardex | US1 | Ídem; reutiliza `obtenerKardex` de F-003 |
| US5 Pedidos | US1 | Ídem |
| US6 Imprimir | US1 a US5 | Revisa las cinco vistas de impresión y el encabezado común |

US2 a US5 son independientes entre sí, pero todas editan `src/servicios/reportes.ts` y
`tests/unitarios/esquemas-reportes.test.ts`: van en secuencia, cada una en su sección del archivo. Sus
páginas y pruebas de integración sí son archivos distintos.

### Dentro de cada historia

Pruebas [P] primero (las de integración deben fallar antes del servicio) → servicio → página de pantalla →
página de impresión. Commit al terminar cada fase, sin líneas de autoría.

---

## Ejemplos de trabajo en paralelo

```text
# Fase 2:
T004 src/servicios/configuracion.ts + su prueba
T005 componentes de encabezado y tabla de reporte
T006 botón compartido, menú, inicio, banda e índice /reportes

# Al empezar cada historia (pruebas antes que el servicio):
T007 (US1) · T011 (US2) · T015 (US3) · T019 (US4) · T023 (US5)

# Cierre:
T029 invariantes · T030 sesión y filtros · T031 accesibilidad e impresión
```

---

## Estrategia de implementación

### MVP (Historia 1)

Fases 1, 2 y 3: el reporte de compras en pantalla y en papel, con su total gastado y el encabezado completo.
Con eso queda demostrado el patrón que repiten los otros cuatro.

### Entrega incremental

| Paso | Fases | Resultado verificable |
|---|---|---|
| 1 | 1 y 2 | Esquemas, encabezado, tabla de impresión, marca de demostración y menú; F-001 a F-005 intactas |
| 2 | 3 (US1) | R-1 con totales que ignoran las anuladas |
| 3 | 4 (US2) | R-2 con el total por producto |
| 4 | 5 (US3) | R-3 agrupado por categoría |
| 5 | 6 (US4) | R-4 con saldo inicial y final |
| 6 | 7 (US5) | R-5 con el conteo por estado |
| 7 | 8 (US6) | Las cinco hojas impresas con encabezado y leyenda de demostración |
| 8 | 9 | Invariantes, calidad, validación y documentación |

**Orden de corte** (`00-decisiones-y-alcance.md` §5): si el día se atrasa, se posterga primero **US5**
(pedidos, P3) y después **US4** (kardex, P3). R-1, R-2, R-3 y la impresión son P2.

---

## Notas

- [P] = archivos distintos y sin dependencias pendientes.
- Ningún reporte escribe datos: el servicio solo consulta (FR-005), y T029 lo verifica.
- Cada regla de negocio lleva en el código un comentario con su FR o RN y el porqué (principio I).
- Si aparece algo que la especificación no cubre, se corrige primero `spec.md`; no se improvisa en el código.
