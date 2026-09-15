# Investigación técnica · F-005 Distribución

**Fecha**: 2026-09-15 · **Plan**: [plan.md](plan.md)

F-005 **reutiliza** las decisiones de F-001 (R-01 a R-16), F-002 (C-01 a C-11), F-003 (K-01 a K-12) y
F-004 (P-01 a P-12), y el código ya implementado: tablas `distribucion` y `distribucion_detalle` con sus
CHECK y el índice único parcial del vale, `registrarMovimiento` y `bloquearProductos` (única escritura
del stock), `bloquearPedido` y `recalcularEstadoPedido` (estado del pedido), `listarPedidos`,
`erroresPorRuta`, fechas de documento, `Paginacion`, el patrón del formulario con líneas y el de la
anulación con motivo. Aquí solo se registran las decisiones **nuevas**, con el formato **Decisión /
Fundamento / Alternativas descartadas**. El prefijo es **V** (vale).

---

## V-01 · Registro: una transacción con el pedido y los productos bloqueados

**Decisión**: `registrarDistribucion(datos, usuarioId)` en `src/servicios/distribuciones.ts`:

1. **Antes de la transacción**, con mensajes claros: el vale no está en otra distribución REGISTRADA
   (aviso con enlace "Ver distribución").
2. **Transacción** (`OPCIONES_TRANSACCION` de 10 s, K-12):
   1. `bloquearPedido(tx, pedidoId)`: si no existe, "No existe el pedido indicado"; si está ATENDIDO,
      "El pedido ya está atendido: no queda nada por entregar"; si está ANULADO, "El pedido está anulado:
      no se puede distribuir" (FR-001, FR-012 de F-004).
   2. Lee la fecha del pedido y sus líneas con lo entregado **vigente**; verifica que cada línea enviada
      pertenezca al pedido y que la fecha de la distribución no sea anterior a la del pedido.
   3. `bloquearProductos(tx, ids)` en orden de `id` y **antes** de insertar filas que los referencien
      (K-01): devuelve el stock vigente.
   4. Calcula, para **todas** las líneas con cantidad, el máximo entregable `min(pendiente, stock)`. Si
      alguna lo supera, rechaza con un único mensaje que las nombra a todas (V-03) y la transacción no
      guarda nada (RN-30, FR-005).
   5. Crea la distribución con sus líneas (`pedidoDetalleId`, `cantidad`).
   6. `registrarMovimiento` por línea, en orden de producto: `SALIDA_DISTRIBUCION`, cantidad negativa,
      `fechaDocumento` = fecha de la distribución (FR-007, RN-53).
   7. Suma la cantidad a `cantidad_entregada` de cada línea del pedido y llama a
      `recalcularEstadoPedido` (RN-34, RN-41).
3. Si la base rechaza el vale por el índice único parcial (dos registros simultáneos con el mismo vale),
   se responde con el mismo mensaje de duplicado (K-05, RN-31).

**Fundamento**: aplica literalmente la regla de concurrencia de todo el sistema: "primero el pedido,
después los productos" (P-03, K-01). Con el pedido bloqueado, dos distribuciones del mismo pedido se
ordenan solas y la segunda ve el pendiente nuevo; con los productos bloqueados, dos distribuciones de
pedidos distintos con el mismo producto ven el stock vigente. Una compra solo bloquea productos y no
espera pedidos, así que no se forma un ciclo. Verificar pendiente y stock **dentro** de la transacción
es lo que exige RN-32; `registrarMovimiento` además vuelve a impedir el stock negativo.

**Alternativas descartadas**: verificar fuera de la transacción (dos distribuciones simultáneas dejarían
stock negativo, defecto X-03); `SERIALIZABLE` con reintentos (más difícil de explicar); bloquear las
líneas del pedido en lugar del pedido (F-004 ya ordena todo por el pedido).

---

## V-02 · Formulario de distribución: una fila por línea del pedido

**Decisión**: el formulario recibe el pedido preparado por `obtenerPedidoParaDistribuir(pedidoId)` y
muestra **todas** sus líneas, cada una con producto (marcado "(inactivo)" si corresponde), unidad,
solicitado, entregado, pendiente, stock actual y **máximo entregable** (RN-36, FR-002):

