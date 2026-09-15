# Especificación de funcionalidad: F-005 · Distribución

**Rama de la funcionalidad**: `005-distribucion` (sin rama propia; se trabaja en `main`)

**Creada**: 2026-09-13

**Estado**: Aprobada

**Entrada**: Descripción del usuario: "Distribución de productos de limpieza para atender los
pedidos. El encargado elige un pedido pendiente o parcial; el sistema muestra el representante y,
por cada producto, lo solicitado, lo ya entregado, lo pendiente y el stock disponible. El encargado
ingresa el número de vale (del talonario físico), la fecha, una observación y la cantidad que
entrega de cada producto, que no puede superar ni lo pendiente ni el stock disponible. Se permiten
entregas parciales. Al guardar, cada producto reduce su stock con un movimiento de salida en el
kardex, se actualiza lo entregado en el pedido y se recalcula su estado. El número de vale no se
repite entre distribuciones vigentes. Una distribución no se edita: se anula con motivo, lo que
repone el stock y descuenta lo entregado del pedido. El encargado lista las distribuciones y ve el
detalle de cada una. Motivo: en 2022 el stock podía quedar negativo y un vale duplicado dejaba el
detalle en la distribución anterior."

**Referencias**: `docs/especificacion/02-modelo-de-dominio.md` §2.5, §2.6 y reglas RN-30 a RN-36,
RN-41, RN-50 a RN-53 · `docs/especificacion/03-funcionalidades.md` §F-005 · Capítulo II:
requerimiento 7; RF 3 · Decisiones D-05 y D-16 · Supuestos S-02, S-03 y S-04 · Constitución,
principios III y IV · Defectos corregidos X-02, X-03, X-08 y X-09.

## Clarifications

### Session 2026-09-13

- Q: ¿El número de vale es único entre todas las distribuciones vigentes o solo dentro del mismo
  año? → A: Entre todas las distribuciones REGISTRADAS, sin importar el año. Si Raymond confirma
  que el talonario reinicia su numeración (pendiente Q-04), se revisa esta regla.
- Q: Si un pedido está ANULADO y una de sus distribuciones se registró mal, ¿se puede anular esa
  distribución? → A: Sí; se repone el stock, se descuenta lo entregado y el pedido sigue ANULADO,
  con más saldo anulado.

### Session 2026-09-15

- Precisión (plan): un pedido por atender puede tener un representante o un producto inactivo (F-004,
  I-23); se distribuye igual, con el valor marcado "(inactivo)" (caso borde).
- Precisión (plan): el mensaje de cantidad excedida es único para ambos motivos e indica producto,
  máximo, pendiente y stock ("Lavandina 1 L: puedes entregar como máximo 5 (pendiente 5, stock 20)");
  si varias líneas se exceden, se informan todas juntas.
- Precisión (plan): en la vista de impresión del vale, los controles "Imprimir" y "Volver" están en
  pantalla pero no salen en la hoja impresa; la vista no tiene el menú del sistema.
- Precisión (análisis): la fecha futura se rechaza con su propio mensaje, y la anterior al pedido con el
  rango permitido (Historia 1 · E8); una misma línea del pedido no puede repetirse en la distribución
  (FR-003).
- Precisión (análisis): el detalle del pedido muestra las unidades de cada distribución, para explicar
  de dónde sale lo entregado (SC-008).

## Escenarios de usuario y pruebas *(obligatorio)*

**Actor único:** Encargado de almacén, con sesión iniciada (F-001). Atiende pedidos registrados en
F-004 con el stock que entró por compras (F-003).

**Conceptos usados en esta especificación:**

- **Distribución:** entrega de productos a un representante contra **un** pedido, respaldada por un
  vale del talonario físico. Estados: REGISTRADA o ANULADA.
- **Distribución vigente:** distribución REGISTRADA.
- **Pendiente de una línea del pedido:** solicitado menos entregado (F-004).
- **Máximo entregable de una línea:** el menor entre lo pendiente y el stock actual del producto
  (RN-32).

### Historia 1 - Registrar una distribución (Prioridad: P1)

El representante viene al almacén, o se le lleva lo pedido. El encargado abre el pedido, ve por
cada producto cuánto falta y cuánto hay en stock, escribe el número del vale que firma el
representante y la cantidad que entrega de cada producto, y guarda. El stock baja, el kardex
registra la salida y el pedido refleja lo entregado.

