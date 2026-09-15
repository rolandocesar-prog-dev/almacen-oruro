---
description: "Lista de tareas de implementación de F-003 · Compras e inventario"
---

# Tareas: F-003 · Compras e inventario

**Entrada**: documentos de diseño de `specs/003-compras-inventario/`

**Prerrequisitos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/acciones-f003.md](contracts/acciones-f003.md),
[quickstart.md](quickstart.md). F-001 y F-002 implementadas (esquema de 18 tablas, catálogos,
selectores de proveedores y productos activos).

**Pruebas**: se incluyen (constitución, principio IX; [quickstart §2](quickstart.md#2-pruebas-automatizadas)).
Las de integración usan PostgreSQL real: **Docker Desktop debe estar abierto**.

**Sin migraciones ni dependencias nuevas** (plan, "Contexto técnico").

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[US#]**: historia de usuario de [spec.md](spec.md)

| Etiqueta | Historia de spec.md | Prioridad |
|---|---|---|
| US1 | Historia 1 · Registrar una compra | P1 |
| US2 | Historia 2 · Consultar las existencias | P1 |
| US3 | Historia 3 · Consultar el kardex de un producto | P1 |
| US4 | Historia 4 · Listar compras y ver su detalle | P1 |
| US5 | Historia 5 · Anular una compra mal registrada | P2 |

**Patrón de páginas y acciones**: el de F-002 ([tasks F-002](../002-catalogos/tasks.md), "Patrón de
cada catálogo"): `requerirSesion()` como primera instrucción de cada página y acción; `searchParams`
validado con un esquema Zod (valor inválido → valores por defecto); acciones en el orden
requerirSesion → Zod → servicio → `aResultadoDeError` → `revalidatePath` → redirigir o devolver
resultado; comentario con la RN o FR en cada regla.

---

## Fase 1: Preparación

**Propósito**: confirmar que el punto de partida está sano antes de tocar código compartido.

- [X] T001 Verificar el entorno: `docker info` responde, el contenedor `almacen-oruro-postgres` está *healthy*, y `npm run lint`, `npm run typecheck` y `npm test` terminan sin errores con las 198 pruebas de F-001 y F-002 en verde; anotar el resultado para compararlo al final

---

## Fase 2: Fundamentos (bloquea todas las historias)

**Propósito**: utilidades comunes y el núcleo del stock que usan las cinco historias (y F-005).

**⚠️ CRÍTICO**: ninguna historia empieza antes de terminar esta fase.

- [X] T002 [P] Agregar a `src/lib/errores.ts` la función `erroresPorRuta(error: ZodError): Partial<Record<string, string[]>>` que agrupa `error.issues` por `issue.path.join(".")` (por ejemplo `"lineas.1.cantidad"`; los errores de primer nivel quedan con el nombre del campo, igual que `z.flattenError`), con comentario del porqué (research K-03); crear `tests/unitarios/errores-por-ruta.test.ts` con un objeto con líneas que produce `"lineas.1.cantidad"` y `"proveedorId"`, y dos mensajes en la misma ruta
- [X] T003 [P] Agregar a `src/lib/dinero.ts` `aCentavos(texto: string): number | null` (acepta coma o punto, `^\d{1,10}([.,]\d{1,2})?$`, devuelve centavos enteros sin pasar por coma flotante: "12,5" → 1250, "12,50" → 1250, "0,05" → 5; texto inválido → `null`) y `formatearCentavos(centavos: number): string` ("Bs 1.234,50", con `toLocaleString("es-BO")` sobre la parte entera), con comentario de por qué centavos (research K-04); crear `tests/unitarios/dinero.test.ts`: 10 × 1250 + 4 × 3000 = 24 500 → "Bs 245,00"; "12,505", "abc" y "" → `null`; `formatearCentavos(123450)` = "Bs 1.234,50"; `formatearBolivianos("245.00")` sigue dando "Bs 245,00"
- [X] T004 Agregar a `src/esquemas/comunes.ts`: `montoPositivo(mensaje)` (texto recortado, coma reemplazada por punto, obligatorio, `^\d{1,10}(\.\d{1,2})?$` y mayor que 0, devuelve el texto con punto); `fechaNoFutura(mensajeFutura)` (texto `AAAA-MM-DD` con `esFechaValida`, "Escribe una fecha válida", y `≤ hoyEnLaPaz()` con el mensaje dado); `fechaDeFiltro(porDefecto?)` movida desde `src/esquemas/acceso.ts` (vacío → ausente, "Usa una fecha válida", valor por defecto opcional); hacer que `src/esquemas/acceso.ts` importe `fechaDeFiltro` sin cambiar reglas ni mensajes; y reconstruir `esquemaPrecioReferencial` de `src/esquemas/catalogos/proveedor-producto.ts` como `montoPositivo(...)` opcional (vacío → `undefined`) con el mismo mensaje "Escribe un precio mayor que 0 con hasta 2 decimales"; crear `tests/unitarios/esquemas-comunes-montos-fechas.test.ts` (monto "12,50" → "12.50", "0" y "12,505" rechazados; fecha de mañana rechazada, hoy aceptada, "2026-02-30" rechazada; y, con `vi.setSystemTime`, que a las 21:30 de La Paz (01:30 UTC del día siguiente) la fecha de ese día es hoy y la del día siguiente es futura, y que a las 00:30 de La Paz se acepta la fecha del día anterior, research K-06); ejecutar `npm test` y confirmar que las pruebas de F-001 y F-002 siguen en verde
- [X] T005 [P] Crear `src/componentes/ui/paginacion.tsx` (`Paginacion({ pagina, paginas, enlace: (n) => string })`, `<nav aria-label="Páginas">` con "← Anterior", "Página n de m" y "Siguiente →", nada si `paginas ≤ 1`) extrayendo el marcado de `src/app/(sistema)/sesiones/page.tsx`, y usarlo ahí sin cambiar su comportamiento
- [X] T006 [P] Crear `tests/ayudantes/inventario.ts` con `crearCompraSinMovimientosDePrueba({ productoId, cantidad, fecha? })` (compra REGISTRADA con un proveedor y un usuario de prueba y una línea `cantidad × 10`, **sin** movimientos: la usan las pruebas del núcleo) y `crearDistribucionSinMovimientosDePrueba({ productoId, cantidad, fecha? })` (pedido PENDIENTE de un representante de prueba con una línea `cantidadSolicitada = cantidad`, y distribución REGISTRADA con vale único y una línea de esa cantidad, **sin** movimientos), respetando las CHECK de data-model §4 de F-001
- [X] T007 Crear `tests/integracion/inventario-movimientos.test.ts` (debe fallar antes de T008): `registrarMovimiento` dentro de `prisma.$transaction` con una compra de `crearCompraSinMovimientosDePrueba` inserta el movimiento con `saldoResultante` = stock previo + cantidad y deja `stockActual` igual al saldo; dos movimientos seguidos encadenan saldos (RN-51); una salida mayor que el stock lanza `ErrorDeNegocio` "Stock insuficiente de '{producto}': hay {s} y se necesitan {n}" y no deja ni el movimiento ni cambios de stock; si la transacción falla después del movimiento (se lanza un error a propósito), el stock y el kardex quedan como antes; `bloquearProductos` devuelve un `Map` con `codigo`, `nombre` y `stockActual` de cada id pedido
- [X] T008 Crear `src/servicios/inventario.ts` con `bloquearProductos(tx, productoIds)` (`tx.$queryRaw` parametrizado con `Prisma.join`: `SELECT id, codigo, nombre, stock_actual FROM producto WHERE id IN (...) ORDER BY id FOR UPDATE`, convierte a `Map<number, { codigo, nombre, stockActual }>`; lanza "No existe el producto indicado" si falta alguno) y `registrarMovimiento(tx, { productoId, tipo, cantidad, fechaDocumento, compraId?, distribucionId?, usuarioId })` (bloquea con `bloquearProductos(tx, [productoId])`, `saldo = stockActual + cantidad`, `saldo < 0` → error de T007, `tx.movimientoInventario.create` con `saldoResultante: saldo`, `tx.producto.update` con `stockActual: saldo`, devuelve `{ saldoResultante }`); encabezado del archivo con el porqué (principio III, research K-01: "bloqueo la fila, leo, verifico, escribo"; orden de `id` para evitar interbloqueos; el saldo se toma de `stock_actual` porque RN-50 lo garantiza igual al del último movimiento); y agregar a `tests/ayudantes/inventario.ts` `crearSalidaDePrueba({ productoId, cantidad, fecha? })`, que crea la distribución con `crearDistribucionSinMovimientosDePrueba` y registra su `SALIDA_DISTRIBUCION` negativa con `registrarMovimiento` dentro de una transacción (la usan US3 y US5)
- [X] T009 Modificar el menú de `src/app/(sistema)/layout.tsx` para sumar **Compras** (`/compras`) y **Existencias** (`/existencias`) en la primera fila, después de Inicio, y agregar sus accesos en `src/app/(sistema)/page.tsx` ("Registrar compras con factura y anularlas", "Stock actual, bajo mínimo y kardex de cada producto")

**Punto de control**: T002–T004 y T007 en verde; `npm test` y `npm run typecheck` sin errores.

---

## Fase 3: Historia 1 · Registrar una compra (Prioridad: P1) 🎯 MVP

**Objetivo**: registrar una compra completa (cabecera, líneas, movimientos y stock) o nada, con
montos calculados por el servidor y factura única por proveedor entre compras vigentes.

**Prueba independiente**: quickstart §3, pasos 1 a 3 y 6 a 10.

### Pruebas de la Historia 1

- [X] T010 [P] [US1] Crear `tests/unitarios/esquema-compra.test.ts` para `esquemaCompra`: acepta proveedor, factura " 1234 " → "1234", fecha de hoy, observación vacía → `undefined` y 2 líneas con precio "12,50" → "12.50"; `nroFactura` vacío → "Escribe el Nº de factura" y "12-34", "ABC" y 21 dígitos → "El Nº de factura solo admite dígitos, hasta 20"; fecha de mañana → "La fecha de la compra no puede ser futura"; observación de 201 → "La observación admite hasta 200 caracteres"; `lineas: []` → "Agrega al menos un producto"; cantidad "0", "2.5", "" y "1000001" → "La cantidad debe ser un número entero entre 1 y 1.000.000" con ruta `lineas.{i}.cantidad`; precio "0", "12,505" y "" → "Escribe un precio mayor que 0 con hasta 2 decimales"; producto vacío → "Elige un producto"; el mismo producto en las líneas 1 y 3 → "Línea 3: el producto ya está en la línea 1; modifica su cantidad" en `lineas.2.productoId`; líneas cuyo total supera 9 999 999 999,99 → "El total de la compra no puede superar Bs 9.999.999.999,99"; `subtotal` y `total` enviados no aparecen en el resultado; `esquemaVerificacionFactura` exige proveedor y factura con dígitos
- [X] T011 [P] [US1] Crear `tests/integracion/compras-registro.test.ts`: compra de 3 productos deja 3 líneas, 3 movimientos `ENTRADA_COMPRA` con `fechaDocumento` = fecha de la compra, saldos correctos, stock sumado y `usuarioId` y `creadoEn` registrados; líneas 10 × "12.50" y 4 × "30.00" guardan subtotales 125.00 y 120.00 y total 245.00 aunque los datos traigan `total: 1` (RN-23); factura 1234 vigente del proveedor A rechaza otra 1234 de A con "La factura 1234 ya está registrada para este proveedor", campo `nroFactura` y enlace `{ texto: "Ver compra", ruta: "/compras/{id}" }`, sin cambiar stock; 1234 del proveedor B se acepta (X-05); `0001234` y `1234` son distintas; proveedor inactivo → "El proveedor '{razón social}' está inactivo: elige uno activo"; producto inactivo en la línea 2 → "Línea 2: el producto '{nombre}' está inactivo: elige uno activo" y no queda nada guardado; un error dentro de la transacción **después** de registrar el primer movimiento no deja compra, líneas ni movimientos (RN-20, SC-004): con los productos A (id menor) y B, poner en la prueba el `stock_actual` de B en 2147483647 con `prisma.$executeRaw` y comprar 1 de cada uno, lo que desborda la columna entera al sumar B y deshace también el movimiento ya escrito de A; `buscarFacturaVigente` devuelve el id de la compra REGISTRADA o `null`; `obtenerCompra` trae proveedor, usuario, líneas con producto y unidad, subtotales y total como texto con 2 decimales; una compra con fecha `2026-09-01` se guarda y `obtenerCompra` la devuelve como `2026-09-01`, sin corrimiento por zona horaria
- [X] T012 [P] [US1] Crear `tests/integracion/compras-concurrencia.test.ts` (research K-12): 10 `registrarCompra` simultáneas (`Promise.all`) de 1 unidad del mismo producto con facturas distintas dejan stock 10, saldos 1…10 sin repetir en orden de `id` y la suma de movimientos igual al stock; 2 simultáneas con la misma factura y proveedor → exactamente una se guarda, la otra lanza el mensaje de factura duplicada y el stock sube una sola vez; 2 simultáneas con los productos A y B en orden inverso se guardan las dos sin interbloqueo

### Implementación de la Historia 1

- [X] T013 [P] [US1] Crear `src/esquemas/compras.ts` con `esquemaLineaCompra` (`productoId` = `idObligatorio("Elige un producto")`; `cantidad` = entero de 1 a 1 000 000, vacío rechazado, mensaje "La cantidad debe ser un número entero entre 1 y 1.000.000"; `precioUnitario` = `montoPositivo("Escribe un precio mayor que 0 con hasta 2 decimales")`), `esquemaCompra` (`proveedorId` = `idObligatorio("Elige un proveedor")`; `nroFactura` recortado, "Escribe el Nº de factura", `^[0-9]{1,20}$` "El Nº de factura solo admite dígitos, hasta 20"; `fecha` = `fechaNoFutura("La fecha de la compra no puede ser futura")`; `observacion` = `textoOpcional("La observación", 200)`; `lineas` con `.min(1, "Agrega al menos un producto")`; `superRefine` para producto repetido y total máximo con `aCentavos`, mensajes de data-model §1; sin `subtotal` ni `total`), `esquemaVerificacionFactura` y `esquemaAvisoCompra` (`aviso`: `registrada` opcional, con `.catch(undefined)`); tipos `DatosCompra` y `DatosLineaCompra`
- [X] T014 [US1] Crear `src/servicios/compras.ts` con `registrarCompra(datos, usuarioId)` en el orden de research K-11 (lecturas de proveedor activo, productos activos con un `findMany` y factura libre fuera de la transacción; subtotales y total con `new Prisma.Decimal(precio).mul(cantidad)` y control del máximo; transacción abierta con `{ maxWait: 10_000, timeout: 10_000 }` (research K-12) que **primero** llama a `bloquearProductos` con los ids ordenados, antes de insertar las líneas, que toman `FOR KEY SHARE` sobre el producto (research K-01); después crea la compra con `lineas: { create }` y llama a `registrarMovimiento` `ENTRADA_COMPRA` por línea en orden de producto; P2002 de `compra_factura_vigente_unica` → mensaje de factura duplicada con enlace), `buscarFacturaVigente(proveedorId, nroFactura)` y `obtenerCompra(id)` (contrato §3, con `anuladaPor` y motivo si corresponde); comentario con la RN en cada regla; la fecha se guarda como `new Date(\`${fecha}T00:00:00Z\`)` (research K-06)
- [X] T015 [US1] Crear `src/app/(sistema)/compras/acciones.ts` con `registrarCompraAccion(datos: unknown)` (requerirSesion → `esquemaCompra.safeParse(datos)` → `aResultadoDeValidacion(erroresPorRuta(error))` con el mensaje "Revisa los datos marcados" → `registrarCompra(validacion.data, usuario.id)` → `aResultadoDeError` → `revalidatePath("/compras")`, `revalidatePath("/existencias")` → `redirect("/compras/{id}?aviso=registrada")`) y `verificarFacturaAccion(proveedorId, nroFactura)` (requerirSesion; datos inválidos → `{ ok: true, datos: { duplicada: false } }`; si no, `buscarFacturaVigente`)
- [X] T016 [US1] Crear `src/app/(sistema)/compras/formulario-compra.tsx` (cliente, research K-03 y K-05): estado con cabecera y arreglo de líneas (`{ clave, productoId, cantidad, precioUnitario }`, empieza con una línea vacía); `Selector` de proveedores y, por línea, de productos (opciones recibidas por props); fecha `type="date"` con `max` = hoy y valor inicial hoy; botones "Agregar producto" y "Quitar" (con `aria-label` "Quitar línea n"); vista previa por línea y total con `aCentavos`/`formatearCentavos` ("—" si el dato aún no es válido); al salir del Nº de factura y al cambiar el proveedor con número escrito llama a `verificarFacturaAccion` y muestra "La factura {nro} ya está registrada para este proveedor" con enlace "Ver compra"; al guardar valida con `esquemaCompra` + `erroresPorRuta`, muestra cada error junto a su campo y en el aviso general la lista "Línea n: …", y llama a la acción dentro de `startTransition` sin vaciar el estado si el servidor rechaza; nota visible "Los subtotales y el total definitivos los calcula el sistema al guardar"; tabla de líneas con desplazamiento propio en pantallas chicas; y `src/app/(sistema)/compras/nueva/page.tsx` que carga `listarProveedoresParaSelector()` y `listarProductosParaSelector()` y muestra un aviso con enlaces a F-002 si no hay proveedores o productos activos
- [X] T017 [US1] Crear `src/app/(sistema)/compras/[id]/page.tsx`: `idDeRuta`, `notFound()`, aviso con `esquemaAvisoCompra` de `src/esquemas/compras.ts` (`aviso` = `registrada`, "Compra registrada. El stock de sus productos se actualizó."); cabecera con fecha `dd/mm/aaaa`, Nº de factura, proveedor enlazado (marcado "(inactivo)" si corresponde), observación, insignia de estado (REGISTRADA / ANULADA), registrada por (nombre y apellido) y cuándo (`formatearFechaHora`); tabla de líneas con código, producto enlazado, unidad, cantidad, precio unitario, subtotal y total con `formatearBolivianos`; si está ANULADA, motivo, anulada por y cuándo; **sin** enlaces de editar ni borrar (FR-010, D-16); enlace "← Volver al listado" a `/compras`
- [X] T018 [US1] Cambiar `crearMovimientoDePrueba` de `tests/ayudantes/catalogos.ts` para que registre una compra real con `registrarCompra` (1 unidad a "10.00", factura única), sin escribir el stock a mano, y confirmar que `tests/integracion/catalogo-productos.test.ts` sigue en verde

**Punto de control**: T010–T012 en verde; quickstart pasos 1 a 3 y 6 a 10.

---

## Fase 4: Historia 2 · Consultar las existencias (Prioridad: P1)

**Objetivo**: ver el stock frente al mínimo, con los bajo mínimo arriba y contados, y los filtros de
la especificación.

**Prueba independiente**: quickstart §3, pasos 4 y 17.

### Pruebas de la Historia 2

- [X] T019 [P] [US2] Crear `tests/integracion/inventario-existencias.test.ts` y agregar a `tests/unitarios/esquemas-inventario.test.ts` los casos de `esquemaFiltroExistencias`: por defecto `estado` = `habituales` y sin `bajoMinimo`; valores inválidos toman el valor por defecto; el stock de cada producto se carga con `crearCompraSinMovimientosDePrueba` y `registrarMovimiento` (fase 2), sin usar `registrarCompra`, para no depender de US1; en la base, con productos sobre, en (stock 5 = mínimo 5) y bajo el mínimo, `listarExistencias` ordena primero los bajo mínimo y luego por nombre, marca bajo mínimo el de stock igual al mínimo (RN-52) y cuenta `bajoMinimo`; con `soloBajoMinimo` solo quedan esos; un inactivo con 8 unidades aparece por defecto marcado inactivo y no bajo mínimo ni contado, y uno inactivo sin stock solo con `inactivos` o `todos`; `q` "LAVANDÍNA" y `categoriaId` filtran

### Implementación de la Historia 2

- [X] T020 [P] [US2] Crear `src/esquemas/inventario.ts` con `esquemaFiltroExistencias` (`q` hasta 60 como `esquemaFiltroCatalogo`; `categoria` como en `esquemaFiltroProductos`; `estado`: `habituales` | `inactivos` | `todos` con `.catch("habituales")`; `bajoMinimo`: `si` opcional con `.catch(undefined)`) y su tipo
- [X] T021 [US2] Agregar a `src/servicios/inventario.ts` `listarExistencias({ q, categoriaId, estado, soloBajoMinimo })` según research K-07 y data-model §5: consulta con categoría y unidad, filtro en memoria con `coincideBusqueda(q, codigo, nombre)`, regla `habituales` = activo o `stockActual > 0`, `bajoMinimo` = activo y `stockActual ≤ stockMinimo` (reutilizar la misma regla de `src/servicios/catalogos/productos.ts` exportándola como `estaBajoMinimo`), orden bajo mínimo primero y luego `compararEnEspanol`, devuelve `{ productos, total, bajoMinimo }`
- [X] T022 [US2] Crear `src/app/(sistema)/existencias/page.tsx` y `filtros-existencias.tsx`: encabezado "Existencias" con "{n} productos · {b} bajo mínimo" y enlace "Verificar consistencia" a `/existencias/verificacion`; filtros Buscar, Categoría (todas, inactivas marcadas), Estado ("Activos e inactivos con stock", "Inactivos", "Todos") y casilla "Solo bajo mínimo" (`bajoMinimo=si`); tabla con Código, Producto, Categoría, Unidad, Stock actual, Stock mínimo, Indicador (insignias "Bajo mínimo" e "Inactivo") y enlace "Ver kardex" a `/kardex/{id}`; fila bajo mínimo resaltada con fondo y con la insignia de texto (no solo color); `MensajeVacio` con búsqueda

**Punto de control**: T019 en verde; quickstart pasos 4 y 17.

---

## Fase 5: Historia 3 · Consultar el kardex de un producto (Prioridad: P1)

**Objetivo**: ver los movimientos que explican el stock, con saldo anterior y final por rango de
fechas del documento, y verificar la consistencia de todo el inventario.

**Prueba independiente**: quickstart §3, pasos 5, 15 y 16.

### Pruebas de la Historia 3

- [X] T023 [P] [US3] Crear `tests/integracion/inventario-kardex.test.ts` y agregar a `tests/unitarios/esquemas-inventario.test.ts` los casos de `esquemaFiltroKardex` (sin rango válido; "2026-09-10" > "2026-09-01" → "La fecha «desde» no puede ser posterior a «hasta»"; fecha inválida → "Usa una fecha válida"): con compras y salidas (`crearSalidaDePrueba`) `obtenerKardex` lista en orden de `id` con documento de origen (factura y razón social; vale y "Apellido, Nombre" del representante), el saldo del último movimiento es igual a `stockActual` (RN-50) y cada saldo es el anterior más su cantidad (RN-51); una salida registrada antes y una compra registrada después con fecha de 10 días atrás aparecen en orden de registro sin cambiar saldos anteriores (Historia 3 · E7); con rango, solo movimientos con `fechaDocumento` en el rango, `saldoAnterior` = suma con fecha anterior a `desde` y `saldoFinal` = suma hasta `hasta` (RN-53); con solo `desde` o solo `hasta`, los saldos de data-model §5; producto sin movimientos → lista vacía y saldos 0; producto inexistente → `null`; `verificarConsistenciaInventario` informa 0 diferencias tras varias compras y salidas, y detecta la diferencia de un producto cuyo `stockActual` se altera a mano en la prueba (con `prisma.$executeRaw`, solo en la base de pruebas)

### Implementación de la Historia 3

- [X] T024 [P] [US3] Agregar a `src/esquemas/inventario.ts` `esquemaFiltroKardex` (`desde` y `hasta` con `fechaDeFiltro()` sin valor por defecto; si ambos existen, `desde ≤ hasta` con "La fecha «desde» no puede ser posterior a «hasta»" en `hasta`)
- [X] T025 [US3] Agregar a `src/servicios/inventario.ts` `obtenerKardex(productoId, { desde, hasta })` y `verificarConsistenciaInventario()` según research K-08 y contrato §3: movimientos con `compra` (nro de factura, razón social) y `distribucion` (nro de vale, representante del pedido), orden `id`; saldos del rango con `movimientoInventario.aggregate({ _sum: { cantidad } })`, incluidos los rangos con solo `desde` o solo `hasta` (data-model §5); `fechaDocumento` convertido a texto `AAAA-MM-DD` con `toISOString().slice(0, 10)`; consistencia con `groupBy` por producto comparado con todos los productos (sin movimientos suma 0), devolviendo `{ revisados, diferencias: [{ productoId, codigo, nombre, stockActual, sumaMovimientos, diferencia }], verificadoEn }`
- [X] T026 [US3] Crear `src/app/(sistema)/kardex/[productoId]/page.tsx` y `filtro-kardex.tsx`: encabezado con código, producto, unidad, stock actual y enlace a la ficha del producto; filtro "Desde" y "Hasta" (`type="date"`); con rango, "Saldo anterior" y "Saldo final"; tabla con Fecha del documento (`dd/mm/aaaa`), Registrado el (`formatearFechaHora`), Tipo ("Entrada por compra", "Anulación de compra", "Salida por distribución", "Anulación de distribución"), Documento ("Factura {nro} · {razón social}" enlazado a `/compras/{id}`; "Vale {nro} · {representante}" enlazado a `/distribuciones/{id}`, ruta que responde 404 hasta F-005; hoy solo aparece con datos de prueba), Entrada, Salida y Saldo; nota sobre el orden ("Los movimientos se muestran en el orden en que se registraron; el saldo de cada fila no cambia aunque la fecha del documento sea anterior"); "Sin movimientos" si no hay; y agregar el enlace "Ver kardex" en `src/app/(sistema)/productos/[id]/page.tsx`
- [X] T027 [US3] Crear `src/app/(sistema)/existencias/verificacion/page.tsx`: ejecuta `verificarConsistenciaInventario()` al abrirse; sin diferencias, `Aviso` de éxito "El inventario es consistente: el stock de los {n} productos coincide con la suma de sus movimientos"; con diferencias, `Aviso` de error y tabla con Código, Producto, Stock actual, Suma de movimientos y Diferencia, cada producto enlazado a su kardex; fecha y hora de la verificación y enlace "Verificar otra vez"

**Punto de control**: T023 en verde; quickstart pasos 5, 15 y 16.

---

## Fase 6: Historia 4 · Listar compras y ver su detalle (Prioridad: P1)

**Objetivo**: encontrar compras por fecha, proveedor, estado y factura, y abrir su detalle.

**Prueba independiente**: quickstart §3, paso 11.

### Pruebas de la Historia 4

- [X] T028 [P] [US4] Crear `tests/integracion/compras-listado.test.ts` y agregar a `tests/unitarios/esquema-compra.test.ts` los casos de `esquemaFiltroCompras` (por defecto primer día del mes en curso · hoy, `estado` = `todas`, `pagina` = 1; `factura` con letras → error "El Nº de factura solo admite dígitos"; `desde > hasta` → "La fecha «desde» no puede ser posterior a «hasta»"): con compras de 2 proveedores en 3 fechas, una ANULADA, `listarCompras` filtra por rango de `fecha`, proveedor, estado y factura que empieza con "12" (encuentra 1234 y no 5123), ordena por fecha y `id` descendentes, trae la cantidad de ítems y el total, y pagina de `COMPRAS_POR_PAGINA` (con 51 compras: 50 en la página 1 y 1 en la 2, `total` = 51)

### Implementación de la Historia 4

- [X] T029 [P] [US4] Agregar a `src/esquemas/compras.ts` `esquemaFiltroCompras` (`desde` = `fechaDeFiltro(inicioDelMesEnCurso)`, `hasta` = `fechaDeFiltro(hoyEnLaPaz)`, `proveedor` id opcional, `estado`: `todas` | `registradas` | `anuladas` con `.catch("todas")`, `factura` opcional recortada `^[0-9]{0,20}$` con "El Nº de factura solo admite dígitos", `pagina` entero ≥ 1 por defecto 1; `desde ≤ hasta`)
- [X] T030 [US4] Agregar a `src/servicios/compras.ts` `listarCompras(filtro)` y `COMPRAS_POR_PAGINA = 50` según research K-09: `where` con `fecha` entre `desde` y `hasta` (como `Date` a medianoche UTC), `proveedorId`, `estado` y `nroFactura: { startsWith }`; `orderBy: [{ fecha: "desc" }, { id: "desc" }]`; `_count.lineas`; `total` con `count`; devuelve fecha en texto y total con 2 decimales
- [X] T031 [US4] Crear `src/app/(sistema)/compras/page.tsx` y `filtros-compras.tsx`: encabezado "Compras" con total y botón "Registrar compra"; filtros Desde, Hasta, Proveedor (todos, activos e inactivos marcados), Estado y Nº de factura; tabla con Fecha, Nº de factura, Proveedor, Ítems, Total, Estado (insignia REGISTRADA / ANULADA) y "Ver detalle"; `Paginacion` conservando los filtros; mensaje "No hay compras para los filtros aplicados"

**Punto de control**: T028 en verde; quickstart paso 11.

---

## Fase 7: Historia 5 · Anular una compra mal registrada (Prioridad: P2)

**Objetivo**: anular con motivo, revertir el stock con movimientos inversos si alcanza y liberar la
factura.

**Prueba independiente**: quickstart §3, pasos 12 a 14.

### Pruebas de la Historia 5

- [X] T032 [P] [US5] Crear `tests/integracion/compras-anulacion.test.ts` y agregar a `tests/unitarios/esquema-compra.test.ts` los casos de `esquemaAnulacion` (motivo vacío → "Escribe el motivo de la anulación"; 201 caracteres → "El motivo admite hasta 200 caracteres"): anular una compra de 2 productos sin uso la deja ANULADA con `motivoAnulacion`, `anuladaEn` y `anuladaPorId`, crea 2 `ANULACION_COMPRA` con cantidad negativa y `fechaDocumento` = fecha de la compra aunque se anule hoy (Historia 3 · E8, RN-53), y devuelve el stock al valor previo; con una compra de 10 y 7 distribuidas (`crearSalidaDePrueba`) lanza exactamente "No se puede anular: faltan 7 unidades de 'Lavandina 1 L' (stock actual 3, a revertir 10)" y no cambia estado, stock ni movimientos (RN-25); con dos líneas y ambas sin stock suficiente el mensaje lista los dos productos separados por "; "; con 1 faltante usa "falta 1 unidad"; con varias líneas y solo una insuficiente no se anula ninguna; anular una ANULADA → "La compra ya está anulada"; inexistente → "No existe la compra indicada"; la factura anulada puede registrarse otra vez para el mismo proveedor (RN-26); 2 anulaciones simultáneas de la misma compra → una anula, la otra lanza "La compra ya está anulada" y el stock se revierte una sola vez; se permite anular con el proveedor y el producto ya desactivados; una anulación de 10 y una `crearSalidaDePrueba` de 5 simultáneas sobre el mismo producto con stock 10 nunca dejan stock negativo, exactamente una se completa y la otra se rechaza con su mensaje (caso borde de anulación simultánea); tras compras y anulaciones `verificarConsistenciaInventario` informa 0 diferencias (SC-002)

### Implementación de la Historia 5

- [X] T033 [P] [US5] Agregar a `src/esquemas/compras.ts` `esquemaAnulacion` (`motivo` = `textoObligatorio("el motivo de la anulación", "El motivo", 200)`)
- [X] T034 [US5] Agregar a `src/servicios/compras.ts` `anularCompra(compraId, motivo, usuarioId)` según research K-02 y data-model §3: transacción con `compra.updateMany({ where: { id, estado: "REGISTRADA" } })` (0 filas → "No existe la compra indicada" si no existe, o "La compra ya está anulada"), lectura de sus líneas, `bloquearProductos` con los ids ordenados, cálculo de **todos** los faltantes con el mensaje de data-model §3 ("falta 1 unidad" / "faltan {f} unidades") unidos por "; ", y un `registrarMovimiento` `ANULACION_COMPRA` por línea en orden de producto con `cantidad: -linea.cantidad` y `fechaDocumento: compra.fecha`; devuelve `{ productoIds }`; la transacción se abre con `{ maxWait: 10_000, timeout: 10_000 }` (research K-12) y no inserta filas que referencien productos antes de bloquearlos; comentario del porqué de cada paso
- [X] T035 [US5] Agregar `anularCompraAccion(compraId, estadoPrevio, formData)` a `src/app/(sistema)/compras/acciones.ts` (requerirSesion → `esquemaAnulacion` → `anularCompra(compraId, motivo, usuario.id)` → revalida `/compras`, `/compras/{id}`, `/existencias` y `/kardex/{productoId}` de cada producto → "Compra anulada. El stock de sus productos se revirtió.") y crear `src/app/(sistema)/compras/[id]/anular-compra.tsx` (cliente, `useValidacion` + `useActionState`): campo "Motivo de la anulación" (`<textarea>` con etiqueta, hasta 200), botón "Anular compra" de variante peligro con confirmación "¿Anular la factura {nro}? Se revertirá el stock de sus {n} productos. Esta acción no se puede deshacer.", aviso de resultado; mostrarlo en `src/app/(sistema)/compras/[id]/page.tsx` solo si la compra está REGISTRADA

**Punto de control**: T032 en verde; quickstart pasos 12 a 14.

---

## Fase 8: Cierre y aspectos transversales

- [X] T036 [P] Crear `tests/integracion/inventario-unica-escritura.test.ts`: recorre todos los `.ts` y `.tsx` de `src/` con `readdirSync` recursivo y verifica que `stockActual` solo aparece dentro de un `data:` de Prisma en `src/servicios/inventario.ts` (FR-015, principio III); que `src/servicios/compras.ts` e `inventario.ts` no exportan nombres con `editar`, `modificar`, `borrar`, `eliminar` ni `delete` y no llaman a `.delete(` ni `.deleteMany(` (FR-010); y que ningún archivo de `src/` llama a `movimientoInventario.update` ni `movimientoInventario.delete`
- [X] T037 [P] Revisar con `grep` que todas las páginas nuevas bajo `src/app/(sistema)/{compras,existencias,kardex}/` y todas las funciones de `compras/acciones.ts` llaman a `requerirSesion` como primera instrucción, y que todo `searchParams` se valida con un esquema Zod; corregir lo que falte
- [X] T038 [P] Revisar accesibilidad y pantallas chicas del formulario de compra, la ficha, existencias, kardex y el menú a 375 px: etiquetas en todos los campos de cada línea (`<label>` visualmente oculto con "Producto de la línea n", "Cantidad de la línea n", "Precio unitario de la línea n"), errores anunciados con `aria-describedby`, tablas con desplazamiento propio, resaltado de bajo mínimo con texto además de color
- [X] T039 Ejecutar `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`; confirmar que las 198 pruebas anteriores siguen en verde junto con las de F-003 y corregir errores y advertencias
- [X] T040 Ejecutar el recorrido de `specs/003-compras-inventario/quickstart.md` §3 con el mismo método de F-002 (`docs/decisiones.md`, I-15: servidor de desarrollo contra la base de pruebas, datos cargados con los esquemas y servicios reales y sesión de prueba creada en la base, sin escribir contraseñas en el navegador), anotar en una sección "Estado de la validación" qué se verificó y qué queda pendiente, y medir SC-001 (compra de 5 productos en menos de 3 minutos) y SC-007 (bajo mínimo en menos de 30 s) o dejarlos para el recorrido con Raymond
- [X] T041 [P] Actualizar `docs/decisiones.md` con una sección "Compras e inventario (plan de F-003, 14/09/2026)" que resuma K-01 a K-12 de `specs/003-compras-inventario/research.md` en el formato de tabla de C-01 a C-11 y con las decisiones de implementación nuevas (I-16 en adelante); `docs/instalacion.md` con una sección breve "Registrar compras y consultar el inventario" (compra con factura en mano, anulación con motivo, existencias, kardex y verificación de consistencia) y `docs/especificacion/README.md` marcando F-003 como implementada en el cronograma

---

## Dependencias y orden de ejecución

### Entre fases

- **Preparación (fase 1)** → **Fundamentos (fase 2)** → historias → **Cierre (fase 8)**.
- En la fase 2, T002, T003, T005 y T006 tocan archivos distintos y van en paralelo; T004 (esquemas
  comunes) va antes de las historias porque los esquemas de compra lo importan; T006 → T007 → T008
  (ayudantes, prueba y núcleo del stock; T008 agrega también `crearSalidaDePrueba`, que usa
  `registrarMovimiento`); T009 (menú) no bloquea a nadie.

### Entre historias

| Historia | Depende de | Motivo |
|---|---|---|
| US1 Registrar compra | Fundamentos | Usa `registrarMovimiento`, montos y fechas comunes |
| US2 Existencias | Fundamentos | Lee productos y stock; sus pruebas cargan stock con los ayudantes de la fase 2, así que no depende de US1 |
| US3 Kardex | Fundamentos y US1 | Muestra compras con su factura y proveedor |
| US4 Listado de compras | US1 | Lista las compras que registra US1 |
| US5 Anular | US1 y US4 | Anula desde la ficha y revierte movimientos de US1 |

US2 puede hacerse en paralelo con US1; US3 y US4, en paralelo después de US1.

### Dentro de cada historia

Pruebas y esquemas [P] primero (las de integración deben fallar antes del servicio) → servicio →
acciones y páginas. Commit al terminar cada fase, sin líneas de autoría.

---

## Ejemplos de trabajo en paralelo

```text
# Fase 2:
T002 src/lib/errores.ts + tests/unitarios/errores-por-ruta.test.ts
T003 src/lib/dinero.ts + tests/unitarios/dinero.test.ts
T005 src/componentes/ui/paginacion.tsx
T006 tests/ayudantes/inventario.ts

# Historia 1, al empezar:
T010 tests/unitarios/esquema-compra.test.ts
T011 tests/integracion/compras-registro.test.ts
T012 tests/integracion/compras-concurrencia.test.ts
T013 src/esquemas/compras.ts

# Con US1 terminada, en paralelo:
US3 (kardex) · US4 (listado de compras)
```

---

## Estrategia de implementación

### MVP (Historia 1)

Fases 1, 2 y 3: registrar compras completas o nada, con stock y kardex correctos y factura única.

### Entrega incremental (miércoles 16/09)

| Paso | Fases | Resultado verificable |
|---|---|---|
| 1 | 1 y 2 | Núcleo del stock probado; F-001 y F-002 intactas |
| 2 | 3 (US1) | Compras que suben el stock, sin guardados parciales |
| 3 | 4 y 5 (US2, US3) | Existencias, kardex y verificación de consistencia |
| 4 | 6 (US4) | Listado de compras con filtros y paginación |
| 5 | 7 (US5) | Anulación con reversión de stock |
| 6 | 8 | Calidad, validación y documentación |

**Orden de corte** (`00-decisiones-y-alcance.md` §5): si el día se atrasa, se posterga primero
**US5** (P2). US1 a US4 son imprescindibles para F-004 y F-005.

---

## Notas

- [P] = archivos distintos y sin dependencias pendientes.
- Cada regla de negocio lleva en el código un comentario con su RN o FR y el porqué (principio I).
- Si aparece algo que la especificación no cubre, se corrige primero `spec.md` o
  `02-modelo-de-dominio.md`; no se improvisa en el código.
