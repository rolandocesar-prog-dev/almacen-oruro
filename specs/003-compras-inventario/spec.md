# Especificación de funcionalidad: F-003 · Compras e inventario

**Rama de la funcionalidad**: `003-compras-inventario` (sin rama propia; se trabaja en `main`)

**Creada**: 2026-09-13

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Registro de las compras de productos de limpieza a los
proveedores, y control del inventario. Una compra tiene una cabecera (proveedor, número de factura,
fecha, observación) y un detalle con uno o más productos, cada uno con cantidad y precio unitario;
el sistema calcula subtotales y total. Al guardar, cada producto aumenta su stock y queda
registrado un movimiento de entrada en el kardex. El número de factura no puede repetirse para el
mismo proveedor entre compras vigentes. Una compra no se edita: si tiene errores se anula indicando
el motivo, lo que revierte el stock mediante un movimiento de anulación; no se puede anular si el
producto ya se distribuyó y el stock no alcanza. El encargado consulta las existencias (stock
actual frente al mínimo, con los productos bajo mínimo resaltados) y el kardex de cada producto
(movimientos con fecha, tipo, documento de origen, cantidad y saldo). Motivo: en 2022, una factura
duplicada hacía que el detalle se guardara en la compra anterior y el stock subiera igual; ahora
la compra se guarda completa o no se guarda."

**Referencias**: `docs/especificacion/02-modelo-de-dominio.md` §2.3, §2.6 y reglas RN-20 a RN-26 y
RN-50 a RN-52 · `docs/especificacion/03-funcionalidades.md` §F-003 · Capítulo II: requerimiento 8;
RF 4 · Decisiones D-05 y D-16 · Constitución, principios III y IV · Defectos corregidos X-01,
X-05, X-06, X-12 y X-14.

## Clarifications

### Session 2026-09-13

- Q: Cuando una compra lleva una fecha de factura anterior a hoy, ¿en qué orden se arma el kardex y
  qué fecha usa el pronóstico mensual? → A: Cada movimiento guarda dos fechas, la del documento y
  el momento de registro. El kardex se ordena y calcula saldos por momento de registro; los
  reportes por período y el pronóstico agrupan por fecha del documento. Las anulaciones llevan la
  fecha del documento que anulan.
- Q: ¿Hay un plazo para anular una compra? → A: No; cualquier compra REGISTRADA se puede anular
  mientras el stock alcance, aunque cambie los totales de períodos pasados.
- Q: En la consulta de existencias, ¿qué pasa con un producto inactivo que todavía tiene stock? →
  A: Por defecto se muestran los activos y los inactivos con stock mayor que 0, marcados
  "Inactivo"; los inactivos sin stock solo aparecen con el filtro.

## Escenarios de usuario y pruebas *(obligatorio)*

**Actor único:** Encargado de almacén, con sesión iniciada (F-001). Usa los catálogos de F-002.

**Conceptos usados en esta especificación:**

- **Compra vigente:** compra en estado REGISTRADA. Una compra ANULADA no cuenta para la unicidad de
  la factura ni para los totales.
- **Kardex:** registro de todos los movimientos de inventario de un producto. Cada movimiento tiene
  tipo, cantidad con signo (positiva entra, negativa sale), documento de origen y saldo resultante.
  Es la única fuente del stock (constitución, principio III).
- **Bajo mínimo:** stock actual menor o igual al stock mínimo del producto (RN-52).

### Historia 1 - Registrar una compra (Prioridad: P1)

El encargado registra la compra que llegó con una factura: elige el proveedor, escribe el número de
factura y la fecha, agrega los productos con cantidad y precio unitario, y guarda. El sistema
calcula los subtotales y el total, suma el stock de cada producto y deja el movimiento en el
kardex. Si el número de factura ya está registrado para ese proveedor, se le avisa apenas lo
escribe, antes de cargar los productos.

**Por qué esta prioridad**: es la única forma de que entre stock al almacén; sin compras no hay
distribuciones ni histórico. Corrige el defecto más grave de 2022 (X-01).

