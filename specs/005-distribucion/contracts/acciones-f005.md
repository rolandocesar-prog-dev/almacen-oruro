# Contrato de Server Actions, servicios y rutas · F-005

**Plan**: [../plan.md](../plan.md) · **Especificación**: [../spec.md](../spec.md) · **Convenciones
comunes**: [F-001](../../001-acceso-personal/contracts/acciones-f001.md),
[F-003](../../003-compras-inventario/contracts/acciones-f003.md) y
[F-004](../../004-pedidos/contracts/acciones-f004.md) (`ResultadoAccion` con `enlace` y errores por ruta;
orden fijo requerirSesion → Zod → servicio → errores → revalidar o redirigir).

## 1. Rutas

| Ruta | Archivo | Página | Parámetros (validados con Zod) |
|---|---|---|---|
| `/distribuciones` | `src/app/(sistema)/distribuciones/page.tsx` | Listado | `desde`, `hasta`, `representante`, `producto`, `estado`, `vale`, `pagina` (data-model §4) |
| `/distribuciones/nueva` | `src/app/(sistema)/distribuciones/nueva/page.tsx` | Sin `pedido`: pedidos por atender para elegir. Con `pedido`: formulario | `pedido` (id opcional; inválido → se muestra la lista) |
| `/distribuciones/[id]` | `src/app/(sistema)/distribuciones/[id]/page.tsx` | Detalle, anulación e "Imprimir vale" | `aviso` = `registrada` |
| `/distribuciones/[id]/vale` | `src/app/(impresion)/distribuciones/[id]/vale/page.tsx` | Vale para imprimir, sin menú (layout propio con `requerirSesion()`) | — |

Todas protegidas con `requerirSesion()`. Cambios en páginas existentes: menú (**Distribuciones** después de
Pedidos) e inicio (acceso). Los enlaces del kardex (F-003) y de la ficha del pedido (F-004) ya apuntan a
estas rutas.

---

## 2. Server Actions · `src/app/(sistema)/distribuciones/acciones.ts`

| Acción | Entrada | Servicio (`src/servicios/distribuciones.ts`) | Éxito | Errores de negocio |
|---|---|---|---|---|
| `registrarDistribucionAccion(datos: unknown)` | `esquemaDistribucion` (objeto) | `registrarDistribucion(datos, usuarioId)` | redirige a `/distribuciones/[id]?aviso=registrada` | pedido ATENDIDO, ANULADO o inexistente; vale duplicado (con enlace); fecha anterior al pedido; línea ajena; cantidades que superan el máximo |
| `anularDistribucionAccion(id: number, estadoPrevio, formData)` | `esquemaAnulacionDistribucion` | `anularDistribucion(id, motivo, usuarioId)` | `ok: true`, "Distribución anulada. El stock se repuso y lo entregado del pedido se descontó." | ya ANULADA; inexistente |
| `verificarValeAccion(nroVale: string)` | `nroVale` del esquema | `buscarValeVigente(nroVale)` | `{ duplicado: boolean, distribucionId? }` (solo lectura; con datos inválidos responde "no duplicado") | — |

`registrarDistribucionAccion` y `anularDistribucionAccion` revalidan `/distribuciones`,
`/distribuciones/[id]`, `/pedidos`, `/pedidos/[pedidoId]`, `/existencias` y `/kardex/[productoId]` de cada
producto, porque cambian stock y pedido. No existe acción para editar ni borrar distribuciones (FR-012).

---

## 3. Servicios · `src/servicios/distribuciones.ts`

| Función | Parámetros | Devuelve | Notas |
|---|---|---|---|
| `situacionDeLinea(pendiente, stock)` | enteros | `{ situacion: "completa" \| "sin-stock" \| "entregable", maximoEntregable }` | pura (data-model §2) |
| `obtenerPedidoParaDistribuir(pedidoId)` | id | pedido con representante, fecha, estado y líneas con situación, o `null` | FR-002 |
| `buscarValeVigente(nroVale)` | texto | `{ id } \| null` | RN-31 |
| `registrarDistribucion(datos, usuarioId)` | `DatosDistribucion`, id de sesión | `{ id, pedidoId, productoIds }` | research V-01 |
| `anularDistribucion(id, motivo, usuarioId)` | id, texto, id | `{ pedidoId, productoIds }` | research V-06 |
| `listarDistribuciones(filtro)` | data-model §4 | `{ distribuciones, total }` | con `unidades` |
| `obtenerDistribucion(id)` | id | detalle con pedido, representante, líneas y anulación, o `null` | FR-011, FR-016 |
| `DISTRIBUCIONES_POR_PAGINA` | — | `50` | |

Usa de otros módulos: `bloquearPedido` y `recalcularEstadoPedido` (`pedidos.ts`), `bloquearProductos` y
`registrarMovimiento` (`inventario.ts`). **No** escribe `stockActual` directamente.

## 4. Esquemas · `src/esquemas/distribuciones.ts`

`esquemaDistribucion`, `esquemaAnulacionDistribucion`, `esquemaFiltroDistribuciones`,
`esquemaAvisoDistribucion` (`aviso` = `registrada`), `esquemaPedidoParaDistribuir` (`pedido` opcional) y
los tipos `DatosDistribucion` y `FiltroDistribuciones`.

---

## 5. Componentes nuevos

| Componente | Tipo | Uso |
|---|---|---|
| `distribuciones/formulario-distribucion.tsx` | cliente | cabecera, aviso de vale al salir del campo, una fila por línea del pedido con su situación y máximo, errores por línea |
| `distribuciones/filtros-distribuciones.tsx` | cliente | filtros con `esquemaFiltroDistribuciones` |
| `distribuciones/[id]/anular-distribucion.tsx` | cliente | motivo, confirmación y resultado |
| `(impresion)/layout.tsx` | servidor | página en blanco con sesión obligatoria |
| `(impresion)/distribuciones/[id]/vale/boton-imprimir.tsx` | cliente | `window.print()`, oculto al imprimir |
