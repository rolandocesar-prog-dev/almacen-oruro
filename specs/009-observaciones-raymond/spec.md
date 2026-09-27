# Especificación de funcionalidad: F-009 · Observaciones de Raymond

**Rama de la funcionalidad**: `009-observaciones-raymond`

**Creada**: 2026-09-26

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Observaciones de Raymond tras recibir el sistema: 1) en todas
las pantallas donde se ingresa una contraseña debe haber una opción para ver lo que se está
escribiendo; 2) por cada centro de salud solo puede haber un representante, y hoy un centro tiene
varios; 3) en los desplegables, informes y demás lugares donde aparece el nombre del representante,
debe ir acompañado del centro de salud al que pertenece; 4) en algún lugar conveniente debe haber un
botón para generar un respaldo del estado actual de la base de datos, de todo lo que es el
funcionamiento del sistema."

**Referencias**: Observaciones de Raymond recibidas el 26/09 · Revierte las decisiones D-11 (un
solo centro de salud en operación) y D-18 (el representante es responsable de un servicio) ·
Reemplaza FR-021 y FR-022 de F-002 · Afecta la presentación de F-004 (pedidos), F-005
(distribución), F-006 (reportes) y F-007 (informe IA de distribuciones y generador del histórico
simulado) · Afecta los formularios de contraseña de F-001 · `docs/especificacion/02-modelo-de-dominio.md`
§2.2 y reglas RN-13, RN-14 y RN-17.

## Clarifications

### Session 2026-09-26

- Q: Con la regla "un centro de salud = un representante", ¿qué pasa con el modelo actual de un
  centro con cinco representantes, uno por servicio? → A: Se registran **varios centros de salud
  reales**, cada uno con su representante. El dato "servicio" del representante desaparece.
- Q: ¿Cómo se aplica la regla cuando cambia la persona responsable de un centro? → A: **Un
  representante activo a la vez.** Si cambia la persona, se desactiva el anterior y se registra el
  nuevo; los pedidos anteriores siguen mostrando a quien los hizo.
- Q: Si el representante saliente tiene pedidos PENDIENTE o PARCIAL, ¿qué hace el sistema? → A: Se
  permite **desactivarlo**; sus pedidos por atender **siguen a su nombre** y se pueden seguir
  distribuyendo. Cambia RN-13 solo para representantes.
- Q: ¿Dónde se muestra el representante acompañado de su centro de salud? → A: **En todos los
  lugares** donde aparece un representante: selectores, listados, fichas, detalles de documentos,
  reportes en pantalla e impresos, vale, kardex e informe IA.
- Q: Para la demostración, ¿de dónde salen los centros de salud? → A: Son **los centros reales**
  que atiende el almacén y los provee Raymond. Los representantes siguen siendo personas ficticias.
- Q: ¿Qué debe permitir el respaldo desde el sistema? → A: **Solo generarlo y descargarlo.** La
  restauración queda documentada en la guía de instalación y se hace fuera del sistema.
- Q: ¿Qué incluye el respaldo? → A: **Todos los datos de la base**, sin el código (ya está en el
  repositorio) ni la configuración con secretos (clave del servicio de IA, contraseña de la base).
- Q: ¿Los filtros de pedidos, distribuciones y sus reportes deben permitir filtrar por centro de
  salud, además de por representante? → A: **No.** Siguen filtrando por representante, cuya etiqueta
  ya muestra el centro; filtrar por centro queda como trabajo futuro.
- Q: En la ficha del centro, ¿los representantes anteriores deben mostrar desde y hasta cuándo fueron
  responsables? → A: **No.** Se muestran nombre y CI, sin fechas; no se agrega una fecha de baja al
  modelo. Cuándo pidió cada uno ya se ve en sus pedidos.

## Escenarios de usuario y pruebas *(obligatorio)*

**Actor único:** Encargado de almacén, con sesión iniciada (F-001), salvo la Historia 5 en la
pantalla de ingreso, donde todavía no hay sesión.

### Historia 1 - Un solo representante activo por centro de salud (Prioridad: P1)

