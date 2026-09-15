# Contrato de Server Actions, servicios y rutas · F-004

**Plan**: [../plan.md](../plan.md) · **Especificación**: [../spec.md](../spec.md) · **Convenciones
comunes**: [F-001](../../001-acceso-personal/contracts/acciones-f001.md),
[F-002](../../002-catalogos/contracts/acciones-f002.md) y
[F-003](../../003-compras-inventario/contracts/acciones-f003.md) (`ResultadoAccion` con `enlace` y
errores por ruta; orden fijo requerirSesion → Zod → servicio → errores → revalidar o redirigir).

## Cambios a las piezas comunes

- `src/esquemas/comunes.ts` suma `cantidadEntera(mensaje)` y `marcarProductosRepetidos(lineas, contexto)`;
  `src/esquemas/compras.ts` pasa a usarlas, sin cambiar reglas ni mensajes.
- `src/componentes/formularios/errores-de-lineas.ts` con `mensajesPorLinea(errores)`, extraída de
  `formulario-compra.tsx`.

---

## 1. Rutas

Todas bajo `src/app/(sistema)/`, protegidas con `requerirSesion()`.

| Ruta | Página | Parámetros (validados con Zod) |
|---|---|---|
| `/pedidos` | Listado de pedidos | `estado`, `representante`, `desde`, `hasta`, `pagina` (data-model §4) |
| `/pedidos/nuevo` | Registrar pedido | — |
| `/pedidos/[id]` | Detalle, anulación y acciones según el estado | `aviso` = `registrado` \| `modificado` (`esquemaAvisoFicha`) |
| `/pedidos/[id]/editar` | Editar un pedido PENDIENTE; si no lo está, muestra el motivo y el enlace a la ficha | — |

Cambios en páginas existentes: menú (**Pedidos** después de Compras), inicio (acceso), ficha del
representante ("Ver sus pedidos").

---

## 2. Server Actions · `src/app/(sistema)/pedidos/acciones.ts`

| Acción | Entrada | Servicio (`src/servicios/pedidos.ts`) | Éxito | Errores de negocio |
|---|---|---|---|---|
| `registrarPedidoAccion(datos: unknown)` | `esquemaPedido` (objeto) | `registrarPedido(datos, usuarioId)` | redirige a `/pedidos/[id]?aviso=registrado` | representante o producto inactivo |
| `editarPedidoAccion(id: number, datos: unknown)` | `esquemaPedido` | `editarPedido(id, datos)` | redirige a `/pedidos/[id]?aviso=modificado` | no PENDIENTE; representante o producto inactivo; línea con distribuciones anuladas |
| `anularPedidoAccion(id: number, estadoPrevio, formData)` | `esquemaAnulacionPedido` | `anularPedido(id, motivo, usuarioId)` | `ok: true`, "Pedido anulado. Lo entregado se conserva y el saldo pendiente quedó anulado." | ATENDIDO; ANULADO; inexistente |

Todas revalidan `/pedidos` y `/pedidos/[id]`. Ninguna toca el stock ni el kardex (FR-003, SC-003). No
existe acción para borrar pedidos ni para elegir su estado.

---

## 3. Servicios · `src/servicios/pedidos.ts`

| Función | Parámetros | Devuelve | Notas |
|---|---|---|---|
| `calcularEstadoPedido(lineas)` | `{ cantidadSolicitada, cantidadEntregada }[]` | `"PENDIENTE" \| "PARCIAL" \| "ATENDIDO"` | pura (research P-02) |
| `bloquearPedido(tx, pedidoId)` | transacción, id | `{ estado } \| null` | `SELECT … FOR UPDATE`; primera operación de editar, anular y F-005 |
| `recalcularEstadoPedido(tx, pedidoId)` | transacción, id | nuevo estado | no cambia un ANULADO; para F-005 |
| `registrarPedido(datos, usuarioId)` | `DatosPedido`, id de sesión | `{ id }` | |
| `editarPedido(id, datos)` | id, `DatosPedido` | `void` | sincroniza líneas (research P-04) |
| `anularPedido(id, motivo, usuarioId)` | id, texto, id | `void` | |
| `obtenerPedido(id)` | id | detalle con líneas, derivados, distribuciones y acciones permitidas, o `null` | |
| `listarPedidos(filtro)` | data-model §4 | `{ pedidos, total }` | con `porcentajeAtendido` |
| `listarProductosParaPedido(idsActuales?)` | ids que el pedido ya tiene (al editar) | `{ id, etiqueta, stockActual, abreviatura }[]` activos, más los actuales marcados "(inactivo)" | FR-005, FR-006 (I-25) |
| `accionesSegunEstado(estado)` | estado del pedido | `{ editar, anular, distribuir }` | FR-015 |
| `PEDIDOS_POR_PAGINA` | — | `50` | |

---

## 4. Componentes nuevos

| Componente | Tipo | Uso |
|---|---|---|
| `pedidos/formulario-pedido.tsx` | cliente | registrar y editar: cabecera, líneas con stock actual informativo, errores por línea |
| `pedidos/filtros-pedidos.tsx` | cliente | filtros con `esquemaFiltroPedidos` |
| `pedidos/insignia-pedido.tsx` | servidor | estado con texto y color |
| `pedidos/[id]/anular-pedido.tsx` | cliente | motivo, confirmación y resultado |