| Situación de la línea | Muestra | Cantidad |
|---|---|---|
| pendiente = 0 | "Completa" | no admite |
| pendiente > 0 y stock = 0 | "Sin stock" | no admite |
| otro caso | "Máximo {n}" | campo con `max` = máximo entregable |

El formulario envía un objeto `{ pedidoId, nroVale, fecha, observacion, lineas: [{ pedidoDetalleId,
cantidad }] }` con **una entrada por fila**, aunque esté vacía; la validación y el servicio ignoran las
vacías (RN-33). Así el índice de cada error (`lineas.2.cantidad`) coincide con la fila en pantalla. Mismo
patrón que el formulario de compra y el de pedido (K-03, P-09): estado de React, mismo esquema en cliente y
servidor, errores por ruta y datos conservados si el servidor rechaza (FR-009).

**Fundamento**: el encargado ve de un vistazo qué falta y qué se puede entregar; el máximo mostrado es
informativo y la autoridad es la verificación con bloqueo (caso borde "stock que cambia mientras se llena
el formulario").

**Alternativas descartadas**: agregar líneas eligiendo productos como en la compra (el pedido ya dice qué
productos van); enviar solo las líneas con cantidad (los índices de error dejarían de coincidir con las
filas); "Entregar todo lo posible" automático (no está en la especificación).

---

## V-03 · Validación: esquema común y verificación con el pedido y el stock vigentes

**Decisión**:

- `esquemaDistribucion` (Zod, cliente y servidor): `pedidoId` obligatorio; `nroVale` solo dígitos, de 1 a
  20 ("El Nº de vale solo admite dígitos, hasta 20"), **sin** quitar ceros a la izquierda; `fecha` con
  `fechaNoFutura("La fecha de la distribución no puede ser futura")`; `observacion` opcional hasta 200;
  cada línea con `pedidoDetalleId` y `cantidad` vacía o entera de 1 a 1 000 000; en el conjunto, al menos
  una línea con cantidad ("Entrega al menos un producto: escribe la cantidad en una línea").
- En el servicio, con el pedido y los productos bloqueados:
  - fecha ≥ fecha del pedido: "La fecha de la distribución debe estar entre el {dd/mm/aaaa del pedido} y
    hoy" (campo `fecha`);
  - línea ajena al pedido: "Línea {n}: el producto no pertenece al pedido";
  - cantidad > máximo entregable: "{producto}: puedes entregar como máximo {máximo} (pendiente {p},
    stock {s})" en `lineas.{i}.cantidad`; si varias líneas fallan, se juntan con "; " y el campo
    marcado es el de la primera.

**Fundamento**: el esquema no conoce el pedido ni el stock; lo que depende de ellos se decide con los datos
bloqueados. Un único formato de mensaje cubre los dos motivos (Historia 1 · E3 y E4) y dice qué corregir
(FR-009, FR-017). Ceros a la izquierda: "0500" y "500" son vales distintos, como las facturas (caso borde).

**Alternativas descartadas**: pasar pendiente y stock al esquema del cliente como autoridad (quedarían
viejos); rechazar en la primera línea que falla (obligaría a corregir y guardar varias veces, igual que se
evitó en K-02).

---

## V-04 · Vale único: aviso al escribir y decisión de la base

**Decisión**: igual que la factura de compra (K-05). `verificarValeAccion(nroVale)` es una Server Action
de solo lectura que el formulario llama al salir del campo; si el vale está en una distribución REGISTRADA,
muestra "El vale {n} ya está registrado" con enlace a esa distribución. Al guardar, el servicio vuelve a
buscarlo y, si dos registros simultáneos pasan esa verificación, decide el índice único parcial
`distribucion_vale_vigente_unico`: el error P2002 se traduce al mismo mensaje y la transacción se deshace
completa (FR-004, SC-004). Un vale de una distribución ANULADA queda libre (Historia 4 · E7).

**Fundamento**: avisar antes evita cargar las cantidades para nada; la base es la autoridad sin bloqueos
adicionales.

**Alternativas descartadas**: verificar en cada tecla; bloquear una tabla de vales.

---

## V-05 · Elegir el pedido para distribuir

