# Investigación técnica · F-004 Pedidos

**Fecha**: 2026-09-15 · **Plan**: [plan.md](plan.md)

F-004 **reutiliza** las decisiones de F-001 (R-01 a R-16), F-002 (C-01 a C-11) y F-003 (K-01 a K-12) y
el código ya implementado: esquema con las tablas `pedido` y `pedido_detalle` y sus CHECK, selectores
de representantes y productos activos, reglas de baja de F-002 (RN-13), `erroresPorRuta`, fechas de
documento, `Paginacion` y el patrón del formulario de compra con líneas. Aquí solo se registran las
decisiones **nuevas**, con el formato **Decisión / Fundamento / Alternativas descartadas**.

---

## P-01 · Número de pedido

**Decisión**: el Nº de pedido es el `id` de la tabla `pedido`, que PostgreSQL asigna con una secuencia.
Se muestra como "Pedido Nº 15". No cambia al editar ni al anular (FR-002). Si un registro falla después
de pedir el número a la secuencia, ese número no se reutiliza: puede haber saltos, pero nunca
repeticiones (supuesto agregado a la especificación).

**Fundamento**: el esquema ya tiene un entero autoincremental único; una columna aparte con el mismo
valor sería una segunda fuente que mantener y una migración más. No hay talonario físico de pedidos.

**Alternativas descartadas**: columna `numero` con `MAX + 1` (dos registros simultáneos obtendrían el
mismo número, salvo con un bloqueo de tabla); tabla de contadores (más código para el mismo resultado).

---

## P-02 · Estado calculado del pedido

**Decisión**: una función pura `calcularEstadoPedido(lineas)` en `src/servicios/pedidos.ts`, que aplica
la tabla de estados de la especificación (RN-41):

| Si… | Estado |
|---|---|
| ninguna línea tiene entregas | `PENDIENTE` |
| todas las líneas tienen `entregada = solicitada` | `ATENDIDO` |
| en otro caso | `PARCIAL` |

`ANULADO` no lo devuelve nunca: solo lo pone la anulación (RN-43). Junto a ella,
`recalcularEstadoPedido(tx, pedidoId)` lee las líneas dentro de la transacción y guarda el estado
calculado, **salvo** que el pedido esté ANULADO, que sigue ANULADO (RN-35). F-005 la llamará después de
cambiar `cantidad_entregada` al registrar o anular una distribución.

**Fundamento**: "el estado se calcula, no se elige" queda en una función de pocas líneas, probada con
pruebas unitarias sin base de datos, y en un único lugar que usarán las distribuciones. SC-007 pide que
alguien pueda explicar el estado mirando el detalle: es literalmente esta tabla.

**Alternativas descartadas**: calcular el estado al consultar sin guardarlo (el listado filtra por
estado y el índice `(estado, fecha)` ya existe); trigger en la base (prohibido por el principio II).

---

## P-03 · Bloqueo del pedido para editar, anular y distribuir

**Decisión**: `bloquearPedido(tx, pedidoId)` en `src/servicios/pedidos.ts` ejecuta
`SELECT id, estado FROM pedido WHERE id = … FOR UPDATE` (parametrizado con `tx.$queryRaw`) y devuelve el
estado, o `null` si no existe. La usan, **como primera operación de su transacción**:

- `editarPedido`: después del bloqueo exige `PENDIENTE` (RN-42);
- `anularPedido`: exige `PENDIENTE` o `PARCIAL` (RN-43);
- `registrarDistribucion` y `anularDistribucion` de F-005.

Orden de bloqueo en todo el sistema: **primero el pedido, después los productos** (K-01). Una compra solo
bloquea productos y no espera pedidos, así que no se forma un ciclo.

**Fundamento**: resuelve los casos borde de la especificación con una regla: quien llega segundo espera
y, al continuar, ve el estado que dejó el primero.
- Edición contra distribución: si la distribución se guarda primero, el pedido ya no está PENDIENTE y la
  edición se rechaza ("El pedido ya tiene entregas y no se puede editar"); si la edición se guarda
  primero, la distribución trabaja con las líneas ya editadas.
- Anulación contra distribución: gana la primera; la otra ve ATENDIDO o ANULADO.

**Alternativas descartadas**: actualización condicional `updateMany({ where: { estado: "PENDIENTE" } })`
como en la anulación de compras (sirve para anular, pero la edición necesita además leer y reemplazar las
líneas con el pedido ya bloqueado, y un solo patrón para las tres operaciones se explica mejor);
control optimista por versión (requiere columna nueva y reintentos).