**Por qué esta prioridad**: es la salida de productos del almacén y cierra el ciclo compra → pedido
→ distribución. Corrige los defectos más graves de 2022: stock negativo (X-03) y vale duplicado
(X-02).

**Prueba independiente**: con un pedido PENDIENTE y stock suficiente, se registra una distribución
completa y se verifica stock, kardex, lo entregado y el estado del pedido; se intenta superar el
stock, superar lo pendiente y repetir un vale.

**Escenarios de aceptación**:

1. **Dado** un pedido PENDIENTE, **cuando** se elige para distribuir, **entonces** se muestran el
   representante, su servicio y, por cada línea, producto, unidad, solicitado, entregado,
   pendiente, stock disponible y máximo entregable (RN-36).
2. **Dado** un pedido de 10 unidades con stock 6, **cuando** se entregan 6, **entonces** el stock
   queda en 0, hay un movimiento `SALIDA_DISTRIBUCION` de −6 con saldo 0, el pedido pasa a
   `PARCIAL` y lo pendiente es 4.
3. **Dada** la misma situación, **cuando** se intenta entregar 7, **entonces** se rechaza sin
   guardar nada, indicando "Lavandina 1 L: puedes entregar como máximo 6 (pendiente 10, stock 6)"
   (RN-32).
4. **Dado** un pedido con 5 unidades pendientes y stock 20, **cuando** se intenta entregar 8,
   **entonces** se rechaza indicando que no se puede entregar más de lo pendiente (5).
5. **Dado** el vale 500 vigente, **cuando** se registra otra distribución con el vale 500,
   **entonces** el formulario avisa de inmediato "El vale 500 ya está registrado"; si igual se
   intenta guardar, se rechaza sin tocar el stock ni el pedido (RN-31).
6. **Dado** un pedido de 3 productos, **cuando** se entregan cantidades solo en 2 de ellos,
   **entonces** se guarda con esas 2 líneas; la tercera no genera movimiento y sigue pendiente
   (RN-33).
7. **Dada** una distribución en la que todas las cantidades están vacías o en 0, **cuando** se
   intenta guardar, **entonces** se rechaza indicando que se debe entregar al menos un producto.
8. **Dada** una fecha anterior a la fecha del pedido, **cuando** se intenta guardar, **entonces** se
   rechaza indicando el rango de fechas permitido (desde la fecha del pedido hasta hoy); **dada** una
   fecha posterior a hoy, se rechaza indicando que la fecha de la distribución no puede ser futura.
9. **Dada** una distribución con una línea válida y otra que supera el stock, **cuando** se intenta
   guardar, **entonces** no se guarda ni la cabecera, ni ninguna línea, ni ningún movimiento, ni
   cambia lo entregado del pedido (RN-30).
10. **Dado** un producto del pedido con stock 0, **cuando** se abre el formulario, **entonces** su
    línea muestra "Sin stock" y no admite cantidad.

---

### Historia 2 - Completar un pedido en varias entregas (Prioridad: P1)

Cuando no alcanza el stock, el encargado entrega lo que hay y completa el pedido con otra
distribución cuando llega la compra.

**Por qué esta prioridad**: con stock limitado, las entregas parciales son la situación normal; el
estado del pedido tiene que reflejarlo con exactitud (X-09).

**Prueba independiente**: se atiende un pedido en dos distribuciones y se verifican lo entregado y
el estado después de cada una.

**Escenarios de aceptación**:

1. **Dado** un pedido PARCIAL con 4 pendientes de un producto y ahora stock 10, **cuando** se
   entregan 4, **entonces** lo entregado de esa línea iguala lo solicitado.
2. **Al** completar lo pendiente de todas las líneas, **entonces** el pedido pasa a `ATENDIDO` y ya no
   aparece para distribuir ni en el listado de pedidos por atender.
3. **Dado** un pedido PARCIAL con dos líneas, una completa y otra con pendiente, **cuando** se abre
   para distribuir, **entonces** la línea completa se muestra como "Completa" sin admitir cantidad.
4. **Dado** un pedido ATENDIDO o ANULADO, **cuando** se registra una distribución nueva,
   **entonces** no aparece para elegir.

---

### Historia 3 - Listar distribuciones y ver su detalle (Prioridad: P1)

El encargado busca distribuciones por fecha, representante, producto o número de vale, y abre el
detalle de cada una.

**Por qué esta prioridad**: permite verificar lo entregado frente a los vales firmados y elegir qué
distribución anular.

