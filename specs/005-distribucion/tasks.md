---
description: "Lista de tareas de implementación de F-005 · Distribución"
---

# Tareas: F-005 · Distribución

**Entrada**: documentos de diseño de `specs/005-distribucion/`

**Prerrequisitos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/acciones-f005.md](contracts/acciones-f005.md),
[quickstart.md](quickstart.md). F-001 a F-004 implementadas (`registrarMovimiento`, `bloquearProductos`,
`verificarConsistenciaInventario`, `bloquearPedido`, `recalcularEstadoPedido`, `listarPedidos`,
`erroresPorRuta`, `mensajesPorLinea`, `cantidadEntera`, fechas de documento, `Paginacion`, patrón del
formulario con líneas y de la anulación con motivo).

**Pruebas**: se incluyen (constitución, principio IX; [quickstart §2](quickstart.md#2-pruebas-automatizadas)).
Las de integración usan PostgreSQL real: **Docker Desktop debe estar abierto**.

**Sin migraciones ni dependencias nuevas** (plan, "Contexto técnico").

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[US#]**: historia de usuario de [spec.md](spec.md)

| Etiqueta | Historia de spec.md | Prioridad |
|---|---|---|
| US1 | Historia 1 · Registrar una distribución | P1 |
| US2 | Historia 2 · Completar un pedido en varias entregas | P1 |
| US3 | Historia 3 · Listar distribuciones y ver su detalle | P1 |
| US4 | Historia 4 · Anular una distribución mal registrada | P2 |
| US5 | Historia 5 · Imprimir el vale | P3 |

**Patrón de páginas y acciones**: el de F-002 a F-004: `requerirSesion()` como primera instrucción de
cada página, layout y acción; `searchParams` validado con Zod (valor inválido → valores por defecto);
acciones en el orden requerirSesion → Zod → servicio → `aResultadoDeError` → `revalidatePath` → redirigir
o devolver resultado; comentario con la RN o FR en cada regla. **El stock solo cambia con
`registrarMovimiento`** y **el estado del pedido solo con `recalcularEstadoPedido`**. Orden de bloqueo:
**primero el pedido, después los productos**, y se bloquea antes de insertar filas que los referencien.

---

## Fase 1: Preparación

**Propósito**: confirmar que el punto de partida está sano antes de tocar código compartido.

- [ ] T001 Verificar el entorno: `docker info` responde, el contenedor `almacen-oruro-postgres` está *healthy*, y `npm run lint`, `npm run typecheck` y `npm test` terminan sin errores con las 365 pruebas de F-001 a F-004 en verde; anotar el resultado para compararlo al final

---

## Fase 2: Fundamentos (bloquea todas las historias)

**Propósito**: la situación de cada línea, la base del servicio, los ayudantes de prueba y la navegación que
usan las cinco historias.

**⚠️ CRÍTICO**: ninguna historia empieza antes de terminar esta fase.

- [ ] T002 [P] Crear `tests/unitarios/situacion-linea.test.ts` (debe fallar antes de T003): `situacionDeLinea(pendiente, stock)` devuelve `{ situacion: "completa", maximoEntregable: 0 }` con pendiente 0 (con cualquier stock); `{ situacion: "sin-stock", maximoEntregable: 0 }` con pendiente 5 y stock 0; `{ situacion: "entregable", maximoEntregable: 6 }` con pendiente 10 y stock 6 (Historia 1 · E2); `maximoEntregable: 5` con pendiente 5 y stock 20 (E4); `maximoEntregable: 4` con pendiente 4 y stock 4
- [ ] T003 Crear `src/servicios/distribuciones.ts` con comentario de cabecera (distribución inmutable salvo la anulación, D-16; regla "primero el pedido, después los productos", research V-01; el stock solo por `registrarMovimiento`), `situacionDeLinea(pendiente: number, stock: number)` según data-model §2 (RN-36, FR-002; `maximoEntregable = Math.min(pendiente, stock)`), `buscarValeVigente(nroVale: string)` (`distribucion.findFirst({ where: { nroVale, estado: "REGISTRADA" }, select: { id: true } })`, RN-31), `DISTRIBUCIONES_POR_PAGINA = 50` y `OPCIONES_TRANSACCION = { maxWait: 10_000, timeout: 10_000 }` con el comentario de research K-12
- [ ] T004 [P] Crear `tests/ayudantes/distribuciones.ts` con `prepararPedidoConStock({ lineas: { solicitada: number; stock: number; nombre?: string; activo?: boolean }[], fechaPedido = "2026-09-01" })`: crea usuario, proveedor, representante y un producto por línea con `crearProductoDePrueba`; deja el stock con **una sola** compra real `registrarCompra` (proveedor propio, factura única, fecha "2026-09-01", una línea por producto con `stock > 0`; si ninguno tiene stock, no compra; nunca escribe `stockActual` a mano, principio III); registra el pedido con `registrarPedido`; si `activo === false`, desactiva el producto **después** de registrar el pedido con `prisma.producto.update` (caso borde de valores inactivos, I-23); devuelve `{ usuario, representante, productos, pedido }` con `pedido.lineas` (id, productoId) ordenadas por `id`; y `datosDistribucion(pedido, cantidades: (number | "")[], cambios?)` que arma `{ pedidoId, nroVale: "500", fecha: "2026-09-10", observacion: undefined, lineas: [{ pedidoDetalleId, cantidad }] }` con una entrada por línea en el orden de `pedido.lineas` (research V-02)
- [ ] T005 [P] Extraer `InsigniaCompra` de `src/app/(sistema)/compras/insignia-compra.tsx` a `src/componentes/ui/insignia-documento.tsx` como `InsigniaDocumento({ estado: "REGISTRADA" | "ANULADA" })` con los textos "Registrada" y "Anulada" y los mismos colores, con comentario de que compras y distribuciones comparten el estado de documento (I-28); usarla en `src/app/(sistema)/compras/page.tsx`, `src/app/(sistema)/compras/[id]/page.tsx` y `src/app/(sistema)/pedidos/[id]/page.tsx` y borrar el archivo viejo; sumar **Distribuciones** (`/distribuciones`) después de Pedidos en el menú de `src/app/(sistema)/layout.tsx` y su acceso en `src/app/(sistema)/page.tsx` ("Entregar productos para atender los pedidos y anular entregas mal registradas")

**Punto de control**: T002 en verde; `npm test` y `npm run typecheck` sin errores.

---

## Fase 3: Historia 1 · Registrar una distribución (Prioridad: P1) 🎯 MVP

**Objetivo**: registrar una distribución completa o nada, que baja el stock con su kardex, sube lo entregado
y recalcula el estado del pedido, sin superar pendiente ni stock y sin repetir el vale.

**Prueba independiente**: quickstart §3, pasos 2 a 7.

### Pruebas de la Historia 1

- [ ] T006 [P] [US1] Crear `tests/unitarios/esquema-distribucion.test.ts` para `esquemaDistribucion`: acepta pedido, vale "0500" (se conserva igual, caso borde), fecha de hoy, observación vacía → `undefined` y 3 líneas con cantidades "6", "" y "5" (la vacía queda `cantidad: undefined` en su posición); vale vacío → "Escribe el Nº de vale"; vale "12a" o de 21 dígitos → "El Nº de vale solo admite dígitos, hasta 20"; fecha de mañana → "La fecha de la distribución no puede ser futura"; observación de 201 → "La observación admite hasta 200 caracteres"; cantidad "0", "-1", "2.5" y "1000001" → "La cantidad debe ser un número entero entre 1 y 1.000.000" en `lineas.{i}.cantidad`; todas vacías → "Entrega al menos un producto: escribe la cantidad en una línea" en `lineas`; la misma `pedidoDetalleId` en las filas 1 y 3 → "Línea 3: esa línea del pedido ya está en la línea 1" en `lineas.2.pedidoDetalleId` (FR-003); `estado`, `usuarioId` y `representanteId` enviados no aparecen en el resultado; y `esquemaAvisoDistribucion` (`aviso=registrada` → `"registrada"`, otro valor → `undefined`)
- [ ] T007 [P] [US1] Crear `tests/integracion/distribuciones-registro.test.ts` con `prepararPedidoConStock`: (E2) pedido 10 con stock 6, entregar 6 → stock 0, un `SALIDA_DISTRIBUCION` de −6 con `saldoResultante` 0, `fechaDocumento` "2026-09-10" y `distribucionId`, entregada 6, pedido PARCIAL, distribución REGISTRADA con `usuarioId`; (E3) entregar 7 → `ErrorDeNegocio` "Lavandina 1 L: puedes entregar como máximo 6 (pendiente 10, stock 6)" con campo `lineas.0.cantidad`; (E4) pendiente 5 y stock 20, entregar 8 → "Jabón líquido: puedes entregar como máximo 5 (pendiente 5, stock 20)"; (E9) una línea válida y otra que supera el stock → se informan solo las que fallan y no queda distribución, línea, movimiento ni cambio de stock o entregado (SC-007); dos líneas que fallan → un mensaje con ambas separadas por "; "; (E5) vale "500" REGISTRADO → "El vale 500 ya está registrado" con campo `nroVale` y enlace `{ texto: "Ver distribución", ruta: "/distribuciones/{id}" }`, sin cambios de stock ni pedido (SC-004); `buscarValeVigente("500")` devuelve `{ id }` de la REGISTRADA y `null` si la única con ese vale está ANULADA; con "500" registrado, el vale "0500" se acepta como distinto (caso borde de ceros a la izquierda); (E6) pedido de 3 productos con cantidades en 2 → 2 líneas y 2 movimientos, la tercera sigue con entregada 0; (E8) fecha anterior a la del pedido → "La fecha de la distribución debe estar entre el 01/09/2026 y hoy" con campo `fecha` (la fecha futura la rechaza el esquema, T006); pedido ATENDIDO → "El pedido ya está atendido: no queda nada por entregar"; pedido ANULADO → "El pedido está anulado: no se puede distribuir"; pedido inexistente → "No existe el pedido indicado"; `pedidoDetalleId` de otro pedido → "Línea 1: el producto no pertenece al pedido"; se puede distribuir una línea cuyo producto se desactivó (caso borde, I-23); ninguna operación escribe stock sin movimiento (la verificación `verificarConsistenciaInventario` informa 0 diferencias al final); (E1, E10) `obtenerPedidoParaDistribuir` trae Nº, fecha en texto, estado, representante "Apellido, Nombre" con servicio y centro de salud, y por línea `pedidoDetalleId`, código, producto, `productoActivo`, unidad, solicitada, entregada, pendiente, `stockActual`, `maximoEntregable` y `situacion` ("sin-stock" con stock 0); `null` si no existe; `obtenerDistribucion` básico trae vale, fecha en texto, estado, pedido `{ id }`, representante del pedido y líneas con producto, unidad y cantidad

### Implementación de la Historia 1

- [ ] T008 [P] [US1] Crear `src/esquemas/distribuciones.ts` con `esquemaLineaDistribucion` (`pedidoDetalleId` = `idObligatorio("Elige una línea del pedido")`; `cantidad` = vacía o ausente → `undefined`, si no `cantidadEntera("La cantidad debe ser un número entero entre 1 y 1.000.000")`), `esquemaDistribucion` (`pedidoId` = `idObligatorio("Elige un pedido")`; `nroVale` texto recortado, obligatorio "Escribe el Nº de vale", regex `^[0-9]{1,20}$` "El Nº de vale solo admite dígitos, hasta 20", **sin** quitar ceros; `fecha` = `fechaNoFutura("La fecha de la distribución no puede ser futura")`; `observacion` = `textoOpcional("La observación", 200)`; `lineas` = arreglo con `superRefine` que exige al menos una con cantidad: "Entrega al menos un producto: escribe la cantidad en una línea" en `["lineas"]`, y rechaza una `pedidoDetalleId` repetida: "Línea {n}: esa línea del pedido ya está en la línea {m}" en `["lineas", i, "pedidoDetalleId"]` (FR-003; sin esta regla la base la rechazaría con un error genérico); sin estado, usuario ni representante, con comentario X-08 y RN-33), `esquemaVerificacionVale` (solo `nroVale`), `esquemaAvisoDistribucion` (`aviso: z.enum(["registrada"]).optional().catch(undefined)`), `esquemaPedidoParaDistribuir` (`pedido` id opcional con `.catch(undefined)`) y los tipos `DatosDistribucion` y `DatosLineaDistribucion`
- [ ] T009 [US1] Agregar a `src/servicios/distribuciones.ts`: `obtenerPedidoParaDistribuir(pedidoId)` (data-model §2, con `situacionDeLinea` por línea y líneas ordenadas por `id`); `registrarDistribucion(datos, usuarioId): Promise<{ id, pedidoId, productoIds }>` siguiendo **exactamente** los pasos de research V-01 y los mensajes de data-model §1 y §3: vale vigente antes de la transacción (`errorValeDuplicado(nroVale, id?)` con enlace); transacción con `OPCIONES_TRANSACCION`: `bloquearPedido` como primera operación → rechazos por estado → lee `fecha` y líneas del pedido (con `productoId`, `cantidadSolicitada`, `cantidadEntregada` y nombre del producto) → verifica fecha ≥ fecha del pedido (mensaje con `formatearFecha`) y que cada línea con cantidad pertenezca al pedido → `bloquearProductos` de los productos de esas líneas → calcula el máximo de **todas** con `situacionDeLinea` y lanza un único `ErrorDeNegocio` con los mensajes unidos por "; " y el campo `lineas.{i}.cantidad` de la primera (RN-32, FR-009) → `distribucion.create` con `lineas: { create }` → `registrarMovimiento` por línea en orden de `productoId` con `tipo: "SALIDA_DISTRIBUCION"`, `cantidad: -c`, `fechaDocumento` de la distribución creada y `distribucionId` (FR-007) → `pedidoDetalle.update` con `cantidadEntregada: { increment: c }` → `recalcularEstadoPedido`; `catch` de `esErrorDeDuplicado` que vuelve a buscar el vale y lanza el mismo mensaje (V-04); comentarios RN-30, RN-32, RN-34, X-03 y del orden de bloqueo; y `obtenerDistribucion(id)` básico (vale, fecha en texto, observación, estado, pedido `{ id, fecha, estado }`, representante `{ id, nombre, apellido, servicio, activo, centroSalud }` **del pedido**, registrada por y cuándo, líneas ordenadas por `id` con `productoId`, código, nombre, `productoActivo`, unidad y cantidad), o `null`
- [ ] T010 [US1] Crear `src/app/(sistema)/distribuciones/acciones.ts` con `registrarDistribucionAccion(datos: unknown)` (requerirSesion → `esquemaDistribucion.safeParse` → `aResultadoDeValidacion(erroresPorRuta(error))` → `registrarDistribucion` → `aResultadoDeError` → revalida `/distribuciones`, `/pedidos`, `/pedidos/{pedidoId}`, `/existencias` y `/kardex/{productoId}` de cada producto → `redirect("/distribuciones/{id}?aviso=registrada")`) y `verificarValeAccion(nroVale: string)` (solo lectura; con `esquemaVerificacionVale` inválido responde `{ ok: true, datos: { duplicado: false } }`; si hay vigente, `{ duplicado: true, distribucionId }`), con el comentario de orden fijo de las acciones
- [ ] T011 [US1] Crear `src/app/(sistema)/distribuciones/formulario-distribucion.tsx` (cliente, research V-02) con el patrón de `pedidos/formulario-pedido.tsx`: props `pedido` (resultado de `obtenerPedidoParaDistribuir`) y `hoy`; cabecera con Nº de vale (`inputMode="numeric"`, `maxLength={20}`, al salir del campo llama a `verificarValeAccion` y muestra "El vale {n} ya está registrado." con enlace "Ver distribución"), fecha `type="date"` con `min` = fecha del pedido y `max` = hoy, y observación; tabla o `<fieldset>` por línea con producto (y "(inactivo)" si corresponde), unidad, solicitado, entregado, pendiente, stock y, según `situacion`, "Completa" o "Sin stock" sin campo, o el campo "Cantidad a entregar" con `max` = máximo y el texto "Máximo {n}" asociado con `aria-describedby`; estado con una entrada por línea (`{ pedidoDetalleId, cantidad: "" }`); validación con `esquemaDistribucion` + `erroresPorRuta`, errores junto a cada campo y `mensajesPorLinea` en el aviso general; envío en `startTransition` sin vaciar lo escrito si el servidor rechaza (FR-009); nota "Al guardar, el stock baja y el kardex registra la salida. Una distribución no se edita: si tiene un error, se anula."
- [ ] T012 [US1] Crear `src/app/(sistema)/distribuciones/nueva/page.tsx`: `requerirSesion`; `esquemaPedidoParaDistribuir.parse(await searchParams)`; con `pedido`: `obtenerPedidoParaDistribuir` (null → `notFound()`), si el estado no es PENDIENTE ni PARCIAL muestra "El pedido Nº {id} está {estado en minúscula}: solo se distribuyen pedidos pendientes o parciales" con enlace a `/pedidos/{id}`; si no, encabezado "Distribuir el pedido Nº {id}" con representante, servicio, fecha del pedido y enlace a su ficha, y `FormularioDistribucion` con `hoy = hoyEnLaPaz()`; sin `pedido`: aviso "Elige el pedido que vas a atender" con enlace a `/pedidos` (la lista para elegir llega en US2, T016)
- [ ] T013 [US1] Crear `src/app/(sistema)/distribuciones/[id]/page.tsx` básica: `idDeRuta`, `notFound()`, aviso con `esquemaAvisoDistribucion` ("Distribución registrada. El stock bajó y lo entregado del pedido se actualizó."), título "Vale {nroVale}" con `InsigniaDocumento`, datos (fecha `dd/mm/aaaa`, pedido "Nº {id}" enlazado a `/pedidos/{id}`, representante "Apellido, Nombre" enlazado con "(inactivo)" si corresponde y servicio, centro de salud, observación, registrada por y cuándo) y tabla de líneas con Código, Producto (enlazado, con "(inactivo)"), Unidad y Cantidad; enlace "← Volver a distribuciones"; comentario de que no hay Editar ni Borrar (D-16, FR-012)
- [ ] T014 [US1] Modificar `crearSalidaDePrueba` de `tests/ayudantes/inventario.ts` para que registre una distribución real (research V-11): pedido de 1 línea con `registrarPedido` (representante nuevo, fecha = la de la salida) y `registrarDistribucion` con vale único y la cantidad pedida; devuelve `{ distribucion, representante }` con `distribucion` leída de la base (con `id`, `nroVale` y `fecha`); si no hay stock suficiente, lanza el `ErrorDeNegocio` de cantidad excedida; conservar `crearDistribucionSinMovimientosDePrueba`, que sigue usando `tests/integracion/inventario-movimientos.test.ts` para probar `registrarMovimiento` aislado; confirmar que `tests/integracion/inventario-kardex.test.ts`, `inventario-movimientos.test.ts`, `inventario-existencias.test.ts` y `compras-anulacion.test.ts` siguen en verde sin cambiar sus expectativas, y actualizar el comentario del ayudante

**Punto de control**: T006–T007 en verde; pruebas de F-003 en verde con T014; quickstart pasos 2 a 7.

---

## Fase 4: Historia 2 · Completar un pedido en varias entregas (Prioridad: P1)

**Objetivo**: entregas parciales sucesivas hasta ATENDIDO, líneas completas sin campo, pedidos atendidos o
anulados fuera de la elección, y operaciones simultáneas que nunca superan pendiente ni stock.

**Prueba independiente**: quickstart §3, paso 1; pruebas de integración de entregas y concurrencia.

### Pruebas de la Historia 2

- [ ] T015 [P] [US2] Crear `tests/integracion/distribuciones-entregas.test.ts`: (E1, E2) pedido de dos líneas (10 y 5) con stock 6 y 20 → primera distribución 6 y 5 deja PARCIAL; tras `registrarCompra` de 10 unidades más del primer producto, segunda distribución de 4 deja la línea con entregada = solicitada y el pedido ATENDIDO, fuera de `listarPedidos({ estado: "por-atender", pagina: 1 })`; (E3) `obtenerPedidoParaDistribuir` de un PARCIAL con una línea completa trae `situacion: "completa"` y `maximoEntregable: 0` en ella; una tercera distribución al pedido ATENDIDO se rechaza con "El pedido ya está atendido: no queda nada por entregar"; y crear `tests/integracion/distribuciones-concurrencia.test.ts` con `Promise.allSettled` y comentario de que cada llamada abre su transacción: dos distribuciones de **pedidos distintos** del mismo producto con stock 6 (4 y 4) → una sola se guarda, la otra recibe el mensaje de máximo con el stock vigente (2), stock final 2 y nunca negativo (FR-006, SC-002); dos distribuciones del **mismo pedido** (pendiente 5, stock 20; 3 y 3) → una sola, la otra con "puedes entregar como máximo 2 (pendiente 2, stock 17)"; dos distribuciones con el mismo vale "700" de pedidos distintos → una sola, la otra "El vale 700 ya está registrado", sin cambios de stock ni pedido de la rechazada (SC-004); distribución que completa un PARCIAL contra `anularPedido` → si gana la distribución, la anulación falla con "El pedido ya está atendido y no se puede anular"; si gana la anulación, la distribución falla con "El pedido está anulado: no se puede distribuir" y el stock no cambia; edición de un pedido PENDIENTE (`editarPedido` de F-004, cambiando una cantidad) contra una distribución real del mismo pedido → si gana la distribución, la edición falla con "El pedido ya tiene entregas y no se puede editar"; si gana la edición, la distribución se aplica sobre las líneas editadas; el estado final coincide con `calcularEstadoPedido`; en todos los casos `verificarConsistenciaInventario` informa 0 diferencias

### Implementación de la Historia 2

- [ ] T016 [US2] Completar `src/app/(sistema)/distribuciones/nueva/page.tsx` sin `pedido`: encabezado "Registrar distribución", texto "Elige el pedido que vas a atender. Solo aparecen los pendientes y parciales.", tabla con `listarPedidos({ estado: "por-atender", pagina })` de F-004 (Nº, Fecha, Representante, Servicio, Productos, % atendido, Estado con `InsigniaPedido` y botón "Distribuir" a `/distribuciones/nueva?pedido={id}`), mensaje vacío "No hay pedidos por atender" con enlace a `/pedidos/nuevo`, y `Paginacion` (agregar `pagina` a `esquemaPedidoParaDistribuir` con `.catch(1)`); los pedidos ATENDIDOS y ANULADOS nunca aparecen (Historia 2 · E4)

**Punto de control**: T015 en verde; quickstart paso 1.

---

## Fase 5: Historia 3 · Listar distribuciones y ver su detalle (Prioridad: P1)

**Objetivo**: listar por fechas, representante, producto, estado y vale, y ver el detalle completo sin
editar ni borrar.

**Prueba independiente**: quickstart §3, pasos 8 y 9.

### Pruebas de la Historia 3

- [ ] T017 [P] [US3] Agregar a `tests/unitarios/esquema-distribucion.test.ts` los casos de `esquemaFiltroDistribuciones` (por defecto `desde` = inicio del mes en curso, `hasta` = hoy, `estado` = `todas`, `pagina` = 1; estado inválido → `todas`; representante o producto inválidos → ausentes; vale "12a" → "El Nº de vale solo admite dígitos"; `desde > hasta` → "La fecha «desde» no puede ser posterior a «hasta»") y crear `tests/integracion/distribuciones-listado.test.ts` con distribuciones de dos representantes, dos productos y tres fechas, una anulada con `prisma.distribucion.update` (motivo, momento y usuario): por defecto las del rango de fechas, ordenadas por fecha e `id` descendentes; columnas `{ id, fecha, nroVale, pedidoId, representante: "Apellido, Nombre", servicio, productos, unidades, estado }` con `unidades` = suma de cantidades; filtros por representante (del pedido), producto (alguna línea), estado `registradas` y `anuladas`, vale que empieza con "5" y su combinación; paginación de `DISTRIBUCIONES_POR_PAGINA`
- [ ] T018 [P] [US3] Crear `tests/integracion/distribuciones-detalle.test.ts`: `obtenerDistribucion` trae vale, fecha, observación, estado, pedido `{ id, fecha, estado }`, representante y servicio **del pedido** (si se cambia el representante del pedido con `prisma.pedido.update`, el detalle muestra el nuevo: X-08), centro de salud, líneas con código, producto, unidad y cantidad, registrada por y cuándo; una ANULADA trae motivo, anulada por y cuándo; `obtenerDistribucion(999)` → `null`

### Implementación de la Historia 3

- [ ] T019 [P] [US3] Agregar a `src/esquemas/distribuciones.ts` `esquemaFiltroDistribuciones` (`desde` = `fechaDeFiltro(inicioDelMesEnCurso)`, `hasta` = `fechaDeFiltro(hoyEnLaPaz)`, `representante` y `producto` ids opcionales con `.catch(undefined)`, `estado`: `todas` | `registradas` | `anuladas` con `.catch("todas")`, `vale` dígitos hasta 20 "El Nº de vale solo admite dígitos" o vacío → `undefined`, `pagina` entero ≥ 1 por defecto 1; `refine` de `desde ≤ hasta` en `hasta`) y su tipo `FiltroDistribuciones`
- [ ] T020 [US3] Agregar a `src/servicios/distribuciones.ts` `listarDistribuciones({ desde, hasta, representanteId, productoId, estado, vale, pagina })` según research V-07 y data-model §4 (`where` con `fecha` entre `aFechaDocumento(desde)` y `aFechaDocumento(hasta)`, `pedido: { representanteId }`, `lineas: { some: { pedidoDetalle: { productoId } } }`, estado y `nroVale: { startsWith }`; `orderBy: [{ fecha: "desc" }, { id: "desc" }]`; `skip`/`take`; `count`; `include` del pedido con representante y `_count` de líneas; `distribucionDetalle.groupBy({ by: ["distribucionId"], _sum: { cantidad: true } })` de las filas de la página para `unidades`) y completar `obtenerDistribucion` con `motivoAnulacion`, `anuladaPor` y `anuladaEn`
- [ ] T021 [US3] Crear `src/app/(sistema)/distribuciones/page.tsx` y `filtros-distribuciones.tsx` con el patrón de `compras/page.tsx`: encabezado "Distribuciones" con total del rango ("{n} distribuciones del dd/mm/aaaa al dd/mm/aaaa") y botón "Registrar distribución" a `/distribuciones/nueva`; filtros Desde, Hasta, Representante (`listarRepresentantes({ estado: "todos" })` con inactivos marcados), Producto (`listarProductos({ estado: "todos" })` de `src/servicios/catalogos/productos.ts`, inactivos marcados), Estado ("Todas", "Registradas", "Anuladas") y Nº de vale ("Empieza con…"); aviso si los filtros son inválidos ("Se muestra el mes en curso"); tabla con Fecha, Nº de vale, Pedido (enlace "Nº {id}"), Representante, Servicio, Productos, Unidades, Estado (`InsigniaDocumento`) y "Ver detalle"; mensaje vacío "No hay distribuciones para los filtros aplicados"; `Paginacion` conservando los filtros
- [ ] T022 [US3] Completar `src/app/(sistema)/distribuciones/[id]/page.tsx`: estado del pedido con `InsigniaPedido` junto a su enlace; bloque de anulación (motivo, anulada por y cuándo) si está ANULADA; enlace "Imprimir vale" a `/distribuciones/{id}/vale` siempre visible; sin opciones de editar ni borrar (Historia 3 · E4)
- [ ] T023 [US3] Mostrar las unidades de cada distribución en la ficha del pedido (SC-008): agregar `unidades` (suma de las cantidades de sus líneas) a cada elemento de `distribuciones` en `obtenerPedido` de `src/servicios/pedidos.ts`, la columna "Unidades" en la tabla de distribuciones de `src/app/(sistema)/pedidos/[id]/page.tsx`, y el caso en `tests/integracion/pedidos-detalle.test.ts` (distribución de 4 → `unidades: 4`)

**Punto de control**: T017–T018 en verde; quickstart pasos 8 y 9.

---

## Fase 6: Historia 4 · Anular una distribución mal registrada (Prioridad: P2)

**Objetivo**: anular con motivo reponiendo el stock, descontando lo entregado y recalculando el estado del
pedido, y liberar el vale.

**Prueba independiente**: quickstart §3, pasos 11 y 13.

### Pruebas de la Historia 4

- [ ] T024 [P] [US4] Agregar a `tests/unitarios/esquema-distribucion.test.ts` los casos de `esquemaAnulacionDistribucion` (motivo vacío → "Escribe el motivo de la anulación"; 201 caracteres → "El motivo admite hasta 200 caracteres") y crear `tests/integracion/distribuciones-anulacion.test.ts`: (E1) distribución de 2 productos → ANULADA con `motivoAnulacion`, `anuladaEn` y `anuladaPorId`, un `ANULACION_DISTRIBUCION` por línea con cantidad positiva y saldo correcto, stock de cada producto sube en su cantidad y lo entregado de cada línea del pedido baja lo mismo (RN-35); (E2) única distribución de un pedido ATENDIDO → pedido PENDIENTE y stock repuesto; (E3) pedido ATENDIDO con dos distribuciones, se anula una → PARCIAL; (E4) pedido con 6 de 10 entregadas por una distribución y luego `anularPedido` → anular la distribución sube el stock 6, entregada 0, `obtenerPedido` muestra saldo anulado 10 y el pedido sigue ANULADO; (E6) anular dos veces → "La distribución ya está anulada"; inexistente → "No existe la distribución indicada"; (E7) después de anular la del vale "500", `registrarDistribucion` con vale "500" se acepta; (E8) distribución con fecha "2026-08-20" anulada hoy → sus movimientos `ANULACION_DISTRIBUCION` tienen `fechaDocumento` "2026-08-20" (RN-53); anulación doble simultánea con `Promise.allSettled` → una sola se aplica, un solo movimiento inverso por línea y el stock sube una sola vez; después de anular, el pedido que volvió a PENDIENTE se puede editar con `editarPedido` sin quitar la línea con historial (F-004); `verificarConsistenciaInventario` informa 0 diferencias al final de cada caso

### Implementación de la Historia 4

- [ ] T025 [P] [US4] Agregar a `src/esquemas/distribuciones.ts` `esquemaAnulacionDistribucion` (`motivo` = `textoObligatorio("el motivo de la anulación", "El motivo", 200)`)
- [ ] T026 [US4] Agregar a `src/servicios/distribuciones.ts` `anularDistribucion(id, motivo, usuarioId): Promise<{ pedidoId, productoIds }>` siguiendo **exactamente** research V-06: lee `pedidoId` de la distribución (null → "No existe la distribución indicada"); transacción con `OPCIONES_TRANSACCION`: `bloquearPedido` → `distribucion.updateMany({ where: { id, estado: "REGISTRADA" }, data: { estado: "ANULADA", motivoAnulacion, anuladaEn: new Date(), anuladaPorId } })` (count 0 → "La distribución ya está anulada") → lee fecha y líneas (`cantidad`, `pedidoDetalleId`, `productoId` de la línea del pedido) → `bloquearProductos` → `registrarMovimiento` por línea en orden de `productoId` con `tipo: "ANULACION_DISTRIBUCION"`, `cantidad: +c` y `fechaDocumento` = fecha de la distribución (RN-53) → `pedidoDetalle.update` con `cantidadEntregada: { decrement: c }` → `recalcularEstadoPedido` (un ANULADO sigue ANULADO, RN-35); comentarios del orden de bloqueo, de por qué no hace falta verificar stock (solo suma) y de que se permite sin plazo
- [ ] T027 [US4] Agregar `anularDistribucionAccion(id, estadoPrevio, formData)` a `src/app/(sistema)/distribuciones/acciones.ts` (requerirSesion → `esquemaAnulacionDistribucion` con `z.flattenError` → `anularDistribucion` → revalida `/distribuciones`, `/distribuciones/{id}`, `/pedidos`, `/pedidos/{pedidoId}`, `/existencias` y `/kardex/{productoId}` → "Distribución anulada. El stock se repuso y lo entregado del pedido se descontó.") y crear `src/app/(sistema)/distribuciones/[id]/anular-distribucion.tsx` (cliente, `useValidacion` + `useActionState`, con el patrón de `compras/[id]/anular-compra.tsx`: `<textarea>` "Motivo de la anulación" hasta 200, confirmación "¿Anular el vale {nroVale}? Se repondrá el stock de {su producto | sus n productos} y se descontará lo entregado del pedido Nº {pedidoId}. Esta acción no se puede deshacer." solo si el motivo es válido, aviso de resultado, texto "Después puedes registrarla bien con el mismo Nº de vale."); mostrarlo en `src/app/(sistema)/distribuciones/[id]/page.tsx` solo si está REGISTRADA

**Punto de control**: T024 en verde; quickstart pasos 11 y 13.

---

## Fase 7: Historia 5 · Imprimir el vale (Prioridad: P3)

**Objetivo**: una vista limpia del vale para imprimir y firmar.

**Prueba independiente**: quickstart §3, pasos 10 y 12.

- [ ] T028 [US5] Crear el grupo de rutas de impresión (research V-09): `src/app/(impresion)/layout.tsx` (servidor; `requerirSesion()` como primera instrucción; `<main>` blanco con ancho máximo y márgenes de hoja, sin menú); `src/app/(impresion)/distribuciones/[id]/vale/boton-imprimir.tsx` (cliente; botón "Imprimir" que llama a `window.print()`, con clase `print:hidden`); y `src/app/(impresion)/distribuciones/[id]/vale/page.tsx` (`requerirSesion`, `idDeRuta`, `obtenerDistribucion` → `notFound()`; controles "← Volver" a `/distribuciones/{id}` e "Imprimir" en un bloque `print:hidden`; encabezado con el nombre del centro de salud, "Vale de distribución Nº {nroVale}", fecha `dd/mm/aaaa` y "Pedido Nº {id}"; representante "Nombre Apellido" y servicio; tabla Código, Producto, Unidad y Cantidad; observación; dos espacios de firma con línea y leyendas "Entregado por" y "Recibido por"; si está ANULADA, la leyenda **ANULADA** grande en rojo y con borde, legible también en impresión en blanco y negro); verificar con `npm run build` que la ruta `/distribuciones/[id]/vale` convive con `/distribuciones/[id]` del grupo `(sistema)`; si el build la rechaza, mover la página a `src/app/(sistema)/distribuciones/[id]/vale/page.tsx`, ocultar el encabezado del layout con `print:hidden` y registrar la decisión en `docs/decisiones.md`

**Punto de control**: `npm run build` sin errores; quickstart pasos 10 y 12.

---

## Fase 8: Cierre y aspectos transversales

- [ ] T029 [P] Crear `tests/integracion/distribuciones-invariantes.test.ts`: tras una secuencia fija de 2 compras, 3 pedidos, 5 distribuciones (parciales y completas) y 2 anulaciones, `verificarConsistenciaInventario` informa 0 diferencias (SC-006) y para **cada** línea de pedido `cantidadEntregada` = suma de `cantidad` de sus `distribucionDetalle` con distribución REGISTRADA (SC-005), y el estado de cada pedido no ANULADO coincide con `calcularEstadoPedido` (RN-41); leyendo `src/servicios/distribuciones.ts` con `readFileSync`: no contiene `stockActual:` dentro de un `data:`, `producto.update`, `$executeRaw`, `distribucion.delete`, `distribucionDetalle.delete` ni `movimientoInventario.(update|delete)`; el módulo no exporta funciones con `editar`, `modificar`, `borrar`, `eliminar` ni `delete` (FR-012, D-16); y `tests/integracion/inventario-unica-escritura.test.ts` de F-003 sigue en verde
- [ ] T030 [P] Revisar con `grep` que todas las páginas y layouts de `src/app/(sistema)/distribuciones/` y `src/app/(impresion)/` y todas las funciones de `distribuciones/acciones.ts` llaman a `requerirSesion` como primera instrucción, y que todo `searchParams` se valida con un esquema Zod; corregir lo que falte
- [ ] T031 [P] Revisar accesibilidad y pantallas chicas del formulario de distribución, el listado, la ficha y el vale a 375 px: etiquetas en cada campo de cantidad asociadas a su línea, "Máximo {n}", "Completa" y "Sin stock" con texto (no solo color), tablas con desplazamiento propio, insignias con texto y el vale legible en A4 vertical
- [ ] T032 Ejecutar `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`; confirmar que las 365 pruebas de F-001 a F-004 siguen en verde junto con las de F-005 y corregir errores y advertencias
- [ ] T033 Ejecutar el recorrido de `specs/005-distribucion/quickstart.md` §3 con el método de `docs/decisiones.md` I-15, I-22 e I-29 (script `.mts` en el scratchpad que carga datos con los esquemas y servicios reales en la base de pruebas y crea una sesión de prueba; servidor de desarrollo con `DATABASE_URL` de la base de pruebas; páginas revisadas con `Invoke-WebRequest` y la cookie `sesion` desde un `.ps1` en UTF-8 con BOM; al terminar, detener el servidor y borrar el archivo del token), anotar en una sección "4. Estado de la validación" qué se verificó y qué queda pendiente (lo que exige escribir en el formulario, la vista previa de impresión y SC-001 para el recorrido con Raymond)
- [ ] T034 [P] Actualizar `docs/decisiones.md` con la sección "Distribución (plan de F-005, 15/09/2026)" que resuma V-01 a V-12 de `specs/005-distribucion/research.md` en el formato de tabla de P-01 a P-12, y con las decisiones de implementación nuevas (I-30 en adelante); `docs/instalacion.md` con la sección "8. Registrar distribuciones" (elegir el pedido, máximo entregable, vale del talonario, el stock baja al guardar, anulación con motivo que repone el stock, imprimir el vale); y `docs/especificacion/README.md` marcando F-005 como implementada en el cronograma

---

## Dependencias y orden de ejecución

### Entre fases

- **Preparación (fase 1)** → **Fundamentos (fase 2)** → historias → **Cierre (fase 8)**.
- En la fase 2, T002, T004 y T005 tocan archivos distintos y van en paralelo; T003 va después de T002 (la
  prueba debe fallar antes).

### Entre historias

| Historia | Depende de | Motivo |
|---|---|---|
| US1 Registrar | Fundamentos | Crea el servicio, la acción, el formulario y la ficha básica a la que redirige |
| US2 Varias entregas | US1 | Sus pruebas usan `registrarDistribucion`; completa la página `nueva` que crea US1 |
| US3 Listado y detalle | US1 | Amplía `obtenerDistribucion`, el esquema y la ficha que crea US1 |
| US4 Anular | US3 | Muestra la anulación en la ficha completa y usa el esquema de US1 |
| US5 Imprimir | US3 | Usa `obtenerDistribucion` completo (con anulación) |

US2 y US3 pueden hacerse en paralelo después de US1, salvo T016 y T019, que editan
`src/esquemas/distribuciones.ts` y van una después de la otra (lo mismo con el servicio en T020); US4 y US5,
en paralelo después de US3.

### Dentro de cada historia

Pruebas y esquemas [P] primero (las de integración deben fallar antes del servicio) → servicio → acciones y
páginas. Commit al terminar cada fase, sin líneas de autoría.

---

## Ejemplos de trabajo en paralelo

```text
# Fase 2:
T002 tests/unitarios/situacion-linea.test.ts
T004 tests/ayudantes/distribuciones.ts
T005 insignia de documento, menú e inicio

# Historia 1, al empezar:
T006 tests/unitarios/esquema-distribucion.test.ts
T007 tests/integracion/distribuciones-registro.test.ts
T008 src/esquemas/distribuciones.ts

# Con US1 terminada, en paralelo:
US2 (entregas y concurrencia) · US3 (listado y detalle)

# Con US3 terminada, en paralelo:
US4 (anular) · US5 (imprimir)
```

---

## Estrategia de implementación

### MVP (Historia 1)

Fases 1, 2 y 3: registrar distribuciones completas o nada, con stock, kardex, lo entregado y el estado del
pedido al día, y su ficha.

### Entrega incremental (adelantada al 15–16/09)

| Paso | Fases | Resultado verificable |
|---|---|---|
| 1 | 1 y 2 | Situación de línea probada; insignia compartida; F-001 a F-004 intactas |
| 2 | 3 (US1) | Distribuciones que bajan el stock y actualizan el pedido; ciclo compra → pedido → distribución completo |
| 3 | 4 (US2) | Entregas sucesivas y concurrencia sin stock negativo |
| 4 | 5 (US3) | Listado con filtros y detalle |
| 5 | 6 (US4) | Anulación que repone stock y libera el vale |
| 6 | 7 (US5) | Vale para imprimir |
| 7 | 8 | Invariantes, calidad, validación y documentación |

**Orden de corte** (`00-decisiones-y-alcance.md` §5): si el día se atrasa, se posterga primero **US5**
(imprimir, P3) y después **US4** (anular, P2). US1 a US3 son imprescindibles para F-006 y F-007.

---

## Notas

- [P] = archivos distintos y sin dependencias pendientes.
- Cada regla de negocio lleva en el código un comentario con su RN o FR y el porqué (principio I).
- Si aparece algo que la especificación no cubre, se corrige primero `spec.md` o
  `02-modelo-de-dominio.md`; no se improvisa en el código.