Cada centro de salud que atiende el almacén tiene una persona responsable de pedir los productos.
El encargado registra los centros y, para cada uno, a su representante. Si la persona responsable
cambia, el encargado desactiva al representante anterior y registra al nuevo: el centro nunca queda
con dos representantes activos, y los pedidos viejos siguen mostrando a quien los hizo.

**Por qué esta prioridad**: es la regla de negocio que Raymond marcó como la más importante, y
cambia la forma en que se registra quién pide los productos.

**Prueba independiente**: se registran dos centros de salud con un representante cada uno; se
verifica el rechazo de un segundo representante activo en el mismo centro por las tres vías posibles
(registro, reactivación y cambio de centro) y que el reemplazo por desactivación funciona.

**Escenarios de aceptación**:

1. **Dado** un centro de salud activo sin representante activo, **cuando** se registra un
   representante para ese centro, **entonces** queda activo y disponible para elegir en pedidos
   nuevos.
2. **Dado** el centro "Policlínico A" con la representante activa "Quispe, María", **cuando** se
   intenta registrar otro representante para ese centro, **entonces** se rechaza con un mensaje que
   nombra a la representante actual e indica que primero hay que desactivarla.
3. **Dado** un representante inactivo del "Policlínico A", que ya tiene otro representante activo,
   **cuando** se intenta reactivar al inactivo, **entonces** se rechaza con un mensaje que nombra al
   representante activo del centro.
4. **Dado** un representante activo del "Policlínico A", **cuando** se intenta cambiarlo al
   "Policlínico B", que ya tiene representante activo, **entonces** se rechaza con un mensaje que
   nombra al representante activo del "Policlínico B".
5. **Dada** la representante "Quispe, María", **cuando** se la desactiva y se registra a "Mamani,
   Jorge" para el mismo centro, **entonces** Jorge queda como representante activo y los pedidos
   anteriores del centro siguen mostrando a María.
6. **Dada** una representante con 2 pedidos PENDIENTE o PARCIAL, **cuando** se la desactiva,
   **entonces** el sistema avisa antes que tiene 2 pedidos por atender, la desactiva al confirmar, y
   esos pedidos se pueden seguir distribuyendo a su nombre.
7. **Dado** el formulario de un representante nuevo, **cuando** se abre el selector de centro de
   salud, **entonces** solo aparecen los centros activos que no tienen representante activo.
8. **Dado** un centro de salud, **cuando** se abre su ficha, **entonces** se ve su representante
   activo (o "Sin representante activo") y la lista de sus representantes anteriores.
9. **Dados** dos intentos simultáneos de dejar dos representantes activos en el mismo centro,
   **cuando** ambos se procesan, **entonces** solo uno se acepta y el otro recibe el mensaje de
   rechazo.

---

### Historia 2 - Demostración con los centros de salud reales (Prioridad: P1)

La base de demostración se genera con los centros de salud reales que atiende el almacén, cada uno
con un representante ficticio, y con el mismo volumen de productos y meses de historia que hoy. El
pronóstico, la evaluación y los informes IA siguen funcionando sobre esa historia.

**Por qué esta prioridad**: el histórico simulado actual está construido sobre cinco representantes
de un mismo centro y no cumple la regla de la Historia 1. Sin regenerarlo, la demostración ante el
tribunal contradice la regla que se va a defender.

**Prueba independiente**: sobre una base vacía se genera el histórico y se verifica que cada centro
tiene exactamente un representante activo, que hay pedidos y distribuciones de todos los centros y
que el pronóstico y la evaluación se calculan para todos los productos.

**Escenarios de aceptación**:

1. **Dada** una base vacía, **cuando** se genera el histórico simulado, **entonces** existen los
   centros de salud provistos por Raymond, cada uno con un único representante activo.
2. **Dado** el histórico generado, **cuando** se consulta el pronóstico y la evaluación,
   **entonces** se calculan para todos los productos evaluables, igual que antes del cambio.
3. **Dado** el histórico generado, **cuando** se genera el informe IA de distribuciones,
   **entonces** los datos se agrupan por centro de salud y su representante, no por servicio.
4. **Dada** la misma semilla, **cuando** se genera dos veces el histórico, **entonces** los datos
   son idénticos.

