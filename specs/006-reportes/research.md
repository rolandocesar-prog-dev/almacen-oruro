# Investigación técnica · F-006 Reportes

**Fecha**: 2026-09-15 · **Plan**: [plan.md](plan.md)

F-006 **no crea datos**: consulta los de F-001 a F-005. Reutiliza las decisiones de F-001 (R-01 a R-16),
F-002 (C-01 a C-11), F-003 (K-01 a K-12), F-004 (P-01 a P-12) y F-005 (V-01 a V-12), y el código ya
implementado: `listarExistencias` y `obtenerKardex` (F-003), los listados de compras, pedidos y
distribuciones, las fechas de documento, `Paginacion`, el patrón de filtros por URL con Zod y el grupo de
rutas `(impresion)` creado para el vale (V-09). Aquí solo se registran las decisiones **nuevas**, con el
formato **Decisión / Fundamento / Alternativas descartadas**. El prefijo es **E** (emisión de reportes).

---

## E-01 · Un servicio de reportes con una función por reporte

**Decisión**: `src/servicios/reportes.ts` con cinco funciones de **solo lectura** —`reporteCompras`,
`reporteDistribuciones`, `reporteExistencias`, `reporteKardex` y `reportePedidos`— que devuelven
`{ filas, totales }` (y los saldos, en el kardex). Cada una decide si reutiliza un servicio existente o
consulta directo:

| Reporte | Origen | Por qué |
|---|---|---|
| R-1 Compras | consulta propia sobre `compra` | el listado de F-003 pagina de 50, ordena de la más reciente a la más antigua y no totaliza; el reporte ordena por fecha ascendente y necesita totales del rango completo |
| R-2 Distribuciones | consulta propia sobre `distribucion_detalle` | una fila por **línea entregada**, no por distribución |
| R-3 Existencias | `listarExistencias` de F-003 | FR-011 pide exactamente los mismos productos, columnas e indicadores; agrupar por categoría y contar bajo mínimo se hace sobre su resultado |
| R-4 Kardex | `obtenerKardex` de F-003 | ya devuelve saldo anterior, movimientos del rango y saldo final según RN-53 (FR-012) |
| R-5 Pedidos | consulta propia sobre `pedido` | el listado de F-004 pagina y filtra por "por atender"; el reporte necesita rango obligatorio, conteo por estado y el filtro ANULADO explícito |

**Fundamento**: cada reporte se explica solo, con su consulta a la vista, y las dos consultas que ya
existen (existencias y kardex) no se duplican. Un reporte nunca escribe: el módulo no importa
`registrarMovimiento` ni llama a `create`, `update` o `delete` (FR-005).

**Alternativas descartadas**: un generador genérico de reportes parametrizado por configuración (el
principio I lo desaconseja: cinco reportes distintos se leen mejor que una abstracción); reutilizar los
listados paginados y sumar en memoria (los totales del rango no saldrían del período completo).

---

## E-02 · Totales calculados en la base, siempre sobre documentos vigentes

**Decisión**: los totales de cada reporte se calculan con agregados de Prisma sobre **todo el rango**, no
sobre las filas mostradas, y siempre con los documentos vigentes (FR-003):

| Reporte | Totales | Cómo |
|---|---|---|
| R-1 | total gastado y Nº de compras | `compra.aggregate({ _sum: { total }, _count: true, where: { …rango, estado: "REGISTRADA" } })` |
| R-2 | cantidad por producto | `distribucionDetalle.groupBy({ by: ["pedidoDetalleId"] })` no sirve (agrupa por línea de pedido): se agrupa por producto en memoria sobre las líneas vigentes del rango, que son decenas por mes |
| R-3 | Nº de productos bajo mínimo | contando el indicador `bajoMinimo` de `listarExistencias` |
| R-4 | saldo inicial y final | los que ya calcula `obtenerKardex` (RN-53) |
| R-5 | Nº de pedidos por estado | `pedido.groupBy({ by: ["estado"], _count: true, where: { …rango } })` |

**Fundamento**: "los totales cuentan solo los vigentes" queda escrito una vez por reporte y no depende de
lo que se muestre en pantalla (SC-001, SC-003). Los agregados los hace PostgreSQL con los índices que ya
existen (`compra(fecha)`, `distribucion(fecha)`, `pedido(estado, fecha)`), que es lo que sostiene SC-005.

**Alternativas descartadas**: sumar en TypeScript las filas traídas (con 36 meses serían miles de filas y
el total dependería de la página); vistas materializadas (no hay volumen que lo justifique).

---

## E-03 · Anulados: se incluyen en el listado, nunca en los totales

