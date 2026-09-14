# Especificación de funcionalidad: F-006 · Reportes

**Rama de la funcionalidad**: `006-reportes` (sin rama propia; se trabaja en `main`)

**Creada**: 2026-09-13

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Reportes para consultar e imprimir la información del
almacén. Cada reporte tiene filtros básicos, muestra totales y se puede imprimir con un formato
limpio (encabezado con nombre del reporte, filtros aplicados, fecha y hora de emisión y usuario que
lo emite). Los reportes son: (1) compras en un rango de fechas, filtrable por proveedor, con total
gastado; (2) distribuciones en un rango de fechas, filtrable por representante y por producto, con
cantidades entregadas; (3) existencias actuales, filtrable por categoría y por 'solo bajo mínimo';
(4) kardex de un producto en un rango de fechas; (5) pedidos en un rango de fechas, filtrable por
estado y representante. Los documentos anulados se excluyen por defecto, con opción de incluirlos.
Por defecto, el rango de fechas es el mes en curso."

**Referencias**: `docs/especificacion/03-funcionalidades.md` §F-006 y tabla de reportes y filtros
(D-12) · `docs/especificacion/02-modelo-de-dominio.md` reglas RN-41, RN-50 a RN-53 · Capítulo II:
RF 6 · Decisiones D-07 y D-12 · Prioridades de `00-decisiones-y-alcance.md` §5 (R-1 a R-3 son P2;
R-4 y R-5 son P3).

## Clarifications

### Session 2026-09-13

- Q: ¿Cómo sabe el sistema que tiene que mostrar la leyenda "Datos simulados con fines de
  demostración"? → A: Por una marca única de toda la base: al ejecutar el generador de F-007, la
  base queda como "de demostración" y la leyenda aparece en todas las pantallas y reportes.

## Escenarios de usuario y pruebas *(obligatorio)*

**Actor único:** Encargado de almacén, con sesión iniciada (F-001). Los reportes solo consultan:
no modifican ningún dato.

**Reglas comunes a los cinco reportes** (se aplican en todas las historias):

- **Fechas:** los reportes con rango de fechas filtran por la **fecha del documento** (fecha de la
  compra, de la distribución o del pedido), no por el momento de registro (RN-53). Por defecto, el
  rango es el mes en curso, del día 1 a hoy.
- **Anulados:** los documentos anulados se excluyen por defecto; la opción "Incluir anulados" los
  muestra marcados como ANULADO. **Los totales cuentan siempre solo los documentos vigentes**,
  aunque se incluyan anulados en el listado.
- **Resultado vacío:** si no hay datos para los filtros, se muestra "Sin resultados para los filtros
  aplicados" y los totales en 0.
- **Impresión:** todo reporte tiene una vista de impresión limpia (Historia 6).

### Historia 1 - Reporte de compras (R-1) (Prioridad: P2)

El encargado consulta las compras de un período, de todos los proveedores o de uno, y cuánto se
gastó.

**Por qué esta prioridad**: responde "¿cuánto gastamos y a quién le compramos?", pero la operación
diaria funciona sin él (00 §5).

**Prueba independiente**: con compras vigentes y anuladas de varios proveedores en dos meses, se
genera el reporte con distintos filtros y se compara el total con la suma manual.

**Escenarios de aceptación**:

1. **Dado** un rango de fechas, **cuando** se genera el reporte, **entonces** lista las compras con
   fecha en el rango, ordenadas por fecha, con fecha, Nº de factura, proveedor, cantidad de ítems,
   total y estado.
2. **Dadas** 3 compras vigentes de 100,00, 250,50 y 49,50 y una anulada de 500,00 en el período,
   **cuando** se genera con "Incluir anuladas", **entonces** aparecen las 4, y el total gastado es
   400,00 con 3 compras (el total coincide con la suma de las compras vigentes del período).
3. **Dado** el filtro por proveedor, **cuando** se aplica, **entonces** solo aparecen sus compras y
   los totales corresponden a ese proveedor.
4. **Dado** un rango sin fecha de inicio o de fin, **cuando** se intenta generar, **entonces** se
   rechaza indicando que el rango de fechas es obligatorio.

---

### Historia 2 - Reporte de distribuciones (R-2) (Prioridad: P2)

El encargado consulta qué se entregó en un período, a qué representante y de qué producto.

**Por qué esta prioridad**: responde "¿a quién le entregamos y cuánto?" para rendir cuentas al
centro de salud.

**Prueba independiente**: con distribuciones de varios representantes y productos, se genera el
reporte y se verifican las cantidades totales por producto.