---

### Historia 3 - El representante siempre con su centro de salud (Prioridad: P2)

En todo lugar donde el sistema muestra a un representante, lo acompaña el nombre de su centro de
salud, con el formato "Apellido, Nombre · Centro de salud". Donde antes había una columna o un dato
"Servicio", ahora aparece "Centro de salud".

**Por qué esta prioridad**: con varios centros, el nombre de la persona solo no alcanza para saber
a quién se entrega; la regla de la Historia 1 tiene que verse en todo el sistema.

**Prueba independiente**: con dos centros registrados, se recorre cada pantalla y documento impreso
de la lista de FR-011 y se verifica que el representante aparece con su centro.

**Escenarios de aceptación**:

1. **Dado** el formulario de pedido nuevo, **cuando** se abre el selector de representante,
   **entonces** cada opción dice "Apellido, Nombre · Centro de salud".
2. **Dados** los filtros de pedidos, distribuciones y de los reportes de pedidos y distribuciones,
   **cuando** se abre el selector de representante, **entonces** cada opción incluye el centro de
   salud y, si el representante está inactivo, la marca "(inactivo)".
3. **Dado** un vale de distribución impreso, **cuando** se lee, **entonces** muestra el
   representante y su centro de salud, y ya no muestra "Servicio".
4. **Dado** un reporte de pedidos o de distribuciones, **cuando** se muestra en pantalla o se
   imprime, **entonces** la columna "Servicio" es ahora "Centro de salud".
5. **Dado** un representante desactivado, **cuando** se consultan sus pedidos anteriores,
   **entonces** siguen mostrando su nombre y el centro de salud al que pertenecía.

---

### Historia 4 - Generar y descargar un respaldo de la base (Prioridad: P2)

Desde la sección de administración, el encargado genera un respaldo de todos los datos del sistema
y lo descarga como un archivo que guarda fuera del equipo (por ejemplo, en una memoria USB). Si el
equipo falla, con ese archivo y la guía de instalación se recupera el sistema tal como estaba.

**Por qué esta prioridad**: protege el trabajo acumulado del almacén. No es P1 porque no cambia
ninguna regla de negocio ni la demostración de las demás funcionalidades.

**Prueba independiente**: se genera un respaldo con los datos de demostración, se restaura en una
base vacía siguiendo la guía y se verifica que el sistema restaurado tiene los mismos datos, que su
kardex cuadra y que se puede ingresar con las mismas contraseñas.

**Escenarios de aceptación**:

1. **Dado** el menú, **cuando** el encargado abre la sección de administración, **entonces**
   encuentra la opción "Respaldo".
2. **Dada** la pantalla de respaldo, **cuando** el encargado pulsa "Generar respaldo", **entonces**
   el navegador descarga un archivo cuyo nombre incluye el sistema, la fecha y la hora.
3. **Dada** la pantalla de respaldo, **cuando** se muestra, **entonces** advierte que el archivo
   contiene datos personales y contraseñas cifradas del personal, y que debe guardarse en un lugar
   seguro.
4. **Dado** un respaldo generado, **cuando** se restaura en una base vacía siguiendo la guía de
   instalación, **entonces** la cantidad de registros de cada tabla es igual a la original, la suma
   de los movimientos de cada producto es igual a su stock y el personal ingresa con sus contraseñas.
5. **Dado** que la base de datos no está disponible, **cuando** se pulsa "Generar respaldo",
   **entonces** no se descarga ningún archivo y el mensaje dice qué pasó y qué hacer.
6. **Dado** un documento que se registra mientras se genera el respaldo, **cuando** se restaura ese
   respaldo, **entonces** el documento está completo (cabecera, detalle y movimientos) o no está.

---

### Historia 5 - Ver la contraseña mientras se escribe (Prioridad: P3)

En cada campo de contraseña hay un botón para mostrar u ocultar lo que se escribió, para comprobar
que no hay errores de tipeo antes de enviar.

**Por qué esta prioridad**: mejora la comodidad y evita ingresos fallidos, pero no cambia ninguna
regla ni dato.

