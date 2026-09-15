# Investigación técnica · F-003 Compras e inventario

**Fecha**: 2026-09-14 · **Plan**: [plan.md](plan.md)

F-003 **reutiliza** las decisiones de F-001 ([`research.md`](../001-acceso-personal/research.md), R-01
a R-16) y de F-002 ([`research.md`](../002-catalogos/research.md), C-01 a C-11), y el código ya
implementado: esquema de 18 tablas con sus CHECK e índices únicos parciales, `requerirSesion`,
`ErrorDeNegocio` con enlace, esquemas comunes, `Filtros`, `Selector`, `Tabla`, los selectores de
proveedores y productos activos y `src/lib/fechas.ts`. Aquí solo se registran las decisiones
**nuevas**, con el formato **Decisión / Fundamento / Alternativas descartadas**.

---

## K-01 · `registrarMovimiento()`: la única puerta del stock (concreta R-11)

**Decisión**: `src/servicios/inventario.ts` exporta dos funciones que solo se usan **dentro** de una
transacción interactiva (`prisma.$transaction(async (tx) => …)`):

1. `bloquearProductos(tx, productoIds)`: bloquea las filas con
   `SELECT id, codigo, nombre, stock_actual FROM producto WHERE id IN (…) ORDER BY id FOR UPDATE`
   (consulta parametrizada con `tx.$queryRaw` y `Prisma.join`) y devuelve el stock de cada producto.
   El `ORDER BY id` hace que dos documentos con los mismos productos los bloqueen siempre en el mismo
   orden: no hay interbloqueos.

   **Se bloquea siempre antes de insertar filas que referencien al producto** (líneas de compra o de
   pedido, movimientos). Al insertar una de esas filas, PostgreSQL toma sobre el producto un bloqueo
   `FOR KEY SHARE`, por la clave foránea, y `FOR UPDATE` choca con él. Si dos transacciones insertaran
   primero y bloquearan después, cada una esperaría a la otra y PostgreSQL abortaría una por
   interbloqueo.
2. `registrarMovimiento(tx, { productoId, tipo, cantidad, fechaDocumento, compraId | distribucionId,
   usuarioId })`: vuelve a leer la fila bloqueada (dentro de la misma transacción el bloqueo ya es
   suyo), calcula `saldo = stock_actual + cantidad`, rechaza si `saldo < 0`, inserta el movimiento con
   ese `saldo_resultante` y guarda `stock_actual = saldo`. Devuelve el saldo.

Ningún otro archivo de `src/` escribe `stockActual`; una prueba lo verifica leyendo el código, como la
de F-002 (SC-005).

**Fundamento**: principio III en una frase: "bloqueo la fila del producto, leo su stock, verifico que
no quede negativo y escribo movimiento y stock juntos". Mientras la fila está bloqueada, ninguna otra
transacción puede leer el stock para modificarlo, así que el saldo de cada movimiento es el del
anterior más su cantidad (RN-51) y el orden de `id` es el orden de registro.

**Por qué se toma el saldo de `stock_actual` y no del último movimiento**: son iguales siempre
(RN-50, que verifica K-08); leer una fila ya bloqueada es más simple que buscar el último movimiento.

**Alternativas descartadas**:
- *`UPDATE producto SET stock_actual = stock_actual + x WHERE stock_actual + x >= 0`*: atómico, pero el
  saldo del movimiento exige otra lectura y la regla queda escondida en un `WHERE`.
- *`SERIALIZABLE` con reintentos*: correcto, pero hay que explicar y probar los reintentos.
- *Trigger que actualice el stock*: prohibido por el principio II.

---

## K-02 · Anulación: primero el estado, después todos los productos a la vez

**Decisión**: `anularCompra(id, motivo, usuarioId)` hace, en una transacción:

1. `compra.updateMany({ where: { id, estado: "REGISTRADA" }, data: { estado: "ANULADA", motivo,
   anuladaEn, anuladaPorId } })`. Si actualizó 0 filas, la compra no existe o ya estaba anulada
   (RN-26) y se rechaza. Esa actualización deja la fila de la compra bloqueada: si dos personas anulan
   a la vez, la segunda espera y, al continuar, ya no la encuentra REGISTRADA.
2. `bloquearProductos` con los productos de sus líneas y cálculo de **todos** los faltantes
   (`stock_actual − cantidad < 0`). Si hay alguno, se lanza **un** error que los lista a todos
   (FR-013): "No se puede anular: faltan 7 unidades de 'Lavandina 1 L' (stock actual 3, a revertir
   10)", separados por "; " si son varios. La transacción se deshace y la compra sigue REGISTRADA.