**Prueba independiente**: con proveedores y productos cargados, se registra una compra de 3
productos y se verifica stock, kardex y total; se intenta una factura duplicada y una compra con
una línea inválida y se verifica que no cambia nada.

**Escenarios de aceptación**:

1. **Dada** una compra con 3 productos, **cuando** se guarda, **entonces** el stock de cada uno sube
   en su cantidad, hay 3 movimientos `ENTRADA_COMPRA` con saldo resultante correcto y la compra
   queda REGISTRADA.
2. **Dadas** las líneas 10 × 12,50 y 4 × 30,00, **cuando** se guarda la compra, **entonces** los
   subtotales son 125,00 y 120,00 y el total es 245,00, calculados por el sistema aunque se envíe
   otro valor desde el formulario (RN-23).
3. **Dada** una factura 1234 vigente del proveedor A, **cuando** se escribe 1234 con el proveedor A
   elegido, **entonces** el formulario avisa de inmediato "La factura 1234 ya está registrada para
   este proveedor"; si igual se intenta guardar, se rechaza y no cambia ningún stock (RN-21).
4. **Dada** la misma factura 1234 vigente del proveedor A, **cuando** se registra la factura 1234
   del proveedor B, **entonces** se acepta (X-05).
5. **Dada** una compra de 3 líneas en la que una tiene cantidad 0, **cuando** se intenta guardar,
   **entonces** no queda guardada ni la cabecera, ni ninguna línea, ni ningún movimiento, y el
   mensaje indica qué línea y qué campo corregir (RN-20).
6. **Dado** un producto ya agregado a la compra, **cuando** se intenta agregarlo otra vez,
   **entonces** se rechaza indicando que ya está en la compra y que se modifique su cantidad
   (RN-22).
7. **Dada** una compra sin líneas, **cuando** se intenta guardar, **entonces** se rechaza indicando
   que debe tener al menos un producto.
8. **Dada** una fecha posterior a hoy, **cuando** se intenta guardar, **entonces** se rechaza
   indicando que la fecha de la compra no puede ser futura.
9. **Dados** un proveedor inactivo y un producto inactivo, **cuando** se registra una compra nueva,
   **entonces** ninguno de los dos aparece para elegir (RN-14).

---

### Historia 2 - Consultar las existencias (Prioridad: P1)

El encargado ve el stock actual de todos los productos frente a su stock mínimo, con los que están
bajo mínimo resaltados, para saber qué hay que comprar.

**Por qué esta prioridad**: es la pregunta diaria del almacén ("¿qué tengo y qué me falta?") y la
base de la reposición sugerida de F-007.

**Prueba independiente**: con productos sobre, en y bajo el mínimo, se abre la consulta y se
comprueba el resaltado y los filtros.

**Escenarios de aceptación**:

1. **Dados** productos activos, **cuando** se consultan las existencias, **entonces** se muestran
   código, producto, categoría, unidad, stock actual, stock mínimo e indicador, ordenados primero
   los bajo mínimo y luego por nombre.
2. **Dado** un producto con stock actual 5 y stock mínimo 5, **cuando** se consulta, **entonces**
   aparece resaltado como "Bajo mínimo" (RN-52).
3. **Dado** el filtro "Solo bajo mínimo", **cuando** se aplica, **entonces** solo aparecen los
   productos resaltados y el encabezado indica cuántos son.
4. **Dado** el filtro por categoría o una búsqueda por código o nombre, **cuando** se aplica,
   **entonces** solo aparecen los productos que cumplen.
5. **Dado** un producto de la consulta, **cuando** se elige, **entonces** se abre su kardex.
6. **Dados** un producto inactivo con 8 unidades y otro inactivo sin stock, **cuando** se abre la
   consulta sin filtros, **entonces** aparece el primero marcado "Inactivo" y no el segundo; con el
   filtro "Inactivos" o "Todos" aparecen ambos. Los productos inactivos no se marcan "Bajo mínimo"
   ni cuentan en el total de productos bajo mínimo.

---

### Historia 3 - Consultar el kardex de un producto (Prioridad: P1)

