# Especificación de funcionalidad: F-004 · Pedidos

**Rama de la funcionalidad**: `004-pedidos` (sin rama propia; se trabaja en `main`)

**Creada**: 2026-09-13

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Registro de los pedidos de productos de limpieza que hacen
los representantes del centro de salud. El encargado registra el pedido eligiendo un representante
activo, la fecha, y uno o más productos con la cantidad solicitada. El pedido tiene un estado que
el sistema calcula según lo entregado: pendiente (nada entregado), parcial (algo entregado) o
atendido (todo entregado). Además el encargado puede anularlo con motivo si está pendiente o
parcial; en el caso parcial, lo entregado se mantiene. Solo se edita mientras está pendiente. El
listado de pedidos se filtra por estado y representante, y el detalle muestra por producto lo
solicitado, lo entregado y lo pendiente. Registrar un pedido no mueve el stock. Motivo: en 2022 el
pedido guardaba el producto en dos lugares y pasaba a "Enviado" sin comparar cantidades."

**Referencias**: `docs/especificacion/02-modelo-de-dominio.md` §2.4 y reglas RN-40 a RN-43 ·
`docs/especificacion/03-funcionalidades.md` §F-004 · Capítulo II: requerimiento 4; RF 5 ·
Decisiones D-10 y D-16 · Supuestos S-01 y S-04 · Defectos corregidos X-07, X-09 y X-10.

## Escenarios de usuario y pruebas *(obligatorio)*

**Actor único:** Encargado de almacén, con sesión iniciada (F-001). El representante no usa el
sistema: el encargado registra el pedido que el representante le hace llegar.

**Conceptos usados en esta especificación:**

- **Línea del pedido:** un producto solicitado, con cantidad solicitada y cantidad entregada. La
  cantidad entregada empieza en 0 y solo la cambian las distribuciones y sus anulaciones (F-005).
- **Pendiente de una línea:** cantidad solicitada menos cantidad entregada.
- **Estado del pedido:** lo calcula el sistema a partir de las líneas; el usuario no lo elige,
  salvo la anulación (RN-41):

| Estado | Condición |
|---|---|
| PENDIENTE | ninguna línea tiene entregas |
| PARCIAL | alguna línea tiene entregas, pero no todas están completas |
| ATENDIDO | en todas las líneas lo entregado es igual a lo solicitado |
| ANULADO | el encargado lo anuló (desde PENDIENTE o PARCIAL) |

### Historia 1 - Registrar un pedido (Prioridad: P1)

El encargado recibe la solicitud de un representante (por ejemplo, la jefa de enfermería de
emergencias) y la registra: elige al representante, indica la fecha y agrega los productos con la
cantidad que pide. El pedido queda PENDIENTE hasta que se distribuya.

**Por qué esta prioridad**: toda distribución atiende un pedido (S-04); sin pedidos no salen
productos del almacén.

**Prueba independiente**: con representantes y productos cargados, se registra un pedido de varios
productos y se verifica que queda PENDIENTE y que ningún stock cambió.

**Escenarios de aceptación**:

1. **Dados** un representante activo, una fecha y 3 productos con cantidades, **cuando** se guarda
   el pedido, **entonces** queda PENDIENTE, con un número de pedido asignado por el sistema, lo
   entregado en 0 en cada línea, y el stock de ningún producto cambia.
2. **Dado** un representante inactivo, **cuando** se registra un pedido nuevo, **entonces** no
   aparece en el selector (RN-14).
3. **Dado** un producto ya agregado al pedido, **cuando** se intenta agregarlo otra vez,
   **entonces** se rechaza indicando que ya está en el pedido y que se modifique su cantidad
   (RN-40).
4. **Dado** un pedido sin productos, **cuando** se intenta guardar, **entonces** se rechaza
   indicando que debe tener al menos un producto.
5. **Dada** una cantidad 0, negativa o con decimales, **cuando** se intenta guardar, **entonces** se
   rechaza indicando la línea y que la cantidad debe ser un entero mayor que 0.
6. **Dada** una fecha posterior a hoy, **cuando** se intenta guardar, **entonces** se rechaza
   indicando que la fecha del pedido no puede ser futura.
7. **Dado** un producto con stock actual 4, **cuando** se agrega al pedido con cantidad 10,
   **entonces** se acepta: el formulario muestra el stock actual como información, pero el pedido
   registra lo que se necesita, no lo que hay.
8. **Dado** un pedido con una línea inválida, **cuando** se intenta guardar, **entonces** no se
   guarda ni la cabecera ni ninguna línea.