3. Un `registrarMovimiento` por línea, en orden de producto, con cantidad negativa, tipo
   `ANULACION_COMPRA` y `fechaDocumento` = fecha de la compra (RN-53).

**Fundamento**: la anulación es completa o no ocurre (Historia 5, E6), y el usuario ve de una vez
todo lo que impide anular en lugar de corregir producto por producto.

**Alternativas descartadas**: dejar que `registrarMovimiento` falle en el primer producto sin stock
(el mensaje solo nombraría uno); bloquear la compra con `SELECT … FOR UPDATE` aparte (la actualización
condicional ya bloquea y además decide).

---

## K-03 · Formulario de compra con líneas dinámicas

**Decisión**: `formulario-compra.tsx` es un componente de cliente que guarda la cabecera y las líneas
en estado de React (`useState`). Al guardar arma un objeto `{ proveedorId, nroFactura, fecha,
observacion, lineas: [{ productoId, cantidad, precioUnitario }] }`, lo valida con `esquemaCompra` y
llama a `registrarCompraAccion(datos)`. La acción recibe ese objeto (Next.js serializa objetos simples
en las Server Actions) y lo vuelve a validar con el mismo esquema.

Los errores se devuelven por **ruta** (`"lineas.1.cantidad"`) con una función
`erroresPorRuta(error)` en `src/lib/errores.ts`, y cada línea los muestra junto a su campo, con el
número de línea en el mensaje del aviso general: "Línea 2: la cantidad debe ser un número entero
mayor que 0" (FR-007). El formulario nunca se vacía si el servidor rechaza, porque su estado vive en
React.

**Fundamento**: un `FormData` plano no representa bien una lista de líneas; con `lineas.0.cantidad`
habría que reconstruir el objeto a mano en el servidor. Un objeto validado por Zod es lo más directo y
el esquema sigue siendo uno solo (principio VI). `z.flattenError` solo informa el primer nivel, por eso
la función de rutas.

**Alternativas descartadas**: React Hook Form con `useFieldArray` (dependencia nueva que explicar);
un formulario por línea guardado de a uno (rompe "todo o nada", RN-20); campos con nombres indexados
en `FormData`.

---

## K-04 · Montos: centavos en el navegador, `Prisma.Decimal` en el servidor

**Decisión**:
- El esquema recibe el precio como **texto** ("12,50" o "12.50"), igual que el precio referencial de
  F-002 (C-08): obligatorio, mayor que 0, hasta 2 decimales y hasta 10 dígitos enteros. Se reutiliza
  la misma regla, extraída a `src/esquemas/comunes.ts` como `montoPositivo(mensaje)`.
- La **vista previa** del formulario calcula en **centavos enteros**: `aCentavos("12,50") = 1250`,
  `subtotal = cantidad × centavos`, `total = Σ subtotales`, y se muestra con `formatearCentavos`
  ("Bs 245,00"). Con enteros no hay errores de coma flotante (`0,1 + 0,2`).
- El esquema rechaza, con los mismos centavos, una compra cuyo total supere 9 999 999 999,99
  ("El total de la compra no puede superar Bs 9.999.999.999,99").
- El **servidor** calcula lo que se guarda con `Prisma.Decimal`: `subtotal = precio.mul(cantidad)`,
  `total = Σ subtotales`, y vuelve a verificar el máximo. Cualquier `subtotal` o `total` que llegue en
  los datos se descarta, porque el esquema no tiene esos campos (RN-23, X-14). La base respalda con
  `compra_detalle_subtotal_exacto` y `compra_total_no_negativo`.

**Fundamento**: el principio VI exige que el servidor calcule los montos; la vista previa solo ayuda
a cargar. `decimal(12,2)` de PostgreSQL y `Prisma.Decimal` son exactos.

**Alternativas descartadas**: `number` de JavaScript para montos (redondeos); guardar centavos en la
base (el esquema ya es `decimal(12,2)` por la constitución).

---

## K-05 · Aviso inmediato de factura duplicada

**Decisión**: una Server Action de solo lectura, `verificarFacturaAccion(proveedorId, nroFactura)`,
que el formulario llama **al salir del campo** Nº de factura y **al cambiar el proveedor** si ya hay
un número escrito. Devuelve `{ duplicada: true, compraId }` si existe una compra REGISTRADA con ese
proveedor y número; el formulario muestra "La factura 1234 ya está registrada para este proveedor" con
el enlace "Ver compra". Al guardar, `registrarCompra` verifica de nuevo y, si dos registros
simultáneos pasan la verificación, decide el índice único parcial `compra_factura_vigente_unica`: el
error P2002 se convierte en el mismo mensaje y la transacción completa se deshace (ningún stock
cambia).