El encargado revisa, para un producto, todos los movimientos que explican su stock: cuándo entró o
salió, por qué documento, cuánto, y con qué saldo quedó.

**Por qué esta prioridad**: es la prueba de que el stock es correcto y el punto central de la
defensa (D-05). Corrige el parche de auditoría de 2022 (X-12).

**Prueba independiente**: con compras, distribuciones y anulaciones de un producto, se abre su
kardex y se comprueba que el saldo final coincide con el stock actual.

**Escenarios de aceptación**:

1. **Dado** un producto con movimientos, **cuando** se abre su kardex, **entonces** se listan en el
   orden en que se registraron, con fecha del documento, momento de registro, tipo, documento de
   origen (Nº de factura y proveedor, o Nº de vale y representante), entrada, salida y saldo
   resultante.
2. **Dado** el kardex completo de un producto, **cuando** se compara el saldo del último movimiento
   con el stock actual, **entonces** son iguales (RN-50).
3. **Dado** cualquier movimiento, **cuando** se compara su saldo con el del movimiento anterior más
   su cantidad, **entonces** son iguales (RN-51).
4. **Dado** un rango de fechas, **cuando** se filtra el kardex, **entonces** se muestran solo los
   movimientos cuya fecha del documento está en el rango, con el saldo anterior (suma de los
   movimientos con fecha del documento previa al rango) y el saldo final (suma hasta el fin del
   rango).
5. **Dado** un movimiento, **cuando** se elige su documento de origen, **entonces** se abre el
   detalle de esa compra o distribución.
6. **Dada** la verificación de consistencia del inventario, **cuando** se ejecuta, **entonces**
   informa, para todos los productos, si el stock actual es igual a la suma de sus movimientos, y
   lista los productos con diferencia (en operación normal, ninguno) (RN-50).
7. **Dada** una distribución de un producto registrada ayer, **cuando** hoy se registra una compra
   de ese producto con fecha de factura de hace 10 días y se abre el kardex, **entonces** la compra
   aparece después de la distribución (orden de registro), con su fecha de documento de hace 10
   días, y ningún saldo anterior se modifica.
8. **Dada** la anulación hoy de una compra con fecha de factura del mes pasado, **cuando** se
   registra, **entonces** el movimiento `ANULACION_COMPRA` lleva como fecha del documento la de la
   compra anulada y como momento de registro el de hoy.

---

### Historia 4 - Listar compras y ver su detalle (Prioridad: P1)

El encargado busca una compra por fecha, proveedor o número de factura y abre su detalle.

**Por qué esta prioridad**: sin consulta no se puede verificar lo registrado ni elegir qué compra
anular.

**Prueba independiente**: con compras de varios proveedores y fechas, una de ellas anulada, se
filtra y se abre el detalle.

**Escenarios de aceptación**:

1. **Dado** el listado de compras, **cuando** se abre, **entonces** muestra las del mes en curso,
   de la más reciente a la más antigua, con fecha, Nº de factura, proveedor, cantidad de ítems,
   total y estado.
2. **Dados** filtros por rango de fechas, proveedor, estado y Nº de factura, **cuando** se aplican,
   **entonces** solo aparecen las compras que los cumplen.
3. **Dada** una compra, **cuando** se abre su detalle, **entonces** muestra la cabecera, cada línea
   con producto, cantidad, precio unitario y subtotal, el total, quién la registró y cuándo, y, si
   está anulada, el motivo, quién la anuló y cuándo.
4. **Dada** una compra REGISTRADA, **cuando** se abre su detalle, **entonces** no existe ninguna
   opción para editarla ni borrarla; solo para anularla (D-16).

---

### Historia 5 - Anular una compra mal registrada (Prioridad: P2)

Si una compra se registró con errores, el encargado la anula indicando el motivo. El sistema
revierte el stock con movimientos de anulación y la compra queda visible como ANULADA. Después
puede volver a registrarla bien, con el mismo número de factura.

**Por qué esta prioridad**: es el único mecanismo de corrección de errores, porque las compras no
se editan (D-16). Es P2 porque el ciclo compra → pedido → distribución funciona sin ella.