**Escenarios de aceptación**:

1. **Dado** un rango de fechas, **cuando** se genera el reporte, **entonces** lista una fila por
   producto entregado en cada distribución con fecha en el rango, con fecha, Nº de vale,
   representante, servicio, producto, unidad y cantidad.
2. **Dadas** dos distribuciones vigentes de "Lavandina 1 L" de 6 y 4 unidades en el período,
   **cuando** se genera el reporte, **entonces** el resumen de totales muestra "Lavandina 1 L: 10
   unidades".
3. **Dados** los filtros por representante y por producto, **cuando** se aplican juntos,
   **entonces** solo aparecen las líneas que cumplen ambos, y los totales se recalculan.
4. **Dada** una distribución anulada en el período, **cuando** se genera sin "Incluir anuladas",
   **entonces** no aparece; con la opción, aparece marcada ANULADA y no suma en los totales.

---

### Historia 3 - Reporte de existencias (R-3) (Prioridad: P2)

El encargado imprime el estado actual del inventario, completo o solo lo que está bajo mínimo, para
planificar compras.

**Por qué esta prioridad**: es el documento que acompaña un pedido de compra o una revisión del
almacén.

**Prueba independiente**: con productos sobre y bajo el mínimo en dos categorías, se genera el
reporte con y sin filtros.

**Escenarios de aceptación**:

1. **Dado** el reporte sin filtros, **cuando** se genera, **entonces** lista los productos activos
   y los inactivos con stock, con código, producto, categoría, unidad, stock actual, stock mínimo e
   indicador "Bajo mínimo" o "Inactivo" (mismos productos e indicadores que la consulta de
   existencias de F-003), agrupados por categoría y ordenados por nombre.
2. **Dado** el filtro "Solo bajo mínimo", **cuando** se aplica, **entonces** solo aparecen los
   productos activos con stock actual menor o igual al mínimo, y el total indica cuántos son
   (RN-52).
3. **Dado** el filtro por categoría, **cuando** se aplica, **entonces** solo aparecen los productos
   de esa categoría.
4. **Dado** el reporte de existencias, **cuando** se consulta, **entonces** no pide rango de fechas:
   muestra la situación al momento de emitirlo.

---

### Historia 4 - Reporte de kardex (R-4) (Prioridad: P3)

El encargado imprime el kardex de un producto en un período, con el saldo con que empezó y con el
que terminó.

**Por qué esta prioridad**: el kardex ya se consulta en pantalla (F-003); la versión imprimible es
deseable (00 §5).

**Prueba independiente**: con un producto con movimientos antes y dentro del período, se genera el
reporte y se comparan los saldos con el stock actual.

**Escenarios de aceptación**:

1. **Dados** un producto y un rango de fechas, **cuando** se genera el reporte, **entonces** muestra
   el saldo inicial (suma de movimientos con fecha del documento anterior al rango), cada
   movimiento del rango con fecha del documento, tipo, documento de origen, entrada, salida y saldo
   resultante, y el saldo final (suma hasta el fin del rango) (RN-53).
2. **Dado** un rango que termina hoy, **cuando** se genera, **entonces** el saldo final coincide con
   el stock actual del producto (RN-50).
3. **Dado** un reporte sin producto elegido, **cuando** se intenta generar, **entonces** se rechaza
   indicando que el producto es obligatorio.
4. **Dados** movimientos de anulación en el rango, **cuando** se genera, **entonces** aparecen
   siempre, porque son parte del kardex; la opción "Incluir anulados" no se ofrece en este reporte.

---

### Historia 5 - Reporte de pedidos (R-5) (Prioridad: P3)

El encargado consulta los pedidos de un período, cuánto se atendió de cada uno y cuántos hay en
cada estado.

**Por qué esta prioridad**: complementa el listado de pedidos de F-004, que ya muestra lo por
atender (00 §5).

**Prueba independiente**: con pedidos en los cuatro estados, se genera el reporte y se verifica el
conteo por estado.

**Escenarios de aceptación**:

1. **Dado** un rango de fechas, **cuando** se genera el reporte, **entonces** lista los pedidos con
   fecha en el rango, con Nº de pedido, fecha, representante, servicio, cantidad de productos,
   porcentaje atendido y estado.
2. **Dados** 3 pedidos PENDIENTE, 2 PARCIAL, 4 ATENDIDO y 1 ANULADO en el período, **cuando** se
   genera con "Incluir anulados", **entonces** el resumen muestra el número de pedidos por estado:
   3, 2, 4 y 1.