---

## P-04 · Edición: sincronizar las líneas

**Decisión**: `editarPedido(id, datos, usuarioId)`, dentro de una transacción:

1. `bloquearPedido`; si no está `PENDIENTE`, se rechaza con el mensaje de su estado (data-model §3).
2. Verificaciones: representante activo o el mismo que ya tenía; productos activos o los que ya estaban
   en el pedido (FR-003 de F-002).
3. Actualiza la cabecera (representante, fecha, observación).
4. Compara las líneas actuales con las nuevas por producto:
   - producto que sigue → actualiza `cantidadSolicitada`;
   - producto nuevo → crea la línea;
   - producto que ya no está → la borra, **salvo** que figure en alguna distribución (necesariamente
     anulada, porque el pedido está PENDIENTE): entonces se rechaza toda la edición con "No se puede
     quitar 'Lavandina 1 L': figura en distribuciones anuladas del pedido. Puedes cambiar su cantidad"
     (caso borde agregado a la especificación).

El pedido conserva su `id`, su usuario de registro y su fecha de creación.

**Fundamento**: borrar y volver a crear todas las líneas rompería la referencia de `distribucion_detalle`
a `pedido_detalle` en los pedidos que volvieron a PENDIENTE (caso borde de F-005). Sincronizar por
producto conserva esas referencias y cambia solo lo que el usuario cambió.

Borrar la fila de una línea es correcto aquí: un pedido no es un documento inmutable (la especificación
permite editarlo mientras está PENDIENTE); los documentos inmutables son compras y distribuciones
(principio IV).

**Alternativas descartadas**: borrar y recrear todas las líneas (falla con historial de distribuciones);
marcar líneas como inactivas (una columna nueva y reglas de estado más complejas para un caso raro).

---

## P-05 · Registro del pedido

**Decisión**: `registrarPedido(datos, usuarioId)` verifica fuera de la transacción que el representante y
los productos existan y estén activos (RN-14, RN-40), y crea el pedido con sus líneas en un solo
`pedido.create({ data: { …, estado: "PENDIENTE", lineas: { create: [...] } } })`, que Prisma ejecuta de
forma atómica (FR-004). No bloquea productos ni toca el stock (FR-003).

**Fundamento**: registrar un pedido no mueve stock, así que no necesita el núcleo del inventario. Un
`create` anidado ya es todo o nada.

**Nota de concurrencia**: insertar las líneas toma `FOR KEY SHARE` sobre cada producto; una compra o
distribución que tenga ese producto bloqueado hace esperar al pedido unos milisegundos, sin ciclo
posible porque el pedido nuevo no bloquea nada que ellas esperen.

---

## P-06 · Anulación

**Decisión**: `anularPedido(id, motivo, usuarioId)`: transacción con `bloquearPedido`; si el estado es
`PENDIENTE` o `PARCIAL`, guarda `estado = ANULADO`, motivo, `anuladaEn` y `anuladaPorId`. Las líneas no
cambian: lo entregado se conserva y el **saldo anulado** de cada línea es `solicitada − entregada`, que
se calcula al mostrar (FR-011). No toca stock ni movimientos.

**Fundamento**: con las cantidades intactas, el detalle y los reportes pueden mostrar lo entregado y el
saldo anulado sin columnas nuevas; la base ya garantiza la coherencia con `pedido_anulacion_coherente`.

---

## P-07 · Listado de pedidos

**Decisión**: `listarPedidos({ estado, representanteId, desde, hasta, pagina })`:

| Filtro | Valores | Por defecto |
|---|---|---|
| `estado` | `por-atender` (PENDIENTE y PARCIAL), `pendientes`, `parciales`, `atendidos`, `anulados`, `todos` | `por-atender` |
| `representante` | id | todos |
| `desde`, `hasta` | fechas del pedido, opcionales | sin rango (un pedido por atender puede ser antiguo) |
| `pagina` | entero ≥ 1 | 1 |

Orden: fecha ascendente y luego `id` (FR-013: "para atender primero lo que más espera"). 50 por página,
como las compras. El **porcentaje atendido** se calcula con la suma de entregadas sobre la suma de
solicitadas de las líneas de los pedidos de la página (`pedidoDetalle.groupBy` por pedido) y se **redondea
hacia abajo**: 199 de 200 muestra 99 %, nunca 100 % si falta algo.

**Fundamento**: la historia pide "por atender" como vista diaria; con 36 meses simulados, "Todos" puede
tener cientos de pedidos, así que se pagina. Redondear hacia abajo evita un 100 % engañoso.