**Fundamento**: RN-21 pide avisar al salir del campo y validar otra vez al guardar. El aviso es una
ayuda; la autoridad es la base.

**Alternativas descartadas**: verificar en cada tecla (consultas innecesarias); una ruta de API
aparte (una Server Action ya exige sesión y se tipa sola).

---

## K-06 · Fechas de la compra

**Decisión**: la fecha se escribe con `<input type="date">` (texto `AAAA-MM-DD`), por defecto hoy en
La Paz. El esquema exige formato válido (`esFechaValida`) y que no sea posterior a `hoyEnLaPaz()`
("La fecha de la compra no puede ser futura"). Se guarda en la columna `date` como
`new Date("AAAA-MM-DDT00:00:00Z")` y se muestra con el mismo texto convertido a `dd/mm/aaaa`, sin
pasar por zonas horarias. No hay límite inferior (Supuestos de la especificación). El momento de
registro (`creado_en`, `registrado_en`) lo pone la base.

**Fundamento**: R-12 de F-001. Una columna `date` no tiene hora: tratarla como texto evita que la
fecha se corra un día al convertirla a la hora de Bolivia.

**Nota**: el esquema calcula "hoy" al validar. Si el cliente y el servidor están en días distintos a
medianoche, decide el servidor.

---

## K-07 · Consulta de existencias

**Decisión**: `listarExistencias({ q, categoriaId, estado, soloBajoMinimo })` en
`src/servicios/inventario.ts` trae los productos con categoría y unidad, filtra en memoria como los
catálogos (C-01) y ordena **primero los bajo mínimo y luego por nombre**. El filtro `estado` tiene
tres valores:

| Valor | Muestra | Etiqueta |
|---|---|---|
| `habituales` (por defecto) | activos, e inactivos con stock mayor que 0 | "Activos e inactivos con stock" |
| `inactivos` | solo inactivos, con o sin stock | "Inactivos" |
| `todos` | todos | "Todos" |

El encabezado muestra el total de filas y cuántos están bajo mínimo; solo cuentan los activos
(RN-52). Cada fila enlaza a `/kardex/[productoId]`.

**Fundamento**: con decenas de productos, filtrar en memoria es inmediato y la regla "inactivo con
stock" queda en una línea legible. SC-007 pide encontrar los bajo mínimo en menos de 30 s: ordenarlos
arriba y contarlos lo resuelve sin interacción.

**Alternativas descartadas**: reutilizar el listado de productos de F-002 (tiene otro orden y otro
filtro de estado); consulta SQL con `CASE` para ordenar (menos legible que un `sort`).

---

## K-08 · Kardex y verificación de consistencia

**Decisión**:
- `obtenerKardex(productoId, { desde?, hasta? })` devuelve los movimientos del producto ordenados por
  `id` (orden de registro, RN-51), con el documento de origen: compra → Nº de factura y razón social;
  distribución (F-005) → Nº de vale y representante. Sin rango se muestran todos y el saldo anterior
  es 0. Con rango, se listan los que tienen `fechaDocumento` en el rango y se calculan con
  `movimientoInventario.aggregate({ _sum: { cantidad } })`:
  - **saldo anterior** = suma con `fechaDocumento < desde`;
  - **saldo final** = suma con `fechaDocumento ≤ hasta` (RN-53).
- El kardex **no se pagina**: con el histórico simulado de 36 meses un producto tiene unos cientos de
  movimientos, que una tabla muestra sin problemas y que conviene ver completos para explicar el stock.
- `verificarConsistenciaInventario()` agrupa los movimientos por producto
  (`movimientoInventario.groupBy({ by: ["productoId"], _sum: { cantidad: true } })`), compara con
  `stock_actual` de cada producto (un producto sin movimientos suma 0) y devuelve los productos
  revisados y los que tienen diferencia. Se muestra en `/existencias/verificacion`, que calcula al
  abrirse (FR-020: "a pedido").
- La igualdad encadenada de saldos (RN-51) la demuestran las pruebas de integración, incluidas las de
  operaciones simultáneas.

**Fundamento**: todo con consultas de Prisma, sin SQL de negocio. La verificación es de lectura y no
necesita bloquear nada.

**Alternativas descartadas**: función de ventana en SQL para comprobar RN-51 en toda la tabla (SQL
crudo difícil de explicar para algo que ya prueban los tests); paginar el kardex (partiría la lectura
del saldo).

---

## K-09 · Listado de compras