**Prueba independiente**: con distribuciones de varios representantes y fechas, una anulada, se
filtra y se abre el detalle.

**Escenarios de aceptación**:

1. **Dado** el listado de distribuciones, **cuando** se abre, **entonces** muestra las del mes en
   curso, de la más reciente a la más antigua, con fecha, Nº de vale, Nº de pedido, representante,
   servicio, cantidad de productos, unidades entregadas y estado.
2. **Dados** filtros por rango de fechas, representante, producto, estado y Nº de vale, **cuando**
   se aplican, **entonces** solo aparecen las distribuciones que los cumplen.
3. **Dada** una distribución, **cuando** se abre su detalle, **entonces** muestra Nº de vale, fecha,
   pedido (enlazado), representante y servicio obtenidos del pedido, observación, estado, cada
   línea con producto, unidad y cantidad, quién la registró y cuándo, y, si está anulada, el
   motivo, quién la anuló y cuándo.
4. **Dada** una distribución REGISTRADA, **cuando** se abre su detalle, **entonces** no existe ninguna
   opción para editarla ni borrarla; solo para anularla e imprimir el vale (D-16).

---

### Historia 4 - Anular una distribución mal registrada (Prioridad: P2)

Si una distribución se registró con errores (vale equivocado, cantidades de más), el encargado la
anula indicando el motivo. El stock vuelve, lo entregado del pedido se descuenta y el estado del
pedido se recalcula. Después puede registrarla bien, con el mismo número de vale.

**Por qué esta prioridad**: es el único mecanismo de corrección, porque las distribuciones no se
editan (D-16); el ciclo básico funciona sin ella.

**Prueba independiente**: se anula una distribución y se verifica stock, kardex, lo entregado,
estado del pedido y que el vale queda libre.

**Escenarios de aceptación**:

1. **Dada** una distribución REGISTRADA de 2 productos, **cuando** se anula con motivo,
   **entonces** queda ANULADA, se registra un movimiento `ANULACION_DISTRIBUCION` por línea con la
   cantidad en positivo, el stock de cada producto sube en esa cantidad y lo entregado del pedido
   baja en la misma medida (RN-35).
2. **Al** anular la única distribución de un pedido `ATENDIDO`, **entonces** el pedido vuelve a
   `PENDIENTE` y el stock se repone.
3. **Dado** un pedido ATENDIDO con dos distribuciones, **cuando** se anula una de ellas,
   **entonces** el pedido pasa a PARCIAL.
4. **Dado** un pedido ANULADO con una línea de 10 solicitadas y 6 entregadas por una distribución,
   **cuando** se anula esa distribución, **entonces** el stock sube 6, lo entregado baja a 0, el
   saldo anulado de la línea pasa a 10 y el pedido sigue ANULADO (RN-35).
5. **Dado** un motivo vacío, **cuando** se intenta anular, **entonces** se rechaza indicando que el
   motivo es obligatorio.
6. **Dada** una distribución ANULADA, **cuando** se consulta, **entonces** no se puede volver a
   anular.
7. **Dado** el vale 500 de una distribución anulada, **cuando** se registra una distribución nueva
   con el vale 500, **entonces** se acepta (RN-31).
8. **Dada** la anulación hoy de una distribución con fecha del mes pasado, **cuando** se registra,
   **entonces** cada movimiento de anulación lleva como fecha del documento la de la distribución
   anulada (RN-53).

---

### Historia 5 - Imprimir el vale (Prioridad: P3)

El encargado imprime el vale de una distribución para que lo firmen quien entrega y quien recibe.

**Por qué esta prioridad**: el talonario físico ya cumple esa función; la impresión es una
comodidad (00 §5, P3).

**Prueba independiente**: se abre la vista de impresión de una distribución y se verifica su
contenido.

**Escenarios de aceptación**:

1. **Dada** una distribución, **cuando** se elige "Imprimir vale", **entonces** se muestra una vista
   limpia, sin menús ni botones, con el nombre del centro de salud, Nº de vale, fecha, Nº de
   pedido, representante y servicio, tabla de productos con unidad y cantidad, observación, y
   espacios para las firmas "Entregado por" y "Recibido por".
2. **Dada** una distribución ANULADA, **cuando** se imprime, **entonces** la vista muestra la leyenda
   "ANULADA" de forma visible.

---

### Casos borde

- **Dos distribuciones simultáneas que juntas superan el stock:** solo una se guarda; la otra recibe
  el error de stock insuficiente con el stock vigente y no cambia nada.