---

### Historia 2 - Ver los pedidos por atender (Prioridad: P1)

El encargado ve la lista de pedidos que todavía tienen algo por entregar, para planificar las
distribuciones del día, y puede filtrar por representante, estado y fechas.

**Por qué esta prioridad**: es el punto de partida de cada distribución (F-005).

**Prueba independiente**: con pedidos en los cuatro estados, se abre el listado y se prueban los
filtros.

**Escenarios de aceptación**:

1. **Dados** pedidos en los cuatro estados, **cuando** se abre el listado, **entonces** por defecto
   muestra solo los PENDIENTE y PARCIAL, del más antiguo al más reciente, con número, fecha,
   representante, servicio, cantidad de productos, porcentaje atendido y estado.
2. **Dado** el filtro de estado, **cuando** se elige un estado concreto o "Todos", **entonces** se
   muestran los pedidos correspondientes.
3. **Dados** filtros por representante y por rango de fechas, **cuando** se aplican, **entonces**
   solo aparecen los pedidos que los cumplen, combinados con el filtro de estado.
4. **Dado** un pedido con 10 unidades solicitadas en total y 4 entregadas, **cuando** se muestra en
   el listado, **entonces** su porcentaje atendido es 40 %.

---

### Historia 3 - Ver el detalle de un pedido (Prioridad: P1)

El encargado abre un pedido y ve, por producto, cuánto se pidió, cuánto se entregó y cuánto falta,
además de las distribuciones que lo atendieron.

**Por qué esta prioridad**: sin esta vista no se sabe qué entregar ni se puede verificar que el
estado es correcto, que fue el defecto de 2022 (X-09).

**Prueba independiente**: con un pedido parcialmente atendido, se abre el detalle y se comparan
las cantidades con las distribuciones registradas.

**Escenarios de aceptación**:

1. **Dado** un pedido, **cuando** se abre su detalle, **entonces** muestra número, fecha,
   representante y servicio, observación, estado, quién lo registró y cuándo, y por cada línea:
   producto, unidad, solicitado, entregado y pendiente.
2. **Dado** un pedido con una línea de 10 solicitadas y 6 entregadas, y otra de 5 solicitadas y 5
   entregadas, **cuando** se abre su detalle, **entonces** las líneas muestran pendiente 4 y 0, y
   el estado es PARCIAL.
3. **Dado** un pedido atendido por distribuciones, **cuando** se abre su detalle, **entonces** lista
   esas distribuciones con Nº de vale, fecha y estado, cada una enlazada a su detalle.
4. **Dado** un pedido ANULADO, **cuando** se abre su detalle, **entonces** muestra el motivo, quién
   lo anuló y cuándo, lo entregado antes de anularse y el saldo que quedó anulado por línea.
5. **Dado** el detalle de un pedido PENDIENTE, **cuando** se consulta, **entonces** ofrece las
   opciones "Editar", "Anular" y "Distribuir"; en PARCIAL, solo "Anular" y "Distribuir"; en
   ATENDIDO y ANULADO, ninguna de las tres.

---

### Historia 4 - Editar un pedido que aún no se atendió (Prioridad: P2)

Si el representante corrige su solicitud antes de que se le entregue algo, el encargado edita el
pedido: cambia el representante, la fecha, la observación, agrega o quita productos o cambia
cantidades.

**Por qué esta prioridad**: evita anular y volver a registrar por un cambio menor, pero el ciclo
funciona sin ella.

**Prueba independiente**: se edita un pedido PENDIENTE y se verifican los cambios; se intenta
editar uno PARCIAL.

**Escenarios de aceptación**:

1. **Dado** un pedido PENDIENTE, **cuando** se agrega un producto, se quita otro y se cambia una
   cantidad, **entonces** el pedido queda con esas líneas, sigue PENDIENTE y conserva su número.
2. **Dado** un pedido `PARCIAL`, **cuando** se consulta, **entonces** la opción de editar no está
   disponible (RN-42).
3. **Dado** un pedido PENDIENTE abierto para editar, **cuando** mientras tanto se registra una
   distribución para él y luego se intenta guardar la edición, **entonces** se rechaza indicando
   que el pedido ya tiene entregas y no se puede editar.
4. **Dada** una edición que deja el pedido sin productos o con una línea inválida, **cuando** se
   intenta guardar, **entonces** se rechaza con las mismas reglas del registro y el pedido queda
   como estaba.

---

### Historia 5 - Anular un pedido o su saldo pendiente (Prioridad: P2)