**Prueba independiente**: en cada una de las cuatro pantallas con contraseñas se escribe un valor,
se lo muestra, se lo vuelve a ocultar y se envía el formulario, verificando que el resultado es el
mismo que sin usar el botón.

**Escenarios de aceptación**:

1. **Dado** un campo de contraseña con texto escrito, **cuando** se pulsa "Mostrar", **entonces** el
   texto se ve y el botón pasa a decir "Ocultar".
2. **Dado** un formulario con dos campos de contraseña, **cuando** se muestra uno, **entonces** el
   otro sigue oculto.
3. **Dado** un campo mostrado, **cuando** se envía el formulario, **entonces** lo enviado y validado
   es exactamente lo escrito, y los campos vuelven a quedar ocultos.
4. **Dado** quien navega solo con teclado o con lector de pantalla, **cuando** llega al botón,
   **entonces** puede activarlo y sabe si la contraseña está visible u oculta.

---

### Casos borde

- **Centro sin representante activo:** puede existir (por ejemplo, entre la baja de una persona y
  el registro de la siguiente). No aparece en el selector de pedidos nuevos porque no hay a quién
  asignarlo, y su ficha dice "Sin representante activo".
- **Desactivar un centro de salud:** sigue la regla RN-13; se rechaza si tiene un representante
  activo, nombrándolo (FR-027).
- **Reactivar un representante cuyo centro está inactivo:** sigue la regla RN-17; primero se
  reactiva el centro.
- **Modificar los datos de un representante activo sin cambiar su centro:** se permite; la regla
  solo se evalúa cuando cambia el centro o el estado.
- **Representante saliente con pedidos por atender:** se desactiva con aviso (FR-006). Sus pedidos
  siguen apareciendo en el listado y se distribuyen, anulan o editan (mientras estén PENDIENTE) como
  cualquier otro: al editar se conserva su representante aunque esté inactivo, como ya permite F-004;
  solo no se puede cambiar a otro representante inactivo.
- **Informes IA guardados antes del cambio:** no existen en la base regenerada; si una base
  conservara alguno, se sigue pudiendo consultar e imprimir.
- **Respaldo sin datos de demostración:** se genera igual; el respaldo de una base de demostración
  conserva su marca de "datos simulados" al restaurarse.
- **Respaldo de gran tamaño:** con el volumen de demostración (36 meses) la generación termina en
  segundos; si tardara, la pantalla indica que se está generando y no permite pulsar dos veces.
- **Contraseña mostrada y error de validación:** si el formulario vuelve con errores, los campos
  quedan ocultos igual que tras un envío correcto.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Un representante activo por centro (Historia 1)**

- **FR-001**: Un centro de salud DEBE tener como máximo **un representante activo**. La regla DEBE
  cumplirse aun ante operaciones simultáneas.
- **FR-002**: El sistema DEBE rechazar registrar un representante para un centro que ya tiene
  representante activo, con un mensaje que nombre al representante activo e indique que primero hay
  que desactivarlo.
- **FR-003**: El sistema DEBE rechazar reactivar un representante si su centro ya tiene otro
  representante activo, y rechazar cambiar un representante activo a un centro que ya tiene
  representante activo, con el mismo tipo de mensaje.
- **FR-004**: Un representante DEBE tener nombre (obligatorio, hasta 60), apellido (obligatorio,
  hasta 60), CI (obligatorio, único, mismo formato que F-002), teléfono (opcional, hasta 20) y
  centro de salud activo. El dato **servicio o área deja de existir**. Reemplaza FR-021 de F-002.
- **FR-005**: El selector de centro de salud del formulario de representante DEBE ofrecer solo los
  centros activos sin representante activo, más el centro actual del representante que se está
  modificando. Si queda un solo centro disponible, DEBE aparecer preseleccionado. Reemplaza FR-022
  de F-002, que preseleccionaba el centro cuando había uno solo activo.
- **FR-006**: El sistema DEBE permitir desactivar un representante aunque tenga pedidos PENDIENTE o
  PARCIAL, avisando antes cuántos son. Esos pedidos siguen a su nombre y se pueden seguir
  distribuyendo y anulando. Modifica RN-13 solo para representantes; para categorías, unidades,
  productos y centros de salud la regla no cambia.