3. **Dado** el filtro por estado ANULADO, **cuando** se aplica, **entonces** aparecen los pedidos
   anulados aunque no se marque "Incluir anulados", cada uno con sus unidades entregadas y su saldo
   anulado (F-004).
4. **Dado** el filtro por representante, **cuando** se aplica, **entonces** solo aparecen sus
   pedidos.

---

### Historia 6 - Imprimir un reporte (Prioridad: P2)

El encargado imprime cualquier reporte, o lo guarda como PDF desde el navegador, con un formato que
se entiende fuera del sistema.

**Por qué esta prioridad**: los reportes se presentan en papel a la administración del centro de
salud; sin encabezado ni filtros impresos, la hoja no dice de qué período es.

**Prueba independiente**: se genera un reporte con filtros, se abre la vista de impresión y se
verifica el encabezado y la ausencia de menús.

**Escenarios de aceptación**:

1. **Dado** un reporte generado, **cuando** se elige "Imprimir", **entonces** la vista de impresión
   no muestra menús ni botones, y muestra un encabezado con el nombre del sistema, el nombre del
   reporte, los filtros aplicados (incluido "Incluye anulados" si corresponde), la fecha y hora de
   emisión y el nombre del usuario que lo emite.
2. **Dado** un reporte que ocupa varias hojas, **cuando** se imprime, **entonces** los encabezados
   de las columnas se repiten en cada hoja y los totales aparecen al final.
3. **Dada** una base marcada como de demostración (porque se ejecutó el generador de F-007),
   **cuando** se genera o imprime cualquier reporte, **entonces** aparece la leyenda "Datos
   simulados con fines de demostración" (D-07); en una base sin esa marca, no aparece.

---

### Casos borde

- **Fecha de inicio posterior a la de fin:** se rechaza indicando que la fecha "desde" no puede ser
  posterior a "hasta".
- **Rango con fechas futuras:** se permite; simplemente no hay documentos con esas fechas.
- **Rango muy amplio** (por ejemplo, los 36 meses simulados): el reporte se genera igual; la vista
  en pantalla puede paginarse, pero la impresión incluye todas las filas y los totales de todo el
  rango.
- **Proveedor, representante o producto inactivo:** aparecen en los filtros de los reportes, porque
  sus documentos siguen siendo parte del histórico (RN-14).
- **Documento registrado con fecha anterior:** aparece en el período de su fecha de documento,
  aunque se haya registrado después de emitir un reporte de ese período (RN-53).
- **Anulación posterior a una emisión:** si se anula un documento de un período ya impreso, un
  nuevo reporte de ese período da otros totales; la fecha y hora de emisión impresa distingue las
  dos versiones.
- **Producto sin movimientos en R-4:** muestra saldo inicial y final iguales y "Sin movimientos en
  el período".
- **Pedido del período con distribuciones fuera del período en R-5:** el porcentaje atendido refleja
  todo lo entregado a la fecha de emisión, sin importar la fecha de las distribuciones.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Comunes**

- **FR-001**: El sistema DEBE ofrecer cinco reportes: compras (R-1), distribuciones (R-2),
  existencias (R-3), kardex (R-4) y pedidos (R-5), con los filtros, columnas y totales de la tabla
  D-12.
- **FR-002**: Los reportes con rango de fechas DEBEN exigir fecha desde y hasta, con valor por
  defecto del primer día del mes en curso a hoy, validar que desde no sea posterior a hasta, y
  filtrar por la fecha del documento (RN-53).
- **FR-003**: Los reportes de documentos (R-1, R-2, R-5) DEBEN excluir los anulados por defecto y
  ofrecer la opción de incluirlos, marcados como ANULADO; los totales DEBEN contar solo los
  documentos vigentes en todos los casos.
- **FR-004**: Los filtros por proveedor, representante, producto y categoría DEBEN ofrecer también
  los registros inactivos.
- **FR-005**: El sistema NO DEBE modificar ningún dato al generar o imprimir un reporte.
- **FR-006**: Todo reporte DEBE poder imprimirse (o guardarse como PDF desde el navegador) con una
  vista sin menús ni botones, con encabezado que incluye nombre del sistema, nombre del reporte,
  filtros aplicados, fecha y hora de emisión y usuario que lo emite; con encabezados de columna
  repetidos en cada hoja y totales al final.
- **FR-007**: Si la base está marcada como de demostración (la marca la pone el generador de F-007
  y vale para toda la base, no por documento), todo reporte en pantalla e impreso DEBE mostrar la
  leyenda "Datos simulados con fines de demostración".