Si el representante ya no necesita lo que pidió, el encargado anula el pedido con un motivo. Si ya
se entregó una parte, lo entregado se mantiene y solo se anula lo que faltaba.

**Por qué esta prioridad**: sin anulación, los pedidos que nunca se van a completar quedan para
siempre en la lista de pendientes; pero el ciclo básico funciona sin ella.

**Prueba independiente**: se anula un pedido PENDIENTE y uno PARCIAL, y se verifica estado,
cantidades y stock; se intenta anular uno ATENDIDO.

**Escenarios de aceptación**:

1. **Dado** un pedido PENDIENTE, **cuando** se anula con motivo, **entonces** queda ANULADO, no
   cambia ningún stock y desaparece del listado por defecto.
2. **Dado** un pedido PARCIAL con una línea de 10 solicitadas y 6 entregadas, **cuando** se anula
   con motivo, **entonces** queda ANULADO, lo entregado sigue siendo 6, el detalle muestra 4 como
   saldo anulado y no cambia ningún stock (RN-43).
3. **Dado** un pedido `ATENDIDO`, **cuando** se consulta, **entonces** la opción de anular no está
   disponible, y si se intenta por otro medio, se rechaza.
4. **Dado** un motivo vacío, **cuando** se intenta anular, **entonces** se rechaza indicando que el
   motivo es obligatorio.
5. **Dado** un pedido ANULADO, **cuando** se registra una distribución nueva, **entonces** ese pedido
   no aparece para elegir (F-005).

---

### Casos borde

- **Anulación de una distribución de un pedido ATENDIDO** (F-005): lo entregado se descuenta y el
  estado se recalcula, pudiendo volver a PARCIAL o PENDIENTE; si vuelve a PENDIENTE, se puede
  editar otra vez.
- **Distribución anulada de un pedido ANULADO:** no se permite (RN-35), para que el pedido anulado
  conserve lo entregado tal como estaba al anularse.
- **Anulación simultánea con una distribución:** si la distribución se guarda primero y completa el
  pedido, la anulación se rechaza porque el pedido ya está ATENDIDO; si la anulación se guarda
  primero, la distribución se rechaza porque el pedido ya está ANULADO.
- **Representante desactivado con pedidos por atender:** los pedidos se siguen mostrando y se
  pueden distribuir, editar (si están PENDIENTE) y anular; al editar, el representante inactivo se
  conserva, pero no se puede elegir otro inactivo.
- **Producto con saldo pendiente:** no se puede desactivar mientras esté en pedidos PENDIENTE o
  PARCIAL (F-002, RN-13); por eso ningún pedido por atender contiene productos inactivos.
- **Quitar una línea al editar:** solo se permite en pedidos PENDIENTE, así que ninguna línea con
  entregas se puede quitar.
- **Pedido con muchas líneas:** no hay un límite de productos por pedido; el catálogo simulado
  tiene unos 25.
- **Fecha del pedido y de la distribución:** una distribución no puede tener fecha anterior a la
  del pedido (F-005); al editar la fecha de un pedido PENDIENTE no hay distribuciones que la
  condicionen.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Registro y edición**

- **FR-001**: El sistema DEBE permitir registrar un pedido con representante activo (obligatorio),
  fecha (obligatoria, no futura), observación (opcional, hasta 200 caracteres) y una o más líneas
  con producto activo y cantidad solicitada (entero mayor que 0), sin repetir productos (RN-40).
- **FR-002**: El sistema DEBE asignar a cada pedido un número correlativo único, que no cambia al
  editarlo ni al anularlo.
- **FR-003**: Registrar o editar un pedido NO DEBE modificar el stock de ningún producto ni generar
  movimientos de kardex.
- **FR-004**: El sistema DEBE guardar el pedido completo (cabecera y líneas) en una sola operación
  indivisible, o no guardar nada; lo mismo al editarlo.
- **FR-005**: El sistema DEBE mostrar, al elegir cada producto, su stock actual como información,
  sin impedir solicitar una cantidad mayor.
- **FR-006**: El sistema DEBE permitir editar un pedido solo mientras está PENDIENTE (RN-42),
  verificándolo al guardar: representante, fecha, observación, agregar o quitar líneas y cambiar
  cantidades, con las mismas reglas del registro.
- **FR-007**: El sistema DEBE registrar qué usuario registró el pedido y cuándo.

**Estado**

- **FR-008**: El sistema DEBE calcular el estado del pedido según la tabla de estados (RN-41) cada
  vez que cambia lo entregado de alguna línea, y NO DEBE permitir elegirlo manualmente salvo la
  anulación.