---

## P-08 · Detalle y acciones según el estado

**Decisión**: `obtenerPedido(id)` devuelve cabecera, representante con servicio, usuario de registro y de
anulación, líneas con código, producto, unidad, solicitada, entregada, pendiente y saldo anulado, y las
distribuciones del pedido (Nº de vale, fecha, estado) enlazadas a `/distribuciones/[id]`. La ficha muestra
las acciones según FR-015:

| Estado | Editar | Anular | Distribuir |
|---|---|---|---|
| PENDIENTE | ✅ | ✅ | ✅ |
| PARCIAL | — | ✅ | ✅ |
| ATENDIDO, ANULADO | — | — | — |

"Distribuir" enlaza a `/distribuciones/nueva?pedido={id}`, ruta reservada que implementa F-005 (hasta
entonces responde 404, como los enlaces a distribuciones del kardex). La columna "Pendiente" pasa a
llamarse "Saldo anulado" cuando el pedido está ANULADO.

**Fundamento**: las acciones se deciden en un solo lugar a partir del estado, y el servidor vuelve a
verificar la regla en cada acción.

---

## P-09 · Formulario de pedido

**Decisión**: el mismo patrón que el de compra (K-03): cabecera y líneas en estado de React, objeto
validado con `esquemaPedido` en el cliente y en la acción, errores por ruta ("Línea 2: …"). Cada línea
muestra el **stock actual** del producto elegido como información ("Stock actual: 4 BID5"), sin impedir
pedir más (FR-005, Historia 1 · E7). El selector recibe `listarProductosParaPedido()` con
`{ id, etiqueta, stockActual, abreviatura }`.

Se extraen a módulos compartidos las piezas que ya repite el formulario de compra, sin cambiar su
comportamiento:
- `cantidadEntera(mensaje)` en `src/esquemas/comunes.ts` (entero de 1 a 1 000 000);
- `marcarProductosRepetidos(lineas, contexto)` en `src/esquemas/comunes.ts` (RN-22 y RN-40, mismo
  mensaje "Línea n: el producto ya está en la línea m; modifica su cantidad");
- `mensajesPorLinea(errores)` en `src/componentes/formularios/errores-de-lineas.ts` (lista del aviso
  general).

**Fundamento**: los dos formularios siguen siendo archivos explícitos, cada uno con sus columnas, pero la
regla de cantidad y la de productos repetidos quedan escritas una sola vez.

**Alternativas descartadas**: un componente genérico de "documento con líneas" (abstracción que el
principio I desaconseja para dos usos con columnas distintas).

---

## P-10 · Fechas del pedido

**Decisión**: igual que la compra (K-06): `fechaNoFutura("La fecha del pedido no puede ser futura")`,
texto `AAAA-MM-DD`, guardada con `aFechaDocumento`. Al editar la fecha de un pedido PENDIENTE no hay
distribuciones vigentes que la condicionen (caso borde de la especificación).

---

## P-11 · Pantallas y navegación

**Decisión**: rutas reservadas en F-001: `/pedidos`, `/pedidos/nuevo`, `/pedidos/[id]` y
`/pedidos/[id]/editar`. El menú suma **Pedidos** después de Compras; el inicio, su acceso. La ficha del
representante (F-002) suma el enlace "Ver sus pedidos" (`/pedidos?representante={id}&estado=todos`).
Después de registrar o editar se redirige a la ficha con `?aviso=registrado|modificado`.

---

## P-12 · Pruebas

**Decisión**:
- Unitarias: `calcularEstadoPedido` con la tabla completa; `esquemaPedido` y filtros.
- Integración: registro (sin cambios de stock ni movimientos, SC-003), edición con sincronización de
  líneas y rechazo por estado, anulación PENDIENTE y PARCIAL, listado con filtros, porcentaje y
  paginación, detalle.
- **Entregas simuladas**: como F-005 todavía no existe, un ayudante `simularEntregaDePrueba(pedidoId,
  productoId, cantidad)` cambia `cantidad_entregada` y llama a `recalcularEstadoPedido` dentro de una
  transacción que primero bloquea el pedido, exactamente como lo hará `registrarDistribucion`.
- Concurrencia real con `Promise.allSettled`: edición contra entrega simulada, y anulación contra entrega
  simulada que completa el pedido; en ambos casos una sola operación gana y el estado final es coherente.

**Fundamento**: principio IX: las transiciones de estado del pedido están entre las reglas críticas.

---

No quedan marcas **NEEDS CLARIFICATION**.