- **Dos distribuciones simultáneas del mismo pedido que juntas superan lo pendiente:** solo una se
  guarda; la otra recibe el error indicando el nuevo pendiente.
- **Distribución simultánea con la anulación del pedido:** gana la que se guarda primero; la otra se
  rechaza (F-004).
- **Distribución simultánea con la edición del pedido:** si la distribución se guarda primero, la
  edición se rechaza porque el pedido ya no está PENDIENTE (F-004).
- **Stock que cambia mientras se llena el formulario:** el máximo entregable mostrado es
  informativo; la verificación con autoridad se hace al guardar.
- **Compra anulada después de distribuir:** si la anulación de la compra dejaría stock negativo, se
  rechaza (F-003, RN-25); por eso una distribución nunca queda sin respaldo de stock.
- **Vale con ceros a la izquierda:** `0500` y `500` son números distintos, porque se comparan tal
  como están impresos.
- **Pedido por atender con representante o producto inactivo:** puede ocurrir si se desactivaron
  mientras el pedido estaba ATENDIDO (o con esa línea completa) y después se anuló una distribución
  (F-004, caso borde; decisión I-23). El pedido ya fue aceptado, así que se puede distribuir: el
  formulario muestra el valor marcado "(inactivo)" y la línea admite cantidad como cualquier otra.
  Si ya no corresponde entregarlo, el encargado anula el pedido.
- **Anulación de una distribución antigua:** se permite, sin plazo, igual que en compras; los totales
  de su período cambian en consultas y reportes posteriores.
- **Sesión expirada al guardar:** no se guarda nada (F-001).

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Registro**

- **FR-001**: El sistema DEBE permitir registrar una distribución solo para un pedido PENDIENTE o
  PARCIAL, con Nº de vale (obligatorio, hasta 20 caracteres, solo dígitos), fecha (obligatoria, no
  futura, no anterior a la fecha del pedido) y observación (opcional, hasta 200).
- **FR-002**: El sistema DEBE mostrar, por cada línea del pedido, producto, unidad, solicitado,
  entregado, pendiente, stock actual y máximo entregable (RN-36); las líneas completas o sin stock
  no admiten cantidad.
- **FR-003**: Cada línea de la distribución DEBE corresponder a un producto del pedido, con cantidad
  entera mayor que 0, menor o igual a lo pendiente de esa línea y menor o igual al stock actual del
  producto (RN-32). Las líneas sin cantidad no se incluyen, una misma línea del pedido no se repite,
  y la distribución DEBE tener al menos una línea (RN-33).
- **FR-004**: El sistema DEBE impedir registrar una distribución con un Nº de vale que ya tiene otra
  distribución REGISTRADA de cualquier fecha y representante (RN-31), avisándolo al escribir el número y verificándolo de nuevo al
  guardar.
- **FR-005**: Al guardar, el sistema DEBE, en una sola operación indivisible: verificar de nuevo lo
  pendiente y el stock de cada línea con los valores vigentes, guardar la cabecera y las líneas,
  registrar un movimiento `SALIDA_DISTRIBUCION` por línea con cantidad negativa y saldo
  resultante, restar la cantidad del stock actual, sumarla a lo entregado de la línea del pedido y
  recalcular el estado del pedido (RN-30, RN-34, RN-41). Si cualquier paso falla, NO DEBE quedar
  guardado nada.
- **FR-006**: El stock actual NUNCA DEBE quedar negativo, incluso con distribuciones simultáneas del
  mismo producto (RN-32, X-03).
- **FR-007**: El movimiento de salida DEBE llevar como fecha del documento la fecha de la
  distribución (RN-53).
- **FR-008**: El sistema DEBE obtener el representante de la distribución a partir del pedido, sin
  guardarlo por separado (X-08), y registrar qué usuario la guardó y cuándo.
- **FR-009**: Ante un error de validación, el sistema DEBE indicar la línea, el máximo permitido y
  el motivo (pendiente o stock), y conservar en el formulario los datos ya escritos.

**Consulta**

- **FR-010**: El sistema DEBE listar las distribuciones con filtros por rango de fechas (por defecto,
  el mes en curso), representante, producto, estado y Nº de vale, ordenadas de la más reciente a la
  más antigua.
- **FR-011**: El sistema DEBE mostrar el detalle completo de una distribución, con enlace al pedido
  y datos de registro y, si corresponde, de anulación.