**Decisión**: los reportes de documentos (R-1, R-2, R-5) tienen el filtro `incluirAnulados` (por defecto
`false`). Si es `false`, la consulta de filas trae solo `REGISTRADA` (o, en pedidos, excluye `ANULADO`); si
es `true`, trae todas y cada fila anulada se marca con la insignia **Anulada**/**Anulado**. Los totales usan
siempre la condición de vigentes (E-02). En R-5, elegir el estado `anulados` muestra los anulados aunque
`incluirAnulados` sea `false` (FR-013): el filtro de estado manda sobre la opción.

**Fundamento**: es la regla común de la especificación en una frase, y evita el error de 2022 de sumar
documentos anulados.

**Alternativas descartadas**: mostrar los anulados en gris sin marca (no se distingue impreso en blanco y
negro); totales que cambian según la opción (contradice FR-003).

---

## E-04 · Pantalla paginada, impresión completa

**Decisión**: las páginas de reporte muestran las filas paginadas de 100 en 100 con `Paginacion`
(`FILAS_POR_PAGINA_REPORTE = 100`), y la **vista de impresión trae todas las filas del rango** sin paginar.
Los totales son siempre del rango completo (E-02), así que no cambian entre una página y otra. R-3 y R-4 no
se paginan: existencias son unos 25 productos y el kardex de un producto, cientos de movimientos.

**Fundamento**: resuelve el caso borde "rango muy amplio" tal como lo pide la especificación: en pantalla se
navega y en papel sale todo. Un tope de filas por página también protege el tiempo de respuesta (SC-005).

**Alternativas descartadas**: pantalla sin paginar (con 36 meses, R-2 puede traer miles de líneas);
impresión paginada (la hoja quedaría incompleta).

---

## E-05 · Rutas: una página por reporte y su gemela de impresión

**Decisión**: rutas reservadas en F-001 más un índice:

| Ruta | Qué |
|---|---|
| `/reportes` | índice con los cinco reportes y una línea de qué responde cada uno |
| `/reportes/compras`, `/reportes/distribuciones`, `/reportes/existencias`, `/reportes/kardex`, `/reportes/pedidos` | filtros + resultado en pantalla, con "Imprimir" |
| `/reportes/{reporte}/imprimir` | la misma consulta con los mismos parámetros, en el grupo `(impresion)` sin menú |

Las páginas de impresión viven en `src/app/(impresion)/reportes/…` y reciben los filtros por la URL, así que
"Imprimir" es un enlace que conserva los filtros aplicados (`/reportes/compras/imprimir?desde=…&hasta=…`).

**Fundamento**: el grupo `(impresion)` ya existe y funcionó para el vale (V-09, I-33); cinco páginas
explícitas se explican mejor que una página genérica con un `switch` por reporte. Que los filtros viajen por
la URL hace que la hoja impresa siempre corresponda a lo que se veía en pantalla.

**Alternativas descartadas**: una sola ruta `/reportes/imprimir?reporte=compras` (un `switch` que decide
columnas y totales); ocultar el menú con `print:hidden` en el layout del sistema (la vista en pantalla
seguiría mostrando todo y el encabezado del reporte no aparecería).

---

## E-06 · Encabezado y tabla de impresión compartidos

**Decisión**: dos componentes de servidor en `src/componentes/reportes/`:

- `EncabezadoReporte({ titulo, filtros, usuario, demostracion })`: "Almacén Regional Oruro", el nombre del
  reporte, la lista de **filtros aplicados en texto** ("Del 01/09/2026 al 15/09/2026 · Proveedor:
  Distribuidora Andina · Incluye anuladas"), la fecha y hora de emisión (`formatearFechaHora(new Date())`) y
  el nombre de quien emite (FR-006).
- `TablaReporte({ encabezados, children, vacio })`: tabla **sin** contenedor con `overflow`, para que el
  navegador repita el `<thead>` en cada hoja (`display: table-header-group` es el valor por defecto de
  `thead`, pero se pierde dentro de un contenedor con desplazamiento). Los totales van después de la tabla.

**Fundamento**: el encabezado es lo que hace que la hoja se entienda fuera del sistema (SC-006, SC-007) y
escribirlo una sola vez evita que un reporte se olvide de un dato. La `Tabla` de pantalla sí conserva su
desplazamiento propio.

**Alternativas descartadas**: repetir el encabezado en cada página de impresión; usar la `Tabla` común (su
`overflow-x-auto` rompe la repetición del encabezado al imprimir).

---

## E-07 · Marca de datos simulados

**Decisión**: `obtenerConfiguracion()` en `src/servicios/configuracion.ts` lee la fila única de
`configuracion` (id 1) y devuelve `{ modoDemostracion, datosSimuladosEn }`; si la fila no existe,
`modoDemostracion` es `false`. La leyenda "Datos simulados con fines de demostración" se muestra:

- en el encabezado de **todo reporte**, en pantalla y en la hoja impresa (FR-007);
- como una banda en el layout del sistema, para cumplir la aclaración del 13/09 ("aparece en todas las
  pantallas") sin repetir la consulta en cada página.

F-006 **solo lee** la marca; quien la escribe es el generador de F-007.

**Fundamento**: una sola marca de toda la base, leída en un solo lugar, es lo que aclaró la especificación;
el tribunal ve de inmediato que los datos son simulados (D-07, principio VIII).

**Alternativas descartadas**: una marca por documento (la aclaración la descartó); variable de entorno (no
viaja con la base que se lleva a la defensa).

---

## E-08 · Filtros: un esquema Zod por reporte

**Decisión**: `src/esquemas/reportes.ts` con `esquemaReporteCompras`, `esquemaReporteDistribuciones`,
`esquemaReporteExistencias`, `esquemaReporteKardex` y `esquemaReportePedidos`, compartidos por el formulario
de filtros (cliente) y la página (servidor), como en el resto del sistema (principio VI, I-07):

- rango de fechas con `fechaDeFiltro(inicioDelMesEnCurso)` y `fechaDeFiltro(hoyEnLaPaz)` y la regla
  `desde ≤ hasta` ("La fecha «desde» no puede ser posterior a «hasta»"), igual que compras (K-09);
- ids opcionales (`proveedor`, `representante`, `producto`, `categoria`) con `.catch(undefined)`;
- `incluirAnulados` de una casilla: `"si"` → `true`, cualquier otra cosa → `false`;
- `estado` de R-5 con los valores de F-004 (`todos`, `pendientes`, `parciales`, `atendidos`, `anulados`);
- `soloBajoMinimo` de R-3 como casilla.

En R-4 el producto es **obligatorio**: si falta o no existe, la página muestra "Elige un producto para ver
su kardex" y no consulta nada (Historia 4 · E3). Un rango inválido en la URL se corrige al mes en curso con
un aviso, como en los listados.

**Fundamento**: mismos valores por defecto y mismos mensajes que el resto del sistema; el reporte nunca
falla por un parámetro raro en la URL.

---

## E-09 · Filas de cada reporte

**Decisión**:

| Reporte | Fila | Orden |
|---|---|---|
| R-1 | fecha, Nº de factura, proveedor, ítems (líneas), total, estado | fecha e `id` ascendentes |
| R-2 | fecha, Nº de vale, representante, servicio, producto, unidad, cantidad, estado | fecha, `id` de la distribución y `id` de la línea |
| R-3 | código, producto, categoría, unidad, stock actual, stock mínimo, indicador ("Bajo mínimo", "Inactivo" o "—"), agrupadas por categoría | categoría y nombre, en español |
| R-4 | fecha del documento, tipo, documento de origen, entrada, salida, saldo resultante | `id` (orden de registro, RN-51) |
| R-5 | Nº, fecha, representante, servicio, productos, % atendido, estado | fecha e `id` ascendentes |

Los reportes ordenan **del más antiguo al más reciente** (al revés que los listados de pantalla), porque una
hoja se lee en orden cronológico.

**Fundamento**: es el orden natural de un reporte impreso y hace que el saldo del kardex se siga con el dedo.

---

## E-10 · Botón de imprimir compartido

**Decisión**: `BotonImprimir` se mueve de `(impresion)/distribuciones/[id]/vale/` a
`src/componentes/ui/boton-imprimir.tsx` y lo usan el vale y los cinco reportes. Sigue llamando a
`window.print()` y viviendo dentro de un bloque `print:hidden`.

**Fundamento**: el mismo control en seis páginas; una sola línea de cliente en todo el sistema.

---

## E-11 · Navegación

**Decisión**: el menú suma **Reportes** después de Distribuciones y el inicio, su acceso ("Consultar e
imprimir compras, distribuciones, existencias, kardex y pedidos"). El índice `/reportes` muestra una tarjeta
por reporte. Cada página de reporte enlaza "Imprimir" (a su gemela) y "← Volver a reportes".

---

## E-12 · Pruebas

**Decisión**:

- Unitarias: los cinco esquemas de filtros (valores por defecto, rango inválido, casillas, ids inválidos) y
  el armado del texto de "filtros aplicados" del encabezado.
- Integración, con datos creados por los servicios reales de F-003 a F-005: R-1 (total al centavo con
  compras vigentes y anuladas, filtro por proveedor, rango que deja fuera un mes), R-2 (una fila por línea,
  totales por producto, filtros combinados, anulada que no suma), R-3 (mismos productos que
  `listarExistencias`, agrupación por categoría, "solo bajo mínimo", filtro por categoría), R-4 (saldo
  inicial, movimientos del rango, saldo final igual al stock actual, producto sin movimientos), R-5 (conteo
  por estado, filtro ANULADO sin la opción, porcentaje atendido).
- Invariantes: el módulo de reportes no escribe (sin `create`, `update`, `delete`, `$executeRaw` ni
  `registrarMovimiento` en el archivo) y no exporta funciones que no empiecen por `reporte`; la marca de
  demostración se lee de la configuración y por defecto está apagada.

**Fundamento**: SC-001, SC-002 y SC-003 son comparaciones numéricas: se prueban solas. FR-005 ("no modifica
nada") se demuestra leyendo el código, como la única escritura del stock en F-003.

---

No quedan marcas **NEEDS CLARIFICATION**. La leyenda de datos simulados solo se ve cuando F-007 marque la
base; hasta entonces, las pruebas la activan escribiendo la fila de `configuracion`.