- **FR-009**: La cantidad entregada de una línea DEBE ser siempre mayor o igual a 0 y menor o igual
  a la cantidad solicitada, y solo DEBE cambiar por distribuciones y sus anulaciones (F-005).

**Anulación**

- **FR-010**: El sistema DEBE permitir anular un pedido PENDIENTE o PARCIAL con motivo (obligatorio,
  hasta 200 caracteres), registrando quién lo anuló y cuándo (RN-43).
- **FR-011**: Al anular, el sistema DEBE conservar lo entregado de cada línea y considerar anulado
  el saldo pendiente; NO DEBE modificar stock ni generar movimientos.
- **FR-012**: El sistema DEBE impedir anular un pedido ATENDIDO o ANULADO, y registrar
  distribuciones para un pedido ANULADO.

**Consulta**

- **FR-013**: El sistema DEBE listar los pedidos con filtros por estado (por defecto, PENDIENTE y
  PARCIAL), representante y rango de fechas, mostrando número, fecha, representante, servicio,
  cantidad de productos, porcentaje atendido (unidades entregadas sobre solicitadas) y estado;
  ordenados del más antiguo al más reciente.
- **FR-014**: El sistema DEBE mostrar el detalle de un pedido con cabecera, estado, datos de
  registro y de anulación, líneas con solicitado, entregado y pendiente (o saldo anulado, si está
  ANULADO), y las distribuciones que lo atendieron enlazadas a su detalle.
- **FR-015**: El sistema DEBE ofrecer las acciones según el estado: editar solo en PENDIENTE; anular
  en PENDIENTE y PARCIAL; distribuir en PENDIENTE y PARCIAL.
- **FR-016**: Todos los mensajes de validación y error DEBEN estar en español e indicar qué está mal
  y cómo corregirlo.

### Entidades clave

- **Pedido**: solicitud de productos de un representante. Número correlativo, representante, fecha,
  observación, estado calculado (PENDIENTE, PARCIAL, ATENDIDO) o ANULADO, motivo, momento y usuario
  de anulación, usuario que lo registró. Los productos se guardan solo en sus líneas (X-07).
- **Línea de pedido**: producto solicitado, cantidad solicitada y cantidad entregada. Un producto por
  pedido.
- **Representante** (de F-002): quien solicita; su servicio o área se muestra con el pedido.
- **Distribución** (de F-005): atiende un pedido y actualiza lo entregado de sus líneas.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El encargado registra un pedido de 5 productos en menos de 2 minutos.
- **SC-002**: En el 100 % de los pedidos, el estado mostrado coincide con el que resulta de aplicar
  la tabla de estados a sus cantidades solicitadas y entregadas.
- **SC-003**: Registrar, editar o anular pedidos no cambia el stock de ningún producto en ningún
  caso.
- **SC-004**: El encargado identifica en menos de 30 segundos qué pedidos tienen productos por
  entregar y cuánto falta de cada uno.
- **SC-005**: El 0 % de los pedidos queda guardado sin líneas o con líneas a medio guardar.
- **SC-006**: Ningún pedido PARCIAL, ATENDIDO ni ANULADO puede editarse, y ninguno ATENDIDO ni
  ANULADO puede anularse.
- **SC-007**: Una persona que no participó en el desarrollo puede explicar, con el detalle de un
  pedido en pantalla, por qué tiene el estado que muestra.

## Supuestos

- **Actor:** el encargado registra los pedidos; el representante no accede al sistema (fuera de
  alcance).
- **Representante (S-01):** responsable de un servicio o área del centro de salud; el pedido muestra
  su servicio.
- **Número de pedido:** lo asigna el sistema de forma correlativa; no hay un talonario físico de
  pedidos (a diferencia del vale de distribución).
- **Cantidades (S-03):** enteras, en la unidad de presentación del producto.
- **Stock y pedido:** el pedido registra la necesidad; que haya o no stock se resuelve al
  distribuir.
- **Orden del listado:** del más antiguo al más reciente, para atender primero lo que más espera.
- **Fuera de alcance:** registro del pedido por el propio representante, aprobación del pedido,
  prioridad o urgencia, pedidos recurrentes, reserva de stock para pedidos.
- **Dependencias:** requiere F-001 (sesión) y F-002 (representantes y productos). F-005 actualiza
  lo entregado y el estado; los escenarios de estado PARCIAL y ATENDIDO se verifican por completo
  cuando exista F-005. F-006 (reporte de pedidos) y F-007 (informe de distribuciones) consumen los
  pedidos.