- **FR-007**: La ficha de un centro de salud DEBE mostrar su representante activo, o "Sin
  representante activo", y la lista de sus representantes anteriores con nombre y CI, ordenada por
  apellido y sin fechas de alta ni de baja.
- **FR-008**: Los pedidos, distribuciones y movimientos ya registrados DEBEN seguir mostrando el
  representante que los originó, aunque esté inactivo o su centro tenga hoy otro representante.
- **FR-027**: Al rechazar la desactivación de un centro de salud con representante activo (RN-13),
  el mensaje DEBE nombrar a ese representante ("No se puede desactivar: su representante activo es
  'Quispe, María'"), en lugar de contar representantes activos, porque ahora puede haber como
  máximo uno.

**Demostración con centros reales (Historia 2)**

- **FR-009**: El histórico simulado DEBE generarse con los centros de salud reales que provee
  Raymond, cada uno con un único representante activo ficticio, conservando el volumen actual (25
  productos en 6 categorías y 36 meses) y la reproducibilidad por semilla. Mientras Raymond no
  envíe los nombres (Q-07), el generador usa nombres provisorios evidentes; este requisito y SC-006
  se dan por cumplidos recién con la demostración regenerada con los nombres reales.
- **FR-010**: El informe IA de distribuciones DEBE agrupar lo entregado por centro de salud y su
  representante, en lugar de por representante y servicio. El pronóstico, la evaluación y la
  reposición sugerida no cambian su método.

**El representante con su centro (Historia 3)**

- **FR-011**: En todo lugar donde se muestre un representante DEBE mostrarse también su centro de
  salud. Como mínimo: el selector del formulario de pedido; los filtros de pedidos, distribuciones y
  de los reportes de pedidos y distribuciones; los listados de pedidos, distribuciones y
  representantes; los detalles de pedido y distribución; el formulario de distribución; el vale
  impreso; los reportes de pedidos y distribuciones en pantalla e impresos, incluido el filtro que
  figura en su encabezado; el kardex y su reporte; y el informe IA de distribuciones.
- **FR-012**: En los selectores y textos corridos el formato DEBE ser "Apellido, Nombre · Centro de
  salud", con la marca "(inactivo)" cuando corresponda. En tablas, el centro de salud PUEDE ir en su
  propia columna, y en fichas e impresos que ya lo muestran en su propio dato, NO DEBE repetirse
  junto al nombre.
- **FR-013**: Toda columna o dato rotulado "Servicio" DEBE reemplazarse por "Centro de salud".

**Respaldo (Historia 4)**

- **FR-014**: El menú DEBE ofrecer la opción "Respaldo" en la sección de administración.
- **FR-015**: El encargado DEBE poder generar, con una sola acción, un respaldo de **todos los datos
  de la base**: catálogos, compras, pedidos, distribuciones, kardex, personal, sesiones, informes IA
  y configuración del sistema (incluida la marca de datos simulados).
- **FR-016**: El respaldo DEBE reflejar un único instante coherente: un documento que se registra
  mientras se genera queda completo o no queda.
- **FR-017**: El respaldo DEBE descargarse en el navegador como un archivo cuyo nombre incluye el
  nombre del sistema, la fecha y la hora de generación. El sistema NO DEBE conservar copias en el
  servidor.
- **FR-018**: El respaldo NO DEBE incluir el código del sistema ni la configuración con secretos
  (clave del servicio de IA, contraseña de la base).
- **FR-019**: La pantalla de respaldo DEBE advertir que el archivo contiene datos personales y
  contraseñas cifradas del personal, y que debe guardarse en un lugar seguro.
- **FR-020**: Si el respaldo no se puede generar, el sistema NO DEBE descargar un archivo incompleto
  y DEBE informar qué pasó y qué hacer.
- **FR-021**: Mientras se genera un respaldo, la pantalla DEBE indicarlo y no permitir iniciar otro
  desde la misma pantalla.
- **FR-022**: La guía de instalación DEBE documentar, paso a paso, cómo restaurar un respaldo en una
  base vacía. La restauración NO se ofrece desde el sistema.

**Ver la contraseña (Historia 5)**

- **FR-023**: Cada campo de contraseña DEBE tener un botón para mostrar u ocultar su contenido. Son
  ocho campos en cuatro pantallas: ingreso; cambiar mi contraseña (actual, nueva y confirmación);
  registrar personal (contraseña y confirmación); y restablecer la contraseña de una persona (nueva
  y confirmación).
- **FR-024**: Todo campo de contraseña DEBE empezar oculto, y cada uno se muestra u oculta por
  separado.
- **FR-025**: El botón DEBE poder usarse con teclado e indicar, en texto y para lectores de
  pantalla, si la contraseña está visible u oculta.
- **FR-026**: Al enviar el formulario, con éxito o con errores, los campos de contraseña DEBEN
  volver a quedar ocultos. Mostrar la contraseña NO DEBE cambiar lo que se envía ni cómo se valida.

### Entidades clave

- **Centro de salud**: sin cambios en sus datos. Cambia su relación con el representante: tiene
  como máximo uno activo y conserva el historial de los anteriores.
- **Representante**: pierde el dato "servicio"; se identifica por su nombre y su centro de salud.
- **Respaldo**: archivo descargado con todos los datos de la base en un instante coherente. No se
  guarda en el sistema; lo custodia el encargado.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El 100 % de los intentos de dejar dos representantes activos en un mismo centro se
  rechaza, por cualquiera de las tres vías (registro, reactivación, cambio de centro), incluidos los
  intentos simultáneos.
- **SC-002**: En el 100 % de los lugares listados en FR-011, el representante aparece con su centro
  de salud, y en ninguna pantalla ni documento impreso queda el rótulo "Servicio".
- **SC-003**: Con el volumen de demostración, el encargado obtiene el archivo de respaldo en menos de
  30 segundos desde que pulsa el botón.
- **SC-004**: Un respaldo restaurado en una base vacía siguiendo la guía reproduce el 100 % de los
  registros de cada tabla, el kardex cuadra para el 100 % de los productos y el personal ingresa con
  sus contraseñas de siempre.
- **SC-005**: En cualquiera de los ocho campos de contraseña, el encargado comprueba lo que escribió
  con una sola acción.
- **SC-006**: En la base de demostración regenerada, el 100 % de los centros tiene exactamente un
  representante activo, y el pronóstico y la evaluación se calculan para los mismos productos que
  antes del cambio.
- **SC-007**: Una persona que no participó en el desarrollo puede explicar en una frase la regla de
  un representante activo por centro y cómo se reemplaza a la persona responsable.

## Supuestos

- **No hay datos reales en operación.** Las únicas bases existentes contienen el histórico
  simulado. Por eso no se migran documentos del modelo anterior: la base se recrea y el histórico
  se regenera con el procedimiento de la guía de instalación. Cualquier dato cargado a mano en una
  base de demostración se pierde.
- **Los nombres de los centros de salud los provee Raymond** (pendiente). Si no indica otra
  cantidad, se usan cinco centros, igual que los cinco representantes actuales, para no cambiar el
  volumen de la simulación.
- Hay un solo rol (Encargado de almacén, D-10): cualquier persona con sesión puede generar un
  respaldo.
- La base de datos se ejecuta como indica la guía de instalación vigente.
- **Los filtros no cambian de criterio:** pedidos, distribuciones y sus reportes siguen filtrando por
  representante, ahora con su centro en la etiqueta (FR-011). Filtrar por centro de salud, reuniendo a
  sus representantes actuales y anteriores, queda fuera de esta funcionalidad (trabajo futuro).
- El código no forma parte del respaldo porque ya está en el repositorio; la configuración con
  secretos tampoco, porque quedaría en un archivo descargable.
- Esta funcionalidad llega después de la entrega del 21/09. Por eso se enmendó el principio XI de
  la constitución ("Alcance cerrado") a la versión 1.1.0 antes de planificarla (26/09, commit
  `ad235f9`), y las decisiones D-11 y D-18 quedaron registradas como revertidas, reemplazadas por
  D-21 y D-22, en `docs/especificacion/00-decisiones-y-alcance.md`.