**Decisión**: `listarCompras({ desde, hasta, proveedorId?, estado, factura?, pagina })` filtra en la
base por `fecha` entre `desde` y `hasta` (por defecto, primer día del mes en curso y hoy), proveedor,
estado (`todas` por defecto, `registradas`, `anuladas`) y Nº de factura **que empieza con** lo escrito;
ordena por `fecha` descendente y luego `id` descendente, con la cantidad de ítems (`_count.lineas`), y
**pagina de 50 en 50** con el mismo patrón que el historial de sesiones de F-001.

**Fundamento**: a diferencia de los catálogos (C-02), las compras crecen sin límite (36 meses
simulados), así que se filtra en la base y se pagina. "Empieza con" permite escribir parte del número
sin traer facturas que solo lo contienen en el medio.

---

## K-10 · Pantallas y navegación

**Decisión**:
- Rutas (reservadas en F-001, `contracts/rutas.md`): `/compras`, `/compras/nueva`, `/compras/[id]`,
  `/existencias`, `/existencias/verificacion` (nueva) y `/kardex/[productoId]`.
- La ficha de la compra no tiene "Editar" ni "Borrar": solo **"Anular compra"** si está REGISTRADA,
  con un formulario de motivo (hasta 200 caracteres) y confirmación que advierte que el stock se
  revierte (D-16).
- El menú suma **Compras** y **Existencias** en la primera fila; la ficha del producto de F-002 suma
  el enlace **"Ver kardex"**, y la página de inicio, los accesos.
- Después de registrar se redirige a `/compras/[id]?aviso=registrada`; después de anular se queda en
  la ficha con el aviso de resultado.

**Fundamento**: usa los nombres de rutas ya acordados y el mismo patrón de fichas y acciones de F-002.

---

## K-11 · Registrar una compra: orden de las operaciones

**Decisión**: `registrarCompra(datos, usuarioId)`:

1. Fuera de la transacción, lecturas que dan mensajes claros: proveedor existe y está activo; todos
   los productos existen y están activos (RN-14, un solo `findMany`); factura libre (K-05).
2. Cálculo de subtotales y total con `Prisma.Decimal` y control del máximo (K-04).
3. Transacción: **primero** `bloquearProductos` con los productos ordenados por `id` (K-01); después
   crear la compra con sus líneas (`lineas: { create: [...] }`); un `registrarMovimiento` `ENTRADA_COMPRA` por línea con
   `fechaDocumento` = fecha de la compra.
4. Si la transacción falla por P2002 del índice de factura, se responde con el mensaje de factura
   duplicada. Cualquier otro error deshace todo (RN-20, X-01).

Un producto repetido en las líneas lo detecta el esquema indicando las dos líneas ("Línea 3: el
producto ya está en la línea 1; modifica su cantidad"), y la restricción
`(compra_id, producto_id)` lo respalda (RN-22).

**Riesgo aceptado** (como C-06): si mientras se guarda otra sesión desactiva el proveedor o un
producto, la compra igual se registra. Con 1 a 3 usuarios es improbable y no rompe el inventario.

---

## K-12 · Pruebas de concurrencia

**Decisión**: las pruebas de integración lanzan operaciones simultáneas con `Promise.all` sobre la
base real, cada una con su propia transacción:

| Caso | Se espera |
|---|---|
| 10 compras simultáneas del mismo producto | stock = suma; saldos 1…n sin repetir; RN-50 y RN-51 se cumplen |
| 2 compras simultáneas con la misma factura y proveedor | exactamente una se guarda; la otra recibe el mensaje de duplicado; el stock sube una sola vez |
| 2 compras simultáneas con los productos A y B en orden inverso | ambas se guardan (sin interbloqueo) |
| 2 anulaciones simultáneas de la misma compra | una anula; la otra recibe "ya está anulada"; el stock se revierte una sola vez |
| Anulación con stock insuficiente en una de varias líneas | nada cambia |

`registrarCompra` y `anularCompra` abren su transacción con
`prisma.$transaction(fn, { maxWait: 10_000, timeout: 10_000 })`. Por defecto Prisma espera 2 s por
una conexión libre y corta la transacción a los 5 s. Con varias compras simultáneas que esperan el
mismo bloqueo, esos límites se alcanzarían sin que haya ningún error real.

**Fundamento**: el principio IX pone los movimientos de stock y la no negatividad entre las reglas
que deben quedar demostradas; sin concurrencia real, el `FOR UPDATE` no se probaría.

**Ayudante de pruebas**: `crearMovimientoDePrueba` de F-002 pasa a usar `registrarCompra`, para que
ninguna prueba escriba el stock por fuera de la función central.

---

No quedan marcas **NEEDS CLARIFICATION**.