- **FR-008**: Los importes DEBEN mostrarse en bolivianos con 2 decimales y las cantidades como
  enteros con su unidad; los mensajes, en español.

**R-1 Compras**

- **FR-009**: R-1 DEBE filtrar por rango de fechas (obligatorio), proveedor e "Incluir anuladas";
  mostrar fecha, Nº de factura, proveedor, cantidad de ítems, total y estado; y totalizar el gasto
  y el número de compras vigentes.

**R-2 Distribuciones**

- **FR-010**: R-2 DEBE filtrar por rango de fechas (obligatorio), representante, producto e
  "Incluir anuladas"; mostrar una fila por línea de distribución con fecha, Nº de vale,
  representante, servicio, producto, unidad y cantidad; y totalizar la cantidad entregada por
  producto en las distribuciones vigentes.

**R-3 Existencias**

- **FR-011**: R-3 DEBE mostrar la situación al momento de la emisión, con los mismos productos,
  columnas e indicadores que la consulta de existencias de F-003; filtrar por categoría y "Solo
  bajo mínimo"; y totalizar el número de productos bajo mínimo.

**R-4 Kardex**

- **FR-012**: R-4 DEBE exigir un producto y un rango de fechas; mostrar el saldo inicial, los
  movimientos del rango (fecha del documento, tipo, documento de origen, entrada, salida, saldo
  resultante) y el saldo final, calculados según RN-53; e incluir siempre los movimientos de
  anulación.

**R-5 Pedidos**

- **FR-013**: R-5 DEBE filtrar por rango de fechas (obligatorio), estado, representante e "Incluir
  anulados"; mostrar Nº de pedido, fecha, representante, servicio, cantidad de productos,
  porcentaje atendido y estado; y totalizar el número de pedidos por estado. Elegir el estado
  ANULADO en el filtro DEBE mostrar los anulados sin necesidad de la otra opción.

### Entidades clave

Esta funcionalidad no crea datos nuevos: consulta los de F-001 a F-005.

- **Compra y línea de compra** (F-003): fuente de R-1.
- **Distribución y línea de distribución** (F-005): fuente de R-2.
- **Producto** (F-002) con su stock actual: fuente de R-3.
- **Movimiento de inventario** (F-003): fuente de R-4.
- **Pedido y línea de pedido** (F-004): fuente de R-5.
- **Usuario** (F-001): quien emite el reporte.
- **Configuración** (la marca la pone F-007): indica si la base es de demostración.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El total de R-1 coincide al centavo con la suma de las compras vigentes del período
  filtrado en el 100 % de los casos.
- **SC-002**: En R-4, el saldo final coincide con el stock actual en el 100 % de los reportes cuyo
  rango termina hoy.
- **SC-003**: En R-2, la cantidad total por producto coincide con la suma de las líneas vigentes del
  período en el 100 % de los casos.
- **SC-004**: El encargado genera e imprime cualquiera de los cinco reportes en menos de 1 minuto,
  incluida la elección de filtros.
- **SC-005**: Con el histórico simulado de 36 meses, cualquier reporte de un año completo se muestra
  en menos de 5 segundos.
- **SC-006**: El 100 % de las hojas impresas identifica el reporte, los filtros, la fecha de emisión
  y quién lo emitió, sin menús ni botones.
- **SC-007**: Una persona ajena al almacén entiende, solo con la hoja impresa, de qué período y de
  qué proveedor, representante o producto son los datos.

## Supuestos

- **Actor:** un solo rol con acceso total (D-10); los reportes exigen sesión (F-001).
- **Impresión:** se usa la función de impresión del navegador, que también permite guardar como PDF;
  no se genera un archivo descargable propio.
- **Fecha de corte de R-3:** el momento de emisión; no hay existencias "a una fecha pasada" (se
  obtienen con R-4 producto por producto).
- **Porcentaje atendido en R-5:** unidades entregadas sobre solicitadas a la fecha de emisión, igual
  que en el listado de F-004.
- **Nombre del sistema en el encabezado:** "Almacén Regional Oruro"; el nombre exacto del centro de
  salud se toma del catálogo si hay uno solo activo.
- **Prioridades (00 §5):** R-1, R-2, R-3 y la impresión son P2; R-4 y R-5 son P3 y son lo primero que
  se recorta si el plazo aprieta.
- **Fuera de alcance:** exportar a Excel o a un PDF descargable propio, gráficos de tablero,
  reportes programados o enviados por correo, reportes por centro de salud.
- **Dependencias:** requiere F-001 a F-005 con datos; la leyenda de datos simulados depende del
  generador de F-007.