**Decisión**: `/distribuciones/nueva` sin parámetros muestra los pedidos **por atender** con
`listarPedidos({ estado: "por-atender" })` de F-004 (Nº, fecha, representante, servicio, % atendido) y un
botón "Distribuir" por fila. Con `?pedido={id}` muestra el formulario; si el pedido no existe responde 404,
y si está ATENDIDO o ANULADO muestra "El pedido Nº {id} está {estado}: solo se distribuyen pedidos
pendientes o parciales" con enlace a su ficha. La ficha del pedido (F-004) ya enlaza a
`/distribuciones/nueva?pedido={id}`.

**Fundamento**: los pedidos ATENDIDOS y ANULADOS nunca aparecen para elegir (Historia 2 · E4) y se
reutiliza la consulta que ya existe, sin una segunda definición de "por atender".

**Alternativas descartadas**: selector desplegable de pedidos en el formulario (con muchos pedidos es
ilegible y no muestra el % atendido).

---

## V-06 · Anulación: primero el pedido, después la distribución y los productos

**Decisión**: `anularDistribucion(id, motivo, usuarioId)`, en una transacción:

1. Lee el `pedidoId` de la distribución (no cambia nunca) y ejecuta `bloquearPedido`.
2. `distribucion.updateMany({ where: { id, estado: "REGISTRADA" } })` a ANULADA con motivo, momento y
   usuario. Si no cambia ninguna fila: "La distribución ya está anulada" (FR-015). Esta actualización
   bloquea la distribución: una anulación doble simultánea revierte una sola vez (como K-02).
3. `bloquearProductos` de sus líneas, en orden de `id`.
4. `registrarMovimiento` por línea: `ANULACION_DISTRIBUCION`, cantidad **positiva**, `fechaDocumento` = fecha
   de la distribución anulada (RN-53).
5. Resta la cantidad de `cantidad_entregada` de cada línea del pedido y llama a `recalcularEstadoPedido`,
   que deja igual un pedido ANULADO (RN-35).

No hace falta verificar stock: una anulación de distribución solo suma. Se permite sin plazo (caso borde).

**Fundamento**: mismo orden de bloqueo que el registro (pedido → productos), así la anulación y un
registro del mismo pedido nunca se esperan en círculo. La edición del pedido que volvió a PENDIENTE ve el
estado recalculado (F-004, P-03).

**Alternativas descartadas**: bloquear la distribución antes que el pedido (invertiría el orden respecto
del registro y de la anulación del pedido); borrar la distribución (principio IV).

---

## V-07 · Listado de distribuciones

**Decisión**: `listarDistribuciones({ desde, hasta, representanteId, productoId, estado, vale, pagina })`:

| Filtro | Valores | Por defecto |
|---|---|---|
| `desde`, `hasta` | fechas de la distribución | mes en curso hasta hoy (como compras, K-09) |
| `representante` | id; se filtra por `pedido.representanteId` (X-08) | todos |
| `producto` | id; distribuciones con alguna línea de ese producto | todos |
| `estado` | `todas`, `registradas`, `anuladas` | `todas` |
| `vale` | dígitos; "empieza con" | — |
| `pagina` | entero ≥ 1 | 1 |

Orden: fecha descendente y luego `id` descendente. 50 por página. Columnas: fecha, Nº de vale, Nº de
pedido, representante, servicio, productos (cantidad de líneas), **unidades entregadas** (suma de
cantidades con `distribucionDetalle.groupBy` de las filas de la página) y estado.

**Fundamento**: mismo patrón que el listado de compras; las distribuciones crecen sin límite con 36 meses
simulados.

**Alternativas descartadas**: filtrar en memoria; sumar unidades con SQL crudo.

---

## V-08 · Detalle y acciones

**Decisión**: `obtenerDistribucion(id)` devuelve Nº de vale, fecha, observación, estado, pedido (Nº,
fecha, estado), representante con servicio y centro de salud **obtenidos del pedido** (FR-008, X-08),
líneas con código, producto, unidad y cantidad, registrada por y cuándo, y datos de anulación. La ficha
`/distribuciones/[id]` no ofrece editar ni borrar (FR-012): solo "Imprimir vale" y, si está REGISTRADA,
el formulario "Anular distribución" con motivo y confirmación, con el mismo patrón que la anulación de
compras (`useValidacion` + `useActionState`). Después de registrar se redirige a la ficha con
`?aviso=registrada`.

**Fundamento**: D-16 en pantalla: la única corrección posible es la anulación, y se ve.

---

## V-09 · Vista de impresión del vale

