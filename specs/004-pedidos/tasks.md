---
description: "Lista de tareas de implementación de F-004 · Pedidos"
---

# Tareas: F-004 · Pedidos

**Entrada**: documentos de diseño de `specs/004-pedidos/`

**Prerrequisitos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/acciones-f004.md](contracts/acciones-f004.md),
[quickstart.md](quickstart.md). F-001 a F-003 implementadas (catálogos, selectores de representantes y
productos activos, `erroresPorRuta`, fechas de documento, `Paginacion`, patrón del formulario de compra).

**Pruebas**: se incluyen (constitución, principio IX; [quickstart §2](quickstart.md#2-pruebas-automatizadas)).
Las de integración usan PostgreSQL real: **Docker Desktop debe estar abierto**.

**Sin migraciones ni dependencias nuevas** (plan, "Contexto técnico").

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[US#]**: historia de usuario de [spec.md](spec.md)

| Etiqueta | Historia de spec.md | Prioridad |
|---|---|---|
| US1 | Historia 1 · Registrar un pedido | P1 |
| US2 | Historia 2 · Ver los pedidos por atender | P1 |
| US3 | Historia 3 · Ver el detalle de un pedido | P1 |
| US4 | Historia 4 · Editar un pedido que aún no se atendió | P2 |
| US5 | Historia 5 · Anular un pedido o su saldo pendiente | P2 |

**Patrón de páginas y acciones**: el de F-002 y F-003: `requerirSesion()` como primera instrucción de
cada página y acción; `searchParams` validado con Zod (valor inválido → valores por defecto); acciones en
el orden requerirSesion → Zod → servicio → `aResultadoDeError` → `revalidatePath` → redirigir o devolver
resultado; comentario con la RN o FR en cada regla. **Ninguna tarea de F-004 escribe stock ni
movimientos** (FR-003).

---

## Fase 1: Preparación

**Propósito**: confirmar que el punto de partida está sano antes de tocar código compartido.

- [X] T001 Verificar el entorno: `docker info` responde, el contenedor `almacen-oruro-postgres` está *healthy*, y `npm run lint`, `npm run typecheck` y `npm test` terminan sin errores con las 289 pruebas de F-001 a F-003 en verde; anotar el resultado para compararlo al final

---

## Fase 2: Fundamentos (bloquea todas las historias)

**Propósito**: piezas compartidas con compras, el estado calculado, el bloqueo del pedido y los ayudantes
de prueba que usan las cinco historias (y F-005).

**⚠️ CRÍTICO**: ninguna historia empieza antes de terminar esta fase.

- [X] T002 [P] Agregar a `src/esquemas/comunes.ts` `cantidadEntera(mensaje)` (vacío → ausente con `vacioComoAusente`, `z.coerce.number` entero de 1 a 1 000 000, un único mensaje) y `marcarProductosRepetidos(lineas: { productoId: number }[], contexto)` (agrega en `["lineas", i, "productoId"]` el mensaje "Línea {n}: el producto ya está en la línea {m}; modifica su cantidad", con comentario RN-22 y RN-40), movidas desde `src/esquemas/compras.ts`; hacer que `esquemaLineaCompra` y el `superRefine` de `esquemaCompra` las usen sin cambiar reglas ni mensajes; crear `tests/unitarios/esquemas-comunes-lineas.test.ts` ("0", "2.5", "" y "1000001" rechazados con el mensaje dado; producto repetido en las líneas 1 y 3 → mensaje en `lineas.2.productoId`); confirmar que `tests/unitarios/esquema-compra.test.ts` sigue en verde
- [X] T003 [P] Crear `src/componentes/formularios/errores-de-lineas.ts` con `mensajesPorLinea(errores: Partial<Record<string, string[]>>): string[]` movida desde `mensajesGenerales` de `src/app/(sistema)/compras/formulario-compra.tsx` (errores de `lineas.{i}.campo` → "Línea {i+1}: {mensaje en minúscula inicial}" salvo que ya empiece con "Línea"; errores de `lineas` tal cual; el resto se omite), y usarla en el formulario de compra; crear `tests/unitarios/errores-de-lineas.test.ts` con esos tres casos
- [X] T004 [P] Crear `tests/unitarios/estado-pedido.test.ts` (debe fallar antes de T005): `calcularEstadoPedido` devuelve PENDIENTE con todas las entregadas en 0; ATENDIDO con todas `entregada = solicitada` (una o varias líneas); PARCIAL con 10/6 y 5/5 (Historia 3 · E2), con 10/0 y 5/5, y con 10/6 y 5/0; nunca devuelve ANULADO
- [X] T005 Crear `src/servicios/pedidos.ts` con: `calcularEstadoPedido(lineas: { cantidadSolicitada: number; cantidadEntregada: number }[])` según la tabla de data-model §2 (RN-41, comentario con la tabla); `bloquearPedido(tx, pedidoId)` con `tx.$queryRaw` parametrizado `SELECT id, estado FROM pedido WHERE id = ${pedidoId} FOR UPDATE` que devuelve `{ estado } | null`, con comentario del orden de bloqueo "primero el pedido, después los productos" (research P-03); `recalcularEstadoPedido(tx, pedidoId)` que lee las líneas, deja igual un pedido ANULADO (RN-35) y en otro caso guarda `calcularEstadoPedido` y lo devuelve; `PEDIDOS_POR_PAGINA = 50`; y la constante `OPCIONES_TRANSACCION = { maxWait: 10_000, timeout: 10_000 }` como en compras (research K-12)
- [X] T006 Crear `tests/ayudantes/pedidos.ts` (después de T005, porque importa sus funciones), reutilizando `crearUsuarioDePrueba` de `tests/ayudantes/base-de-datos.ts`, `crearRepresentanteDePrueba` de `tests/ayudantes/catalogos.ts` y `fechaDeDocumento` de `tests/ayudantes/inventario.ts` (los ayudantes `crearPedidoConSaldo` y `crearDistribucionSinMovimientosDePrueba` quedan para las pruebas de F-002 y F-003), con `crearPedidoDePrueba({ representanteId?, lineas: { productoId, solicitada, entregada? }[], fecha? = "2026-09-01", estado? })` (crea representante y usuario de prueba si hace falta; si no se indica `estado`, lo calcula con `calcularEstadoPedido`; si es ANULADO completa motivo, momento y usuario), `simularEntregaDePrueba({ pedidoId, productoId, cantidad })` (en una transacción: `bloquearPedido`; si el pedido no existe, o si está ANULADO o ATENDIDO y la cantidad es positiva, lanza `ErrorDeNegocio` ("El pedido está anulado" / "El pedido ya está atendido") como lo hará F-005 (FR-012, caso borde de anulación simultánea); una cantidad negativa —la anulación de una distribución— se acepta en cualquier estado (RN-35); `pedidoDetalle.update` con `cantidadEntregada: { increment: cantidad }`; `recalcularEstadoPedido`; imita a F-005 sin tocar stock) y `crearDistribucionDePedidoDePrueba({ pedidoId, productoId, cantidad, estado = "ANULADA" })` (distribución con vale único y una línea que referencia la línea del pedido, sin movimientos; si es ANULADA completa motivo, momento y usuario)
- [X] T007 Crear `tests/integracion/pedidos-estado.test.ts`: con `simularEntregaDePrueba`, un pedido 10/0 y 5/0 pasa a PARCIAL al entregar 6 del primero, a ATENDIDO al completar ambos, vuelve a PARCIAL y a PENDIENTE al descontar las entregas (caso borde de anulación de distribuciones); un pedido ANULADO con entregas sigue ANULADO al descontar (RN-35) y rechaza una entrega positiva ("El pedido está anulado"); `bloquearPedido` devuelve el estado y `null` para un id inexistente; dos entregas simuladas simultáneas de 3 sobre la misma línea dejan entregada 6 y estado PARCIAL
- [X] T008 [P] Modificar el menú de `src/app/(sistema)/layout.tsx` para sumar **Pedidos** (`/pedidos`) después de Compras y su acceso en `src/app/(sistema)/page.tsx` ("Registrar los pedidos de los representantes y ver qué falta entregar"); crear `src/app/(sistema)/pedidos/insignia-pedido.tsx` con texto y color para PENDIENTE ("Pendiente"), PARCIAL ("Parcial"), ATENDIDO ("Atendido") y ANULADO ("Anulado"), con contraste accesible

**Punto de control**: T002–T004 y T007 en verde; `npm test` y `npm run typecheck` sin errores.

---

## Fase 3: Historia 1 · Registrar un pedido (Prioridad: P1) 🎯 MVP

**Objetivo**: registrar un pedido completo o nada, PENDIENTE, con número asignado, sin tocar el stock.

**Prueba independiente**: quickstart §3, pasos 1 a 4.

### Pruebas de la Historia 1

- [X] T009 [P] [US1] Crear `tests/unitarios/esquema-pedido.test.ts` para `esquemaPedido`: acepta representante, fecha de hoy, observación vacía → `undefined` y 2 líneas con cantidades "10" y "3"; representante vacío → "Elige un representante"; fecha de mañana → "La fecha del pedido no puede ser futura"; observación de 201 → "La observación admite hasta 200 caracteres"; `lineas: []` → "Agrega al menos un producto"; cantidad "0", "-1", "2.5" y "1000001" → "La cantidad debe ser un número entero entre 1 y 1.000.000" en `lineas.{i}.cantidadSolicitada`; producto vacío → "Elige un producto"; producto repetido → "Línea 2: el producto ya está en la línea 1; modifica su cantidad"; `estado` y `cantidadEntregada` enviados no aparecen en el resultado
- [X] T010 [P] [US1] Crear `tests/integracion/pedidos-registro.test.ts`: registrar con 3 productos deja un pedido PENDIENTE con `id` asignado, 3 líneas con entregada 0, `usuarioId` y `creadoEn`, y **ningún** `stockActual` ni movimiento cambia (SC-003); un producto con stock 4 se puede pedir con 10 (Historia 1 · E7); representante inactivo → "El representante '{Apellido, Nombre}' está inactivo: elige uno activo" (campo `representanteId`); producto inactivo en la línea 2 → "Línea 2: el producto '{nombre}' está inactivo: elige uno activo" (campo `lineas.1.productoId`) y no queda ningún pedido ni línea (Historia 1 · E8, SC-005); `listarProductosParaPedido` devuelve solo activos con `stockActual` y `abreviatura`; `obtenerPedido` trae número, fecha en texto, representante con servicio, registrado por y líneas con solicitado, entregado y pendiente

### Implementación de la Historia 1

- [X] T011 [P] [US1] Crear `src/esquemas/pedidos.ts` con `esquemaLineaPedido` (`productoId` = `idObligatorio("Elige un producto")`, `cantidadSolicitada` = `cantidadEntera("La cantidad debe ser un número entero entre 1 y 1.000.000")`) y `esquemaPedido` (`representanteId` = `idObligatorio("Elige un representante")`, `fecha` = `fechaNoFutura("La fecha del pedido no puede ser futura")`, `observacion` = `textoOpcional("La observación", 200)`, `lineas` con `.min(1, "Agrega al menos un producto")` y `superRefine` con `marcarProductosRepetidos`; sin `estado` ni `cantidadEntregada`), con comentario de por qué el estado no está en el esquema (RN-41) y los tipos `DatosPedido` y `DatosLineaPedido`
- [X] T012 [US1] Agregar a `src/servicios/pedidos.ts` `registrarPedido(datos, usuarioId)` según research P-05 (representante activo y productos activos con un `findMany`, mensajes de data-model §1; `pedido.create` con `estado: "PENDIENTE"`, `fecha: aFechaDocumento(datos.fecha)`, `observacion ?? null` y `lineas: { create }`; comentario FR-003 "no toca stock"), `listarProductosParaPedido()` (activos ordenados por nombre con etiqueta "LIM-001 · Lavandina 1 L", `stockActual` y `abreviatura`) y `obtenerPedido(id)` básico (cabecera con representante `{ id, nombre, apellido, servicio, centroSalud }`, estado, registrado por y cuándo, líneas ordenadas por `id` con código, nombre, abreviatura, solicitada, entregada y `pendiente = solicitada − entregada`)
- [X] T013 [US1] Crear `src/app/(sistema)/pedidos/acciones.ts` con `registrarPedidoAccion(datos: unknown)`: requerirSesion → `esquemaPedido.safeParse` → `aResultadoDeValidacion(erroresPorRuta(error))` → `registrarPedido(validacion.data, usuario.id)` → `aResultadoDeError` → `revalidatePath("/pedidos")` → `redirect("/pedidos/{id}?aviso=registrado")`
- [X] T014 [US1] Crear `src/app/(sistema)/pedidos/formulario-pedido.tsx` (cliente, research P-09) con el patrón de `compras/formulario-compra.tsx`: props `accion: (datos) => Promise<ResultadoAccion>`, `representantes`, `productos` (con `stockActual` y `abreviatura`), `hoy`, `valores?` (para editar) y `textoBoton`; cabecera (representante, fecha `type="date"` con `max` = hoy, observación) y líneas en `<fieldset>` "Línea n" con producto, cantidad solicitada y, al elegir el producto, "Stock actual: {n} {abreviatura}" como texto informativo (FR-005); agregar y quitar líneas; validación con `esquemaPedido` + `erroresPorRuta`, errores junto a cada campo y `mensajesPorLinea` en el aviso general; envío en `startTransition` sin vaciar el estado si el servidor rechaza; nota "Registrar un pedido no mueve el stock: el stock sale al distribuir"; y `src/app/(sistema)/pedidos/nuevo/page.tsx` con `listarRepresentantesParaSelector()` y `listarProductosParaPedido()`, y un aviso con enlaces a F-002 si no hay representantes o productos activos
- [X] T015 [US1] Crear `src/app/(sistema)/pedidos/[id]/page.tsx` básica: `idDeRuta`, `notFound()`, aviso con `esquemaAvisoFicha` ("Pedido registrado." / "Pedido actualizado."), título "Pedido Nº {id}" con `InsigniaPedido`, datos (fecha `dd/mm/aaaa`, representante enlazado con servicio, centro de salud, observación, registrado por y cuándo) y tabla de líneas con Código, Producto, Unidad, Solicitado, Entregado y Pendiente (Historia 3 · E1); enlace "← Volver a pedidos"

**Punto de control**: T009–T010 en verde; quickstart pasos 1 a 4.

---

## Fase 4: Historia 2 · Ver los pedidos por atender (Prioridad: P1)

**Objetivo**: listar por defecto lo que falta entregar, del más antiguo al más reciente, con filtros y
porcentaje atendido.

**Prueba independiente**: quickstart §3, pasos 5, 6 y 10.

### Pruebas de la Historia 2

- [ ] T016 [P] [US2] Agregar a `tests/unitarios/esquema-pedido.test.ts` los casos de `esquemaFiltroPedidos` (por defecto `estado` = `por-atender`, sin rango y `pagina` = 1; estado inválido → `por-atender`; representante inválido → ausente; `desde > hasta` → "La fecha «desde» no puede ser posterior a «hasta»") y crear `tests/integracion/pedidos-listado.test.ts` con pedidos de `crearPedidoDePrueba` en los cuatro estados (sin depender de US1): por defecto solo PENDIENTE y PARCIAL, ordenados por fecha y `id` ascendentes, con número, fecha, representante "Apellido, Nombre", servicio, cantidad de productos y estado; cada estado concreto y `todos`; filtros por representante y rango de fechas combinados con el estado; `porcentajeAtendido` 40 con 10 solicitadas y 4 entregadas (Historia 2 · E4), 99 con 200 y 199, 0 sin entregas y 100 atendido; paginación de `PEDIDOS_POR_PAGINA`

### Implementación de la Historia 2

- [ ] T017 [P] [US2] Agregar a `src/esquemas/pedidos.ts` `esquemaFiltroPedidos` (`estado`: `por-atender` | `pendientes` | `parciales` | `atendidos` | `anulados` | `todos` con `.catch("por-atender")`; `representante` id opcional con `.catch(undefined)`; `desde` y `hasta` con `fechaOpcionalDeFiltro()` y `desde ≤ hasta`; `pagina` entero ≥ 1 por defecto 1) y su tipo
- [ ] T018 [US2] Agregar a `src/servicios/pedidos.ts` `listarPedidos({ estado, representanteId, desde, hasta, pagina })` según research P-07 y data-model §4: `where` con estados (`por-atender` → `in: ["PENDIENTE", "PARCIAL"]`), representante y `fecha` entre `aFechaDocumento(desde)` y `aFechaDocumento(hasta)` si vienen; `orderBy: [{ fecha: "asc" }, { id: "asc" }]`; `_count: { select: { lineas: true } }` para la cantidad de productos; `skip`/`take` con `PEDIDOS_POR_PAGINA`; `count`; y `pedidoDetalle.groupBy({ by: ["pedidoId"], where: { pedidoId: { in: ids } }, _sum: { cantidadSolicitada, cantidadEntregada } })` para `porcentajeAtendido = Math.floor(entregada * 100 / solicitada)` con comentario de por qué hacia abajo
- [ ] T019 [US2] Crear `src/app/(sistema)/pedidos/page.tsx` y `filtros-pedidos.tsx`: encabezado "Pedidos" con total y botón "Registrar pedido"; filtros Estado ("Por atender", "Pendientes", "Parciales", "Atendidos", "Anulados", "Todos"), Representante (activos e inactivos marcados, con `listarRepresentantes({ estado: "todos" })`), Desde y Hasta; aviso si los filtros son inválidos; tabla con Nº, Fecha, Representante, Servicio, Productos, % atendido, Estado (`InsigniaPedido`) y "Ver detalle"; mensaje vacío "No hay pedidos para los filtros aplicados" (con `por-atender`: "No hay pedidos por atender"); `Paginacion` conservando los filtros; y en `src/app/(sistema)/representantes/[id]/page.tsx` el enlace "Ver sus pedidos" a `/pedidos?representante={id}&estado=todos`

**Punto de control**: T016 en verde; quickstart pasos 5, 6 y 10.

---

## Fase 5: Historia 3 · Ver el detalle de un pedido (Prioridad: P1)

**Objetivo**: ver por producto lo solicitado, entregado y pendiente (o saldo anulado), las distribuciones
del pedido y las acciones que permite su estado.

**Prueba independiente**: quickstart §3, paso 7; estados con entregas mediante pruebas de integración.

### Pruebas de la Historia 3

- [ ] T020 [P] [US3] Crear `tests/integracion/pedidos-detalle.test.ts`: con `simularEntregaDePrueba`, líneas 10/6 y 5/5 muestran pendiente 4 y 0 y estado PARCIAL (Historia 3 · E2); un pedido con `crearDistribucionDePedidoDePrueba` lista la distribución con Nº de vale, fecha en texto y estado (E3); un pedido ANULADO con 6 de 10 entregadas trae `saldoAnulado` 4, motivo, anulado por y cuándo (E4); `acciones` es `{ editar: true, anular: true, distribuir: true }` en PENDIENTE, `{ editar: false, anular: true, distribuir: true }` en PARCIAL y todo `false` en ATENDIDO y ANULADO (E5, FR-015); `obtenerPedido(999)` → `null`

### Implementación de la Historia 3

- [ ] T021 [US3] Ampliar `obtenerPedido` de `src/servicios/pedidos.ts` con `saldoAnulado` por línea (`solicitada − entregada` solo si el pedido está ANULADO, `null` en otro caso), datos de anulación (motivo, anulado por, cuándo), distribuciones del pedido ordenadas por `id` (`{ id, nroVale, fecha, estado }`) y `acciones` calculadas por `accionesSegunEstado(estado)` (función exportada con la tabla de research P-08 y comentario FR-015)
- [ ] T022 [US3] Completar `src/app/(sistema)/pedidos/[id]/page.tsx`: columna "Pendiente" que pasa a "Saldo anulado" si el pedido está ANULADO; bloque de anulación con motivo, anulado por y cuándo; sección "Distribuciones" con Nº de vale, fecha, estado y enlace a `/distribuciones/{id}` (responde 404 hasta F-005) o "Todavía no hay distribuciones para este pedido"; botones según `acciones`: "Editar" (`/pedidos/{id}/editar`) y "Distribuir" (`/distribuciones/nueva?pedido={id}`, ruta de F-005); nota explicativa del estado con la tabla de la especificación en una línea ("Pendiente: nada entregado · Parcial: algo entregado · Atendido: todo entregado · Anulado: lo anuló el encargado; lo entregado se conserva") para SC-007

**Punto de control**: T020 en verde; quickstart paso 7.

---

## Fase 6: Historia 4 · Editar un pedido que aún no se atendió (Prioridad: P2)

**Objetivo**: cambiar cabecera y líneas de un pedido PENDIENTE conservando su número, con rechazo si ya
tiene entregas.

**Prueba independiente**: quickstart §3, paso 8.

### Pruebas de la Historia 4

- [ ] T023 [P] [US4] Crear `tests/integracion/pedidos-edicion.test.ts`: editar un PENDIENTE agregando un producto, quitando otro y cambiando una cantidad deja esas líneas, conserva `id`, `usuarioId` y `creadoEn`, sigue PENDIENTE y no cambia stock ni movimientos (Historia 4 · E1); cambia representante, fecha y observación; con entregas simuladas (PARCIAL o ATENDIDO) lanza "El pedido ya tiene entregas y no se puede editar" y ANULADO lanza "El pedido está anulado y no se puede editar" sin cambiar nada (E2, RN-42); una edición inválida (producto inactivo nuevo) deja el pedido como estaba (E4); se acepta conservar el representante y un producto que se desactivaron (FR-006, caso borde del pedido por atender con valores inactivos); una línea con `crearDistribucionDePedidoDePrueba` ANULADA no se puede quitar ("No se puede quitar '{producto}': figura en distribuciones anuladas del pedido. Puedes cambiar su cantidad") pero sí cambiar su cantidad; concurrencia con `Promise.allSettled`: una edición y una `simularEntregaDePrueba` simultáneas → si gana la entrega, la edición se rechaza con el mensaje de entregas; si gana la edición, la entrega se aplica sobre las líneas editadas; en ambos casos el estado final coincide con `calcularEstadoPedido` (E3)

### Implementación de la Historia 4

- [ ] T024 [US4] Agregar a `src/servicios/pedidos.ts` `editarPedido(id, datos)` según research P-04, en una transacción con `OPCIONES_TRANSACCION`: `bloquearPedido` como primera operación (null → "No existe el pedido indicado"; PARCIAL o ATENDIDO → "El pedido ya tiene entregas y no se puede editar"; ANULADO → "El pedido está anulado y no se puede editar"); verificación de representante (activo o el mismo) y productos (activos o ya presentes en el pedido), con comentario FR-006 y FR-003 de F-002; firma `(id, datos)` sin usuario, porque la especificación no pide registrar quién editó; actualización de la cabecera; sincronización de líneas por `productoId` (actualizar cantidad, crear nuevas, borrar las que ya no están salvo que `distribucionDetalle.count({ where: { pedidoDetalleId } }) > 0`, en cuyo caso se lanza el mensaje de data-model §1); comentario de por qué se sincroniza en lugar de reemplazar y de por qué borrar una línea no viola el principio IV
- [ ] T025 [US4] Agregar `editarPedidoAccion(id, datos: unknown)` a `src/app/(sistema)/pedidos/acciones.ts` (requerirSesion → `esquemaPedido` → `editarPedido` → revalida `/pedidos` y `/pedidos/{id}` → redirige a `/pedidos/{id}?aviso=modificado`) y crear `src/app/(sistema)/pedidos/[id]/editar/page.tsx`: si el pedido no existe, `notFound()`; si no está PENDIENTE, muestra "Este pedido está {estado}: solo se editan pedidos pendientes" con enlace a la ficha; si está PENDIENTE, `FormularioPedido` con los valores actuales (fecha, representante con `listarRepresentantesParaSelector(representanteId)`, observación y líneas) y `textoBoton` "Guardar cambios"

**Punto de control**: T023 en verde; quickstart paso 8.

---

## Fase 7: Historia 5 · Anular un pedido o su saldo pendiente (Prioridad: P2)

**Objetivo**: anular con motivo un pedido PENDIENTE o PARCIAL conservando lo entregado, sin tocar stock.

**Prueba independiente**: quickstart §3, paso 9.

### Pruebas de la Historia 5

- [ ] T026 [P] [US5] Agregar a `tests/unitarios/esquema-pedido.test.ts` los casos de `esquemaAnulacionPedido` (motivo vacío → "Escribe el motivo de la anulación"; 201 caracteres → "El motivo admite hasta 200 caracteres") y crear `tests/integracion/pedidos-anulacion.test.ts`: anular un PENDIENTE lo deja ANULADO con `motivoAnulacion`, `anuladaEn` y `anuladaPorId`, sin cambios de stock ni movimientos, y fuera del listado por defecto (Historia 5 · E1); anular un PARCIAL con 6 de 10 entregadas conserva entregada 6 y `obtenerPedido` muestra saldo anulado 4 (E2, RN-43); ATENDIDO → "El pedido ya está atendido y no se puede anular"; ANULADO → "El pedido ya está anulado"; inexistente → "No existe el pedido indicado" (E3, FR-012); concurrencia con `Promise.allSettled`: la anulación de un PARCIAL y una `simularEntregaDePrueba` que lo completaría → si gana la entrega, la anulación se rechaza con "ya está atendido"; si gana la anulación, la entrega se rechaza con "El pedido está anulado", el pedido queda ANULADO y lo entregado no cambia (caso borde, FR-012)

### Implementación de la Historia 5

- [ ] T027 [P] [US5] Agregar a `src/esquemas/pedidos.ts` `esquemaAnulacionPedido` (`motivo` = `textoObligatorio("el motivo de la anulación", "El motivo", 200)`)
- [ ] T028 [US5] Agregar a `src/servicios/pedidos.ts` `anularPedido(id, motivo, usuarioId)` según research P-06: transacción con `OPCIONES_TRANSACCION`, `bloquearPedido` primero, mensajes por estado de data-model §3, `pedido.update` con `estado: "ANULADO"`, motivo, `anuladaEn: new Date()` y `anuladaPorId`; comentario de que las líneas no cambian (lo entregado se conserva y el saldo anulado se calcula al mostrar) y de que no toca stock
- [ ] T029 [US5] Agregar `anularPedidoAccion(id, estadoPrevio, formData)` a `src/app/(sistema)/pedidos/acciones.ts` (requerirSesion → `esquemaAnulacionPedido` con `z.flattenError` → `anularPedido` → revalida `/pedidos` y `/pedidos/{id}` → "Pedido anulado. Lo entregado se conserva y el saldo pendiente quedó anulado.") y crear `src/app/(sistema)/pedidos/[id]/anular-pedido.tsx` (cliente, `useValidacion` + `useActionState`, `<textarea>` "Motivo de la anulación" hasta 200, confirmación "¿Anular el pedido Nº {id}? Lo entregado se conserva y el saldo pendiente queda anulado. Esta acción no se puede deshacer." solo si el motivo es válido, aviso de resultado); mostrarlo en `src/app/(sistema)/pedidos/[id]/page.tsx` solo cuando `acciones.anular` es verdadero

**Punto de control**: T026 en verde; quickstart paso 9.

---

## Fase 8: Cierre y aspectos transversales

- [ ] T030 [P] Crear `tests/integracion/pedidos-invariantes.test.ts`: leyendo `src/servicios/pedidos.ts` con `readFileSync`, verifica que no contiene escrituras del stock ni del kardex: `producto.update`, `producto.updateMany`, `movimientoInventario`, `registrarMovimiento` ni `$executeRaw` (FR-003, SC-003; leer `stockActual` sí se permite, porque `listarProductosParaPedido` lo muestra por FR-005), ni `pedido.delete` o `pedido.deleteMany` (los pedidos no se borran); que el módulo no exporta funciones con `borrar`, `eliminar`, `delete` ni `cambiarEstado`/`elegirEstado` (el estado solo se calcula o se anula, FR-008); y que `tests/integracion/inventario-unica-escritura.test.ts` de F-003 sigue en verde
- [ ] T031 [P] Revisar con `grep` que todas las páginas de `src/app/(sistema)/pedidos/` y todas las funciones de `pedidos/acciones.ts` llaman a `requerirSesion` como primera instrucción, y que todo `searchParams` se valida con un esquema Zod; corregir lo que falte
- [ ] T032 [P] Revisar accesibilidad y pantallas chicas del formulario de pedido, el listado, la ficha y la edición a 375 px: etiquetas en todos los campos de cada línea dentro de su `<fieldset>`, stock informativo asociado con `aria-describedby` al selector de producto, tablas con desplazamiento propio, insignias de estado con texto
- [ ] T033 Ejecutar `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`; confirmar que las 289 pruebas de F-001 a F-003 siguen en verde junto con las de F-004 y corregir errores y advertencias
- [ ] T034 Ejecutar el recorrido de `specs/004-pedidos/quickstart.md` §3 con el método de `docs/decisiones.md` I-15 e I-22 (servidor de desarrollo contra la base de pruebas, datos cargados con los esquemas y servicios reales y sesión de prueba creada en la base, sin escribir contraseñas en el navegador), anotar en una sección "Estado de la validación" qué se verificó y qué queda pendiente, y medir SC-004 (pedidos por atender en menos de 30 s) o dejarlo junto con SC-001 para el recorrido con Raymond
- [ ] T035 [P] Actualizar `docs/decisiones.md` con una sección "Pedidos (plan de F-004, 15/09/2026)" que resuma P-01 a P-12 de `specs/004-pedidos/research.md` en el formato de tabla de K-01 a K-12 y con las decisiones de implementación nuevas (I-23 en adelante); `docs/instalacion.md` con una sección breve "Registrar pedidos" (el pedido no mueve stock, estados, edición solo en pendiente, anulación con motivo) y `docs/especificacion/README.md` marcando F-004 como implementada en el cronograma

---

## Dependencias y orden de ejecución

### Entre fases

- **Preparación (fase 1)** → **Fundamentos (fase 2)** → historias → **Cierre (fase 8)**.
- En la fase 2, T002, T003, T004 y T008 tocan archivos distintos y van en paralelo; T005 (servicio
  base) va después de T004; T006 importa funciones de T005 y va después; T007 necesita T005 y T006.

### Entre historias

| Historia | Depende de | Motivo |
|---|---|---|
| US1 Registrar | Fundamentos | Crea la ficha básica a la que redirige |
| US2 Listado | Fundamentos, T009 y T011 | Sus pruebas crean pedidos con `crearPedidoDePrueba`; T016 y T017 agregan a los archivos que crean T009 y T011 |
| US3 Detalle | US1 | Amplía `obtenerPedido` y la ficha que crea US1 |
| US4 Editar | US1 | Reutiliza `FormularioPedido` y `esquemaPedido` |
| US5 Anular | US3 | Muestra el formulario de anulación según `acciones` |

US2 puede hacerse en paralelo con el resto de US1 una vez creados los archivos de T009 y T011; US3 y US4,
en paralelo después de US1; US5 después de US3.

### Dentro de cada historia

Pruebas y esquemas [P] primero (las de integración deben fallar antes del servicio) → servicio →
acciones y páginas. Commit al terminar cada fase, sin líneas de autoría.

---

## Ejemplos de trabajo en paralelo

```text
# Fase 2:
T002 src/esquemas/comunes.ts + tests/unitarios/esquemas-comunes-lineas.test.ts
T003 src/componentes/formularios/errores-de-lineas.ts + prueba
T004 tests/unitarios/estado-pedido.test.ts
T008 menú, inicio e insignia de pedido

# Historia 1, al empezar:
T009 tests/unitarios/esquema-pedido.test.ts
T010 tests/integracion/pedidos-registro.test.ts
T011 src/esquemas/pedidos.ts

# Con US1 terminada, en paralelo:
US3 (detalle) · US4 (editar)
```

---

## Estrategia de implementación

### MVP (Historia 1)

Fases 1, 2 y 3: registrar pedidos completos, PENDIENTE y sin mover stock, con su ficha.

### Entrega incremental (jueves 17/09, junto con F-005)

| Paso | Fases | Resultado verificable |
|---|---|---|
| 1 | 1 y 2 | Estado calculado y bloqueo del pedido probados; F-001 a F-003 intactas |
| 2 | 3 (US1) | Pedidos registrados sin tocar el stock |
| 3 | 4 y 5 (US2, US3) | Lista de lo que falta entregar y detalle con pendiente por producto |
| 4 | 6 (US4) | Edición de pedidos pendientes |
| 5 | 7 (US5) | Anulación conservando lo entregado |
| 6 | 8 | Calidad, validación y documentación |

**Orden de corte** (`00-decisiones-y-alcance.md` §5): si el día se atrasa, se posterga primero **US4**
(editar, P2) y después **US5** (anular, P2). US1 a US3 son imprescindibles para F-005.

---

## Notas

- [P] = archivos distintos y sin dependencias pendientes.
- Cada regla de negocio lleva en el código un comentario con su RN o FR y el porqué (principio I).
- Si aparece algo que la especificación no cubre, se corrige primero `spec.md` o
  `02-modelo-de-dominio.md`; no se improvisa en el código.