- **FR-012**: El sistema NO DEBE ofrecer ninguna forma de editar ni borrar una distribución (D-16).

**Anulación**

- **FR-013**: El sistema DEBE permitir anular una distribución REGISTRADA, sin plazo, indicando un
  motivo (obligatorio, hasta 200 caracteres) y registrando quién la anuló y cuándo.
- **FR-014**: Al anular, el sistema DEBE, en una sola operación indivisible: marcar la distribución
  como ANULADA, registrar un movimiento `ANULACION_DISTRIBUCION` por línea con la cantidad en
  positivo, su saldo resultante y como fecha del documento la de la distribución anulada; sumar la
  cantidad al stock actual; restarla de lo entregado de la línea del pedido; y recalcular el estado
  del pedido, salvo que esté ANULADO, en cuyo caso sigue ANULADO (RN-35, RN-41, RN-53).
- **FR-015**: El sistema DEBE impedir anular una distribución ya ANULADA. Una distribución de un
  pedido ANULADO sí se puede anular (RN-35).

**Impresión (P3)**

- **FR-016**: El sistema DEBE ofrecer una vista de impresión del vale con centro de salud, Nº de
  vale, fecha, Nº de pedido, representante, servicio, productos con unidad y cantidad, observación,
  espacios de firma y la leyenda "ANULADA" si corresponde; sin menús ni botones.

**Generales**

- **FR-017**: Todos los mensajes de validación y error DEBEN estar en español e indicar qué está mal
  y cómo corregirlo.

### Entidades clave

- **Distribución**: documento de salida de productos que atiende un pedido. Pedido, Nº de vale,
  fecha, observación, estado (REGISTRADA o ANULADA), motivo, momento y usuario de anulación, usuario
  que la registró. El representante se obtiene del pedido. Inmutable una vez guardada: solo cambia
  de estado al anularse.
- **Línea de distribución**: producto entregado y cantidad. Pertenece a una línea del pedido.
- **Pedido y línea de pedido** (de F-004): lo entregado de cada línea y el estado del pedido se
  actualizan con cada distribución y anulación.
- **Movimiento de inventario** (de F-003): `SALIDA_DISTRIBUCION` al registrar,
  `ANULACION_DISTRIBUCION` al anular.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El encargado registra la distribución de un pedido de 5 productos en menos de 2
  minutos.
- **SC-002**: Ningún producto muestra stock negativo en ningún momento, incluidas distribuciones
  simultáneas.
- **SC-003**: El 100 % de los intentos de entregar más de lo pendiente o más del stock se rechaza
  sin guardar nada.
- **SC-004**: El 100 % de los intentos de registrar un vale vigente repetido se rechaza sin cambiar
  stock ni pedidos.
- **SC-005**: Para el 100 % de las líneas de pedido, lo entregado es igual a la suma de las
  cantidades de sus distribuciones REGISTRADAS.
- **SC-006**: Tras cualquier secuencia de distribuciones y anulaciones, la verificación de
  consistencia del inventario (F-003) informa 0 diferencias.
- **SC-007**: El 0 % de las distribuciones con algún error queda guardada de forma parcial.
- **SC-008**: Una persona que no participó en el desarrollo puede explicar, con un pedido y sus
  distribuciones en pantalla, por qué el pedido tiene su estado y de dónde sale lo pendiente.

## Supuestos

- **Actor:** el encargado registra las distribuciones; el representante no accede al sistema ni
  confirma la recepción en él.
- **Vale (S-02):** el número lo escribe el usuario a partir del talonario físico; es único entre
  todas las distribuciones vigentes, sin distinguir año ni representante.
- **Un pedido por distribución (S-04):** no hay distribuciones sin pedido ni que atiendan varios
  pedidos a la vez.
- **Cantidades (S-03):** enteras, en la unidad de presentación del producto.
- **Sin reserva de stock:** el stock no se aparta al registrar el pedido; se descuenta solo al
  distribuir.
- **Centro de salud en el vale:** se imprime el del representante del pedido.
- **Fuera de alcance:** distribuciones sin pedido, transporte y logística, confirmación de recepción
  por el representante, devoluciones parciales (una devolución se registra anulando la
  distribución y registrándola de nuevo con lo correcto), edición de distribuciones.
- **Dependencias:** requiere F-001 (sesión), F-002 (productos, representantes), F-003 (stock y
  kardex) y F-004 (pedidos). F-006 y F-007 consumen las distribuciones: el consumo mensual del
  pronóstico sale de sus movimientos.