**Prueba independiente**: se registra una compra, se anula y se verifica stock, kardex y que la
factura queda libre; se intenta anular una compra cuyo stock ya se distribuyó.

**Escenarios de aceptación**:

1. **Dada** una compra REGISTRADA de 2 productos cuyo stock no se ha usado, **cuando** se anula con
   motivo, **entonces** queda ANULADA, se registra un movimiento `ANULACION_COMPRA` por línea con la
   cantidad en negativo, y el stock de cada producto vuelve a su valor anterior a la compra.
2. **Dada** una compra de 10 unidades de un producto sin otro stock, de la que ya se distribuyeron
   7, **cuando** se intenta anular, **entonces** se rechaza indicando "No se puede anular: faltan 7
   unidades de 'Lavandina 1 L' (stock actual 3, a revertir 10)" y no cambia nada (RN-25).
3. **Dado** un motivo vacío, **cuando** se intenta anular, **entonces** se rechaza indicando que el
   motivo es obligatorio.
4. **Dada** una compra ANULADA, **cuando** se consulta, **entonces** no se puede volver a anular ni
   editar (RN-26).
5. **Dada** la factura 1234 del proveedor A anulada, **cuando** se registra una compra nueva con la
   factura 1234 del proveedor A, **entonces** se acepta (RN-26).
6. **Dada** una compra con varias líneas en la que solo una no tiene stock suficiente, **cuando** se
   intenta anular, **entonces** no se anula ninguna línea: la anulación es completa o no ocurre.

---

### Casos borde

- **Dos registros simultáneos con la misma factura y proveedor:** solo uno se guarda; el otro recibe
  el aviso de factura duplicada y no cambia ningún stock.
- **Dos compras simultáneas del mismo producto:** ambas se guardan y el saldo de cada movimiento
  refleja el orden real en que se registraron; el stock final es la suma de ambas.
- **Anulación simultánea con una distribución del mismo producto:** la verificación de stock
  suficiente se hace con el stock en el momento de anular; si la distribución se guardó antes y
  el stock ya no alcanza, la anulación se rechaza.
- **Factura con ceros a la izquierda:** `0001234` y `1234` se consideran números distintos, porque
  se comparan tal como están impresos en la factura.
- **Anulación de una compra antigua:** se permite; los totales y saldos de los períodos de la fecha
  de esa compra cambian en consultas y reportes posteriores, y el detalle de la compra muestra
  cuándo, quién y por qué se anuló.
- **Producto desactivado después de comprarlo:** la compra y su kardex lo siguen mostrando; la
  anulación de esa compra está permitida.
- **Proveedor desactivado después de la compra:** la compra se sigue consultando y se puede anular.
- **Montos grandes:** el total no puede superar 9 999 999 999,99; se rechaza indicando el máximo.
- **Precio con más de 2 decimales:** se rechaza indicando que el precio admite hasta 2 decimales.
- **Sesión expirada al guardar:** no se guarda nada (F-001) y los datos escritos se pierden; el
  mensaje lo advierte.
- **Documento con fecha anterior a otros ya registrados:** en el kardex aparece según su orden de
  registro, por lo que las fechas del documento pueden verse desordenadas; los saldos de cada fila
  no cambian, y el saldo anterior y final de un rango sí reflejan la fecha del documento.
- **Producto sin movimientos:** su kardex muestra "Sin movimientos" y su stock es 0.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Registro de compras**

- **FR-001**: El sistema DEBE permitir registrar una compra con cabecera: proveedor activo
  (obligatorio), Nº de factura (obligatorio, hasta 20 caracteres, solo dígitos), fecha
  (obligatoria, no futura) y observación (opcional, hasta 200); y detalle con una o más líneas.
- **FR-002**: Cada línea DEBE tener un producto activo, cantidad (entero mayor que 0) y precio
  unitario (mayor que 0, hasta 2 decimales); un producto NO DEBE repetirse en la misma compra
  (RN-22).
- **FR-003**: El sistema DEBE calcular `subtotal = cantidad × precio unitario` por línea y
  `total = suma de subtotales`, ignorando cualquier subtotal o total enviado desde el formulario
  (RN-23, X-14). El formulario muestra una vista previa de los cálculos mientras se carga.