**Decisión**: la ruta reservada `/distribuciones/[id]/vale` vive en un grupo de rutas propio,
`src/app/(impresion)/distribuciones/[id]/vale/page.tsx`, con un layout sin menú que también llama a
`requerirSesion()`. Muestra el centro de salud, Nº de vale, fecha, Nº de pedido, representante y
servicio, tabla de productos con unidad y cantidad, observación y dos espacios de firma ("Entregado por",
"Recibido por"); si está ANULADA, la leyenda **ANULADA** grande y visible. Los controles "Imprimir"
(`window.print()`, componente de cliente mínimo) y "← Volver" llevan la clase `print:hidden` y no salen
en la hoja (precisión agregada a la especificación).

**Fundamento**: un grupo de rutas permite otra estructura de página sin cambiar la URL reservada en F-001
(`node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`, "Route groups"). La
impresión del navegador ya genera PDF, sin dependencias nuevas. Es P3: si el plazo aprieta, es lo primero
que se corta (00 §5).

**Alternativas descartadas**: generar PDF en el servidor (dependencia nueva); ocultar el menú del layout
del sistema solo al imprimir (en pantalla no sería una vista limpia).

---

## V-10 · Pantallas y navegación

**Decisión**: rutas reservadas en F-001: `/distribuciones`, `/distribuciones/nueva`,
`/distribuciones/[id]` y `/distribuciones/[id]/vale`. El menú suma **Distribuciones** después de Pedidos;
el inicio, su acceso ("Entregar productos para atender los pedidos y anular entregas mal registradas").
Los enlaces que ya apuntan a estas rutas desde el kardex (F-003) y la ficha del pedido (F-004) empiezan a
funcionar sin cambios.

---

## V-11 · Ayudantes de prueba con distribuciones reales

**Decisión**: `crearSalidaDePrueba` de `tests/ayudantes/inventario.ts` (F-003) pasa a registrar una
distribución real con `registrarDistribucion`, igual que `crearMovimientoDePrueba` usa `registrarCompra`
(I-21). `simularEntregaDePrueba` de F-004 se conserva para las pruebas de estado del pedido, que no
necesitan stock. Un nuevo `tests/ayudantes/distribuciones.ts` prepara pedido y stock con los servicios
reales (`registrarPedido`, `registrarCompra`) para cada prueba.

**Fundamento**: ninguna prueba escribe el stock por fuera de la función central (principio III), y las
pruebas de F-003 y F-004 siguen en verde sin cambiar sus expectativas.

---

## V-12 · Pruebas

**Decisión**:

- Unitarias: `esquemaDistribucion` (vale, fecha, cantidades, líneas vacías, al menos una), filtros del
  listado y `maximoEntregable`/situación de la línea (V-02) como funciones puras.
- Integración: registro completo (stock, kardex con saldo, entregado, estado, `fechaDocumento`), rechazos
  por stock, por pendiente, por vale y por fecha sin guardar nada (SC-003, SC-004, SC-007), líneas vacías,
  pedido ATENDIDO o ANULADO, entregas en varias distribuciones hasta ATENDIDO, anulación (stock, kardex
  positivo con la fecha de la distribución, entregado, estado, vale libre, pedido ANULADO que sigue
  ANULADO), listado con filtros, detalle.
- Concurrencia real con `Promise.allSettled`: dos distribuciones de pedidos distintos que juntas superan el
  stock; dos del mismo pedido que juntas superan lo pendiente; dos con el mismo vale; distribución contra
  anulación del pedido; anulación doble de la misma distribución.
- Invariantes: tras una secuencia de registros y anulaciones, `verificarConsistenciaInventario` informa 0
  diferencias (SC-006) y lo entregado de cada línea es la suma de sus distribuciones REGISTRADAS (SC-005);
  el servicio no exporta funciones para editar ni borrar y no llama a `delete` (FR-012); el stock solo se
  escribe en `inventario.ts` (prueba de F-003, sigue vigente).

**Fundamento**: principio IX: movimientos de stock y no negatividad, duplicados de vale y anulaciones son
reglas críticas.

---

No quedan marcas **NEEDS CLARIFICATION**. Pendiente externo: Q-04 (si el talonario reinicia su numeración
cada año); si Raymond lo confirma, cambia RN-31 y el índice único, no el diseño.