- **FR-004**: El sistema DEBE impedir registrar una compra con un Nº de factura que ya tiene otra
  compra REGISTRADA del mismo proveedor (RN-21, RN-26), avisándolo al escribir el número y
  verificándolo de nuevo al guardar.
- **FR-005**: Al guardar, el sistema DEBE, en una sola operación indivisible: guardar la cabecera y
  todas las líneas, registrar un movimiento `ENTRADA_COMPRA` por línea con la cantidad y el saldo
  resultante, y sumar la cantidad al stock actual de cada producto. Si cualquier paso falla, NO
  DEBE quedar guardado nada (RN-20, RN-24, X-01).
- **FR-006**: El sistema DEBE registrar qué usuario guardó la compra y en qué momento.
- **FR-007**: Ante un error de validación, el sistema DEBE indicar la línea y el campo a corregir, y
  conservar en el formulario los datos ya escritos.

**Consulta de compras**

- **FR-008**: El sistema DEBE listar las compras con filtros por rango de fechas (por defecto, el
  mes en curso), proveedor, estado y Nº de factura, ordenadas de la más reciente a la más antigua.
- **FR-009**: El sistema DEBE mostrar el detalle completo de una compra, incluidos los datos de
  registro y, si corresponde, de anulación.
- **FR-010**: El sistema NO DEBE ofrecer ninguna forma de editar ni borrar una compra (D-16).

**Anulación**

- **FR-011**: El sistema DEBE permitir anular una compra REGISTRADA, sin importar su antigüedad,
  indicando un motivo (obligatorio, hasta 200 caracteres) y registrar quién la anuló y cuándo.
- **FR-012**: Al anular, el sistema DEBE, en una sola operación indivisible: marcar la compra como
  ANULADA, registrar un movimiento `ANULACION_COMPRA` por línea con la cantidad en negativo y su
  saldo resultante, y restar la cantidad del stock actual de cada producto (RN-25).
- **FR-013**: El sistema DEBE rechazar la anulación completa si con ella algún producto quedaría con
  stock negativo, indicando cada producto afectado, su stock actual, la cantidad a revertir y
  cuánto falta (RN-25).
- **FR-014**: El sistema DEBE impedir anular una compra ya ANULADA (RN-26).

**Inventario y kardex**

- **FR-015**: El stock actual de un producto DEBE cambiar únicamente mediante un movimiento de
  kardex registrado en la misma operación (constitución, principio III).
- **FR-016**: El stock actual NUNCA DEBE quedar negativo, incluso con operaciones simultáneas sobre
  el mismo producto.
- **FR-017**: Cada movimiento DEBE registrar producto, fecha del documento, momento de registro,
  tipo, cantidad con signo, saldo resultante, documento de origen y usuario. Su saldo resultante
  DEBE ser igual al saldo del movimiento anterior del mismo producto, en orden de registro, más su
  cantidad (RN-51). Ningún saldo ya registrado se recalcula.- **FR-018**: El sistema DEBE ofrecer la consulta de existencias con código, producto, categoría,
  unidad, stock actual, stock mínimo e indicador "Bajo mínimo" (RN-52); con filtros por categoría,
  "solo bajo mínimo", estado (activos e inactivos con stock, que es el valor por defecto;
  inactivos; todos) y búsqueda por código o nombre; y el conteo de productos bajo mínimo. Los
  inactivos se marcan "Inactivo" y no se consideran bajo mínimo.
- **FR-019**: El sistema DEBE ofrecer el kardex de un producto en orden de registro, con fecha del
  documento, momento de registro, tipo, documento de origen (enlazado a su detalle), entrada,
  salida y saldo; filtrable por rango de fechas del documento, mostrando el saldo anterior (suma de
  movimientos con fecha del documento previa al rango) y el saldo final (suma hasta el fin del
  rango).
- **FR-020**: El sistema DEBE ofrecer una verificación de consistencia, ejecutable a pedido, que
  compare para cada producto el stock actual con la suma de sus movimientos y liste los productos
  con diferencia (RN-50).
- **FR-021**: Todos los mensajes de validación y error DEBEN estar en español e indicar qué está mal
  y cómo corregirlo. Los importes se muestran en bolivianos con 2 decimales.
- **FR-022**: La fecha del documento de un movimiento DEBE ser la fecha de la compra (o de la
  distribución, en F-005); en los movimientos de anulación, la fecha del documento anulado. Toda
  consulta, reporte o cálculo por período (F-006, F-007) DEBE agrupar por la fecha del documento
  (RN-53).

### Entidades clave

- **Compra**: documento de ingreso de productos. Proveedor, Nº de factura, fecha, observación,
  total calculado, estado (REGISTRADA o ANULADA), motivo y momento de anulación, usuario que la
  registró. Inmutable una vez guardada: solo cambia de estado al anularse.
- **Línea de compra**: producto comprado dentro de una compra. Producto, cantidad, precio unitario y
  subtotal calculado. Un producto por compra.
- **Movimiento de inventario (kardex)**: cada variación de stock de un producto. Tipo
  (`ENTRADA_COMPRA`, `ANULACION_COMPRA`; y desde F-005, `SALIDA_DISTRIBUCION` y
  `ANULACION_DISTRIBUCION`), cantidad con signo, saldo resultante, documento de origen, usuario y
  momento de registro. Nunca se edita ni se borra.
- **Producto** (de F-002): su stock actual es la suma de sus movimientos.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El encargado registra una compra de 5 productos en menos de 3 minutos.
- **SC-002**: Para el 100 % de los productos, en todo momento, el stock actual es igual a la suma
  de sus movimientos; la verificación de consistencia informa 0 diferencias tras cualquier
  secuencia de compras y anulaciones.
- **SC-003**: El 100 % de los intentos de registrar una factura duplicada para el mismo proveedor
  se rechaza sin cambiar ningún stock.
- **SC-004**: El 0 % de las compras con algún error queda guardada de forma parcial: no existen
  cabeceras sin líneas, líneas sin su movimiento ni movimientos sin su compra.
- **SC-005**: El total de cada compra coincide al centavo con la suma de sus subtotales en el 100 %
  de los casos.
- **SC-006**: Ningún producto muestra stock negativo en ningún momento, incluidas anulaciones
  rechazadas y operaciones simultáneas.
- **SC-007**: El encargado identifica en menos de 30 segundos qué productos están bajo mínimo.
- **SC-008**: Una persona que no participó en el desarrollo puede explicar, con el kardex de un
  producto en pantalla, de dónde sale cada unidad de su stock.

## Supuestos

- **Actor:** un solo rol con acceso total (D-10); todas las acciones exigen sesión (F-001).
- **Compra ya realizada:** se registra la compra con la factura en mano; no hay orden de compra,
  aprobación, pagos ni cuentas por pagar.
- **Moneda:** bolivianos; sin impuestos desglosados ni descuentos: el precio unitario es el que
  figura en la factura.
- **Fechas:** la fecha de la compra es la de la factura y puede ser anterior a hoy, sin límite
  inferior; el momento de registro lo pone el sistema (FR-017, FR-022). El generador de F-007
  registra los documentos en orden cronológico, así que en los datos simulados ambos órdenes
  coinciden.
- **Nº de factura:** solo dígitos, tal como figura impreso; no se valida contra ningún sistema
  tributario.
- **Motivo de anulación:** texto libre obligatorio; no hay catálogo de motivos.
- **Volumen:** decenas de compras por mes; el histórico simulado de 36 meses (F-007) se registra con
  estas mismas reglas.
- **Fuera de alcance:** orden de compra, aprobación, pagos, ajustes manuales de inventario (P3 si
  alcanza), lotes y vencimientos, precio promedio o valorización del inventario, edición de compras.
- **Dependencias:** requiere F-001 (sesión) y F-002 (proveedores y productos). F-005 agrega los
  movimientos de salida al mismo kardex; F-006 y F-007 consumen las compras y el kardex. Los
  escenarios de anulación con stock ya distribuido se verifican por completo cuando exista F-005.
