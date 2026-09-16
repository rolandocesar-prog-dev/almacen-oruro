# Especificación de funcionalidad: F-007 · Inteligencia artificial

**Rama de la funcionalidad**: `007-inteligencia-artificial` (sin rama propia; se trabaja en `main`)

**Creada**: 2026-09-13

**Estado**: Aprobada

**Entrada**: Descripción del usuario: "Módulo de inteligencia artificial con dos capas. Capa de
pronóstico: a partir del kardex, el sistema arma la serie mensual de consumo (salidas por
distribución menos sus anulaciones) de cada producto y pronostica el consumo del mes siguiente.
Muestra, para cada producto, el pronóstico, el stock actual, el stock mínimo y una cantidad
sugerida de reposición; y para un producto elegido, un gráfico con el consumo histórico y el
pronóstico. El sistema evalúa la calidad del pronóstico reservando los últimos 6 meses y comparando
el error del método contra dos métodos de referencia simples, y muestra esa comparación. Capa de
informes: el encargado elige un período y genera el 'Informe IA de compras' o el 'Informe IA de
distribuciones': el sistema calcula los datos agregados del período y un modelo de lenguaje redacta
en español un informe con hallazgos y recomendaciones basado solo en esos datos. El informe
muestra el texto junto a la tabla de datos que lo originó, se guarda con su fecha y se puede volver
a consultar e imprimir sin conexión. Como no existen datos históricos reales, el sistema incluye un
generador de 36 meses de histórico simulado, claramente identificado como simulado. Motivo: cubrir
los requerimientos 14 y 15 ('emitir informe con IA') con un componente de IA verificable y
conectado a la operación (qué comprar), en lugar de un texto decorativo."

**Referencias**: `docs/especificacion/03-funcionalidades.md` §F-007 (definición técnica, datos
simulados y criterios) · `docs/especificacion/02-modelo-de-dominio.md` §2.7 (`informe_ia`,
`configuracion`) y reglas RN-50 a RN-53 · Capítulo II: requerimientos 14 y 15; RF 6 · Decisiones
D-06 y D-07 · Supuestos S-05 y S-06 · Pendientes Q-01 y Q-02 · Constitución, principio VIII.

## Clarifications

### Session 2026-09-13

- Q: ¿Con qué datos se eligen los parámetros de suavizado del método principal antes de medir su
  error? → A: Solo con los meses de entrenamiento, minimizando el error de pronóstico a un mes
  dentro de ese período; los 6 meses de validación se usan únicamente para medir.
- Q: ¿El pronóstico y la reposición sugerida son para el mes en curso o para el mes siguiente? →
  A: Para el mes en curso, con la fórmula `máx(0, ⌈pronóstico del mes en curso + mínimo − stock
  actual⌉)`.
- Q: ¿Desde dónde se ejecuta el generador de histórico simulado? → A: Solo desde un comando de
  instalación documentado en la guía; no hay opción en el menú. Para regenerar, se recrea la base.
- Q: ¿El resaltado automático de cifras no encontradas en los datos es obligatorio? → A: No; es
  deseable (P3) y se implementa solo si alcanza el tiempo. La verificación que vale es la manual,
  con el texto junto a la tabla de datos.

## Escenarios de usuario y pruebas *(obligatorio)*

**Actores:**

- **Encargado de almacén** (F-001): consulta el pronóstico, la reposición sugerida y genera,
  consulta e imprime los informes IA.
- **Responsable del proyecto** (quien instala y prepara la demostración): genera el histórico
  simulado y revisa la evaluación del pronóstico. No es un rol del sistema: usa la misma cuenta del
  encargado y los procedimientos de instalación.

**Las dos capas y por qué están separadas** (constitución, principio VIII):

| Capa | Qué hace | Quién calcula | Necesita internet |
|---|---|---|---|
| Pronóstico | Serie de consumo, pronóstico, evaluación del error, reposición sugerida | El sistema, con un procedimiento determinista documentado paso a paso | No |
| Informes | Redacta hallazgos y recomendaciones a partir de datos ya calculados | El sistema calcula las cifras; el modelo de lenguaje **solo redacta** | Solo para generar un informe nuevo |

**Conceptos usados en esta especificación:**

- **Consumo mensual de un producto:** unidades que salieron por distribución en el mes, menos las
  que volvieron por anulación de distribuciones, según la fecha del documento (RN-53). Como una
  anulación lleva la fecha de la distribución que anula, ningún mes queda negativo. Los meses sin
  movimientos valen 0.
- **Serie de un producto:** su consumo mes a mes, desde el mes de su primer movimiento hasta el
  último mes completo (el mes anterior al actual).
- **Mes pronosticado:** el mes en curso, que es el primero sin datos completos.
- **Método principal:** suavizado exponencial de Holt-Winters aditivo con estacionalidad de 12
  meses; captura nivel, tendencia y la estacionalidad anual (más consumo en invierno, S-06).
- **Métodos de referencia:** (a) **ingenuo estacional**: el mismo mes del año anterior; (b)
  **promedio móvil de 3 meses**.
- **Métricas de error:** **MAE**, error absoluto medio en unidades; y **WAPE**, suma de errores
  absolutos dividida entre la suma de consumos reales, en porcentaje.
- **Reposición sugerida:** `máx(0, ⌈pronóstico del mes + stock mínimo − stock actual⌉)`.

### Historia 1 - Generar el histórico simulado (Prioridad: P1)

El responsable del proyecto prepara una base de demostración: el generador crea un catálogo
verosímil y 36 meses de compras, pedidos y distribuciones, con la estacionalidad y la tendencia
definidas, usando las mismas reglas del sistema. La base queda marcada como de demostración.

**Por qué esta prioridad**: sin histórico no hay serie, ni pronóstico, ni evaluación, ni informes
(D-07); y los datos de 2022 no se migran (D-13).

**Prueba independiente**: sobre una base sin documentos se ejecuta el generador dos veces con la
misma semilla (recreando la base entre ambas) y se comparan los resultados; se verifica la
consistencia del inventario y la leyenda.

**Escenarios de aceptación**:

1. **Dada** una base sin compras, pedidos ni distribuciones, **cuando** se ejecuta el generador,
   **entonces** crea 1 centro de salud, 5 representantes, unos 25 productos en unas 6 categorías con
   sus unidades, al menos 3 proveedores, y compras, pedidos y distribuciones de los 36 meses que
   terminan el mes anterior al actual (S-05).
2. **Dada** la misma base inicial y la misma semilla, **cuando** se ejecuta el generador,
   **entonces** produce exactamente los mismos datos: mismos documentos, cantidades, fechas y saldos.
3. **Dados** los datos generados, **cuando** se agrupa el consumo por mes, **entonces** junio, julio
   y agosto tienen en promedio más consumo que el resto del año, cada año tiene en promedio alrededor
   de 3 % más consumo que el anterior, y la variación aleatoria de cada mes no supera ±15 % (S-06).
4. **Dados** los datos generados, **cuando** se ejecuta la verificación de consistencia del
   inventario (F-003), **entonces** informa 0 diferencias y ningún producto tuvo stock negativo en
   ningún momento.
5. **Dados** los datos generados, **cuando** se revisan los documentos, **entonces** incluyen
   entregas parciales, pedidos en los cuatro estados y algunas anulaciones de compras y
   distribuciones, todos coherentes con las reglas de F-003 a F-005.
6. **Al** terminar el generador, **entonces** la base queda marcada como de demostración, con fecha
   de ejecución y semilla, y todas las pantallas y reportes muestran "Datos simulados con fines de
   demostración" (aclarado en F-006).
7. **Dada** una base que ya tiene compras, pedidos o distribuciones, **cuando** se intenta ejecutar
   el generador, **entonces** se rechaza sin cambiar nada, indicando que solo se ejecuta sobre una
   base sin documentos.
8. **Dados** los datos generados, **cuando** se consultan las existencias, **entonces** hay productos
   bajo mínimo y productos con stock holgado, para que la reposición sugerida muestre ambos casos.

---

### Historia 2 - Ver el pronóstico y la reposición sugerida (Prioridad: P1)

El encargado abre la pantalla de pronóstico y ve, para cada producto, cuánto se espera consumir en
el mes, su stock actual, su mínimo y cuánto conviene comprar, con la fórmula a la vista.

**Por qué esta prioridad**: es la IA conectada a la operación: responde "¿qué compro y cuánto?"
(D-06).

**Prueba independiente**: con el histórico simulado, se abre la pantalla dos veces y se comparan
los resultados; se verifica a mano la reposición de dos productos con la fórmula.

**Escenarios de aceptación**:

1. **Dado** el histórico, **cuando** se abre el pronóstico, **entonces** muestra por cada producto
   activo: código, producto, unidad, mes pronosticado, método usado, pronóstico, stock actual, stock
   mínimo y reposición sugerida; y la fórmula de reposición en la misma pantalla.
2. **Dados** los mismos datos, **cuando** se calcula el pronóstico dos veces, **entonces** da
   exactamente el mismo resultado.
3. **Dado** un producto con pronóstico 40, mínimo 10 y stock 35, **cuando** se calcula la
   reposición, **entonces** es `⌈40 + 10 − 35⌉ = 15`.
4. **Dado** un producto con stock actual mayor que pronóstico + mínimo, **cuando** se calcula la
   reposición, **entonces** es 0.
5. **Dado** un producto con al menos 24 meses de serie, **cuando** se pronostica, **entonces** se usa
   el método principal y la columna "Método" dice "Holt-Winters".
6. **Dado** un producto con menos de 24 meses de serie, **cuando** se pronostica, **entonces** se usa
   el promedio móvil de 3 meses (o el promedio de los meses disponibles si son menos de 3) y la
   pantalla lo indica.
7. **Dado** un producto sin ningún consumo registrado, **cuando** se pronostica, **entonces** el
   pronóstico es 0, se indica "Sin historial" y la reposición es `máx(0, mínimo − stock actual)`.
8. **Dado** el filtro "Solo con reposición mayor que 0" o por categoría, **cuando** se aplica,
   **entonces** la lista se reduce a esos productos, y el encabezado muestra el total de unidades
   sugeridas por producto.
9. **Sin** conexión a internet, **cuando** se abre el pronóstico, **entonces** funciona igual.

---

### Historia 3 - Evaluar la calidad del pronóstico (Prioridad: P1)

El responsable del proyecto muestra, con números, que el método principal pronostica mejor que dos
métodos simples: reserva los últimos 6 meses, pronostica esos meses con cada método usando solo los
datos anteriores y compara los errores.

**Por qué esta prioridad**: demuestra que el pronóstico funciona y alimenta el capítulo de
resultados del proyecto de grado (HU-007-3).

**Prueba independiente**: con una serie construida a mano con estacionalidad perfecta y sin ruido,
se ejecuta la evaluación y se comprueba qué método gana; con el histórico simulado se revisa la
tabla completa.

**Escenarios de aceptación**:

1. **Dado** un producto con al menos 30 meses de serie, **cuando** se evalúa, **entonces** los
   últimos 6 meses son de validación y los anteriores de entrenamiento; cada método pronostica los 6
   meses de validación usando **solo** los datos de entrenamiento.
2. **Dado** el método principal, **cuando** se ajusta, **entonces** sus parámetros de suavizado se
   eligen probando todas las combinaciones de valores 0,1; 0,2; … 0,9 y quedándose con la de menor
   error dentro del período de entrenamiento, sin mirar los meses de validación.
3. **Dada** la evaluación, **cuando** se muestra, **entonces** hay una tabla por producto con MAE y
   WAPE de los tres métodos, el mejor resaltado, y una fila de resultado general con el MAE promedio
   y el WAPE global de cada método.
4. **Dada** una serie de prueba construida a mano (estacionalidad perfecta, sin ruido), **cuando** se
   evalúa, **entonces** el método principal tiene menor error que el promedio móvil.
5. **Dado** un producto con menos de 30 meses de serie, **cuando** se evalúa, **entonces** figura como
   "No evaluable: se necesitan al menos 30 meses" y no entra en el resultado general.
6. **Dado** un producto cuyo consumo real en los 6 meses de validación suma 0, **cuando** se evalúa,
   **entonces** su WAPE figura como "No aplica" y su MAE se calcula normalmente.
7. **Dados** los mismos datos, **cuando** se evalúa dos veces, **entonces** da exactamente el mismo
   resultado.

---

### Historia 4 - Generar el Informe IA de compras (Prioridad: P2)

El encargado elige un período y pide el informe de compras. El sistema calcula los datos, el modelo
de lenguaje redacta el informe en español y el encargado lo ve junto a la tabla de datos.

**Por qué esta prioridad**: cubre literalmente el requerimiento 14; es P2 porque el pronóstico, que
es P1, no depende de él (00 §5).

**Prueba independiente**: con el histórico simulado y conexión, se genera el informe de un mes y se
verifica cada cifra del texto contra la tabla de datos.

**Escenarios de aceptación**:

1. **Dado** un período, **cuando** se genera el informe de compras, **entonces** el sistema calcula
   y muestra la tabla de datos: total gastado y número de compras del período y del período anterior
   de igual duración, con su variación porcentual; gasto por proveedor; los 10 productos con más
   gasto; productos bajo mínimo; y reposición sugerida.
2. **Dados** esos datos, **cuando** el modelo responde, **entonces** el texto está en español y tiene
   las secciones fijas *Resumen*, *Hallazgos*, *Alertas* y *Recomendaciones*.
3. **Dado** el informe generado, **cuando** se muestra, **entonces** el texto aparece junto a la tabla
   de datos que se envió, con el modelo usado, la fecha y hora de generación y el usuario.
4. **Dado** el texto de un informe, **cuando** se compara a mano con la tabla, **entonces** toda cifra
   del texto existe en la tabla de datos. Si está implementado el resaltado automático (P3,
   FR-025), los números del texto que no están en la tabla aparecen con la advertencia "Cifra no
   encontrada en los datos".
5. **Dado** el informe, **cuando** termina de generarse, **entonces** queda guardado con tipo,
   período, datos de entrada, texto, modelo, fecha y usuario.
6. **Dado** un período sin compras vigentes, **cuando** se intenta generar, **entonces** no se llama
   al modelo y se indica que no hay datos suficientes para ese período.

---

### Historia 5 - Generar el Informe IA de distribuciones (Prioridad: P2)

Igual que la Historia 4, pero sobre lo entregado a los representantes.

**Por qué esta prioridad**: cubre literalmente el requerimiento 15.

**Prueba independiente**: igual que la Historia 4, con distribuciones.

**Escenarios de aceptación**:

1. **Dado** un período, **cuando** se genera el informe de distribuciones, **entonces** la tabla de
   datos incluye: cantidad entregada por representante y servicio; los 10 productos más
   distribuidos; pedidos por estado; comparación de unidades entregadas con el período anterior de
   igual duración, con su variación porcentual; y el pronóstico del mes de los 10 productos
   principales.
2. **Dado** el informe, **cuando** se genera, **entonces** cumple los escenarios 2 a 6 de la
   Historia 4, aplicados a distribuciones.

---

### Historia 6 - Consultar e imprimir informes ya generados (Prioridad: P2)

El encargado vuelve a abrir un informe generado antes, aunque no haya internet, y lo imprime.

**Por qué esta prioridad**: en la defensa puede no haber conexión; los informes tienen que poder
mostrarse igual (principio VIII).

**Prueba independiente**: se generan dos informes, se desconecta internet y se abren e imprimen.

**Escenarios de aceptación**:

1. **Dados** informes guardados, **cuando** se abre el historial, **entonces** se listan del más
   reciente al más antiguo con tipo, período, fecha de generación, modelo y usuario, filtrables por
   tipo.
2. **Sin** conexión a internet, **cuando** se abre un informe guardado, **entonces** se muestran el
   texto y la tabla de datos tal como se generaron.
3. **Dado** un informe, **cuando** se imprime, **entonces** la vista de impresión muestra el
   encabezado común de reportes (F-006), el texto, la tabla de datos, el modelo usado, la fecha de
   generación, la nota "Texto redactado por un modelo de lenguaje a partir de los datos de la tabla"
   y, si corresponde, la leyenda de datos simulados.
4. **Dado** el mismo tipo y período, **cuando** se genera otro informe, **entonces** se guarda como
   uno nuevo; los anteriores no se modifican ni se borran.
5. **Sin** conexión a internet o con el servicio del modelo caído, **cuando** se intenta generar un
   informe nuevo, **entonces** se muestra "No se pudo generar el informe: sin conexión con el
   servicio de redacción. Puedes consultar los informes ya generados" con acceso al historial, y no
   se guarda nada.

---

### Historia 7 - Ver el gráfico de consumo y pronóstico de un producto (Prioridad: P3)

El encargado elige un producto y ve su consumo mes a mes y el pronóstico del mes en curso.

**Por qué esta prioridad**: ayuda a explicar el pronóstico, pero la tabla ya da la información
(00 §5).

**Prueba independiente**: con el histórico simulado, se abre el gráfico de un producto y se
comparan algunos meses con el kardex.

**Escenarios de aceptación**:

1. **Dado** un producto, **cuando** se abre su gráfico, **entonces** muestra el consumo real de cada
   mes de su serie y el pronóstico del mes en curso diferenciado del consumo real, con los meses en
   el eje horizontal y las unidades en el vertical.
2. **Dado** un producto evaluable, **cuando** se abre su gráfico, **entonces** también muestra los
   pronósticos del método principal para los 6 meses de validación junto al consumo real de esos
   meses.
3. **Dado** un mes del gráfico, **cuando** se consulta su valor, **entonces** coincide con el consumo
   calculado a partir del kardex de ese mes.

---

### Casos borde

- **Pronóstico negativo:** si el método da un valor negativo, se muestra 0.
- **Pronóstico con decimales:** se muestra con un decimal; la reposición siempre se redondea hacia
  arriba a un entero.
- **Productos inactivos:** no aparecen en el pronóstico ni en la reposición; sus datos sí cuentan en
  los informes de períodos en que estuvieron activos.
- **Producto creado hace poco:** su serie empieza en su primer movimiento, sin meses anteriores en 0
  que lo distorsionen.
- **Mes en curso:** no forma parte de la serie aunque ya tenga distribuciones, porque está incompleto.
- **Documento registrado con fecha pasada:** cambia el consumo de su mes y, por lo tanto, el
  pronóstico siguiente; el pronóstico no se guarda, siempre se recalcula con los datos vigentes.
- **Respuesta del modelo sin las cuatro secciones o vacía:** el informe no se guarda y se muestra un
  error indicando que la respuesta no tuvo el formato esperado, con opción de reintentar.
- **Demora del servicio del modelo:** si no responde en 60 segundos, se cancela y se informa como
  error; no se guarda nada.
- **Datos personales:** los datos enviados al modelo no incluyen contraseñas, teléfonos, direcciones,
  correos ni CI; sí pueden incluir nombres de representantes, servicios, proveedores y productos.
- **Generador interrumpido a mitad:** la base no queda marcada como de demostración y el generador
  informa que hay que recrear la base antes de reintentar.
- **Informes de una base de demostración:** llevan la leyenda de datos simulados también en su vista
  guardada e impresa.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Serie y pronóstico**

- **FR-001**: El sistema DEBE calcular la serie de consumo mensual de cada producto a partir del
  kardex: menos la suma de las cantidades de los movimientos de salida por distribución y de
  anulación de distribución cuya fecha del documento cae en el mes; desde el mes del primer
  movimiento del producto hasta el mes anterior al actual; con 0 en los meses sin movimientos
  (RN-53).
- **FR-002**: El sistema DEBE pronosticar el consumo del mes en curso de cada producto activo con el
  método principal (Holt-Winters aditivo, estacionalidad de 12 meses) si la serie tiene al menos 24
  meses; con promedio móvil de 3 meses si tiene menos (o el promedio de los meses disponibles si son
  menos de 3); y 0 con la indicación "Sin historial" si no tiene consumo. Los valores negativos se
  muestran como 0.
- **FR-003**: El método principal DEBE elegir sus tres parámetros de suavizado entre los valores 0,1
  a 0,9 (de 0,1 en 0,1), probando las 729 combinaciones y quedándose con la de menor error absoluto
  medio de pronóstico a un mes dentro de los datos que usa para ajustarse: en la evaluación, solo
  los meses de entrenamiento; para el pronóstico del mes en curso, la serie completa. Ante un
  empate, gana la combinación con valores más bajos, para que el resultado sea determinista.
- **FR-004**: El pronóstico y la evaluación DEBEN ser deterministas: con los mismos datos, dan
  exactamente el mismo resultado. No se guardan; se calculan al consultarlos.
- **FR-005**: El sistema DEBE calcular la reposición sugerida como
  `máx(0, ⌈pronóstico + stock mínimo − stock actual⌉)` y mostrar la fórmula en pantalla.
- **FR-006**: La pantalla de pronóstico DEBE mostrar, por producto activo: código, producto, unidad,
  mes pronosticado, método usado, pronóstico, stock actual, stock mínimo y reposición sugerida; con
  filtros por categoría y "Solo con reposición mayor que 0".
- **FR-007**: El pronóstico, la reposición y la evaluación NO DEBEN depender de ningún servicio
  externo ni de conexión a internet.

**Evaluación**

- **FR-008**: El sistema DEBE evaluar cada producto con al menos 30 meses de serie reservando los
  últimos 6 como validación; cada uno de los tres métodos (principal, ingenuo estacional, promedio
  móvil de 3 meses) DEBE pronosticar esos 6 meses usando solo los meses anteriores. Los productos
  con menos de 30 meses figuran como "No evaluable".
- **FR-009**: El sistema DEBE calcular por producto y método el MAE y el WAPE (este último "No
  aplica" si el consumo real de validación suma 0), resaltar el mejor método por producto, y mostrar
  un resultado general con el MAE promedio y el WAPE global de cada método, resaltando el mejor.

**Informes IA**

- **FR-010**: El sistema DEBE permitir generar el "Informe IA de compras" y el "Informe IA de
  distribuciones" de un período elegido (fechas desde y hasta; por defecto, el mes anterior
  completo), usando solo documentos vigentes y agrupando por fecha del documento (RN-53).
- **FR-011**: Antes de llamar al modelo, el sistema DEBE calcular los datos de entrada del informe:
  - Compras: total gastado y número de compras del período y del período anterior de igual
    duración, con variación porcentual; gasto por proveedor; los 10 productos con más gasto;
    productos bajo mínimo; reposición sugerida.
  - Distribuciones: unidades entregadas por representante y servicio; los 10 productos más
    distribuidos; pedidos por estado; unidades entregadas del período y del anterior de igual
    duración, con variación porcentual; pronóstico del mes de los 10 productos principales.
- **FR-012**: El sistema DEBE enviar al modelo solo esos datos agregados, con la instrucción de
  redactar en español, no inventar cifras, usar solo los datos entregados y responder con las
  secciones *Resumen*, *Hallazgos*, *Alertas* y *Recomendaciones*. Las cuatro secciones DEBEN
  venir siempre, pero *Hallazgos*, *Alertas* y *Recomendaciones* PUEDEN venir vacías cuando los
  datos no dan lugar a nada que decir: la pantalla muestra "Sin alertas en el período" antes que
  obligar al modelo a inventar una. NO DEBE enviar contraseñas, teléfonos, direcciones, correos
  ni CI.
- **FR-013**: El sistema DEBE mostrar el texto del informe junto a la tabla de datos que lo originó,
  el modelo usado, la fecha y hora de generación y el usuario.
- **FR-014**: El sistema DEBE guardar cada informe generado con tipo, período, datos de entrada,
  texto, modelo, fecha y usuario; cada generación crea un informe nuevo y los guardados no se
  modifican ni se borran.
- **FR-015**: Si el período no tiene documentos vigentes, si no hay conexión, si el servicio falla,
  si no responde en 60 segundos o si la respuesta no tiene las cuatro secciones, el sistema NO DEBE
  guardar el informe y DEBE mostrar el motivo en español y el acceso a los informes guardados.
- **FR-016**: El sistema DEBE listar los informes guardados (filtrables por tipo) y mostrarlos e
  imprimirlos sin conexión a internet, con el formato de impresión de F-006, la nota de que el texto
  fue redactado por un modelo de lenguaje y, si corresponde, la leyenda de datos simulados.

**Resaltado de cifras (P3)**

- **FR-025**: Si alcanza el tiempo, el sistema DEBERÍA resaltar en el texto de un informe los números
  que no se encuentran en su tabla de datos, sin considerar años, fechas ni la numeración de listas.

**Gráfico (P3)**

- **FR-017**: El sistema DEBE mostrar, para un producto elegido, un gráfico con su consumo mensual
  real y el pronóstico del mes en curso, diferenciados; y, si es evaluable, los pronósticos del
  método principal para los 6 meses de validación.

**Generador de histórico simulado**

- **FR-018**: El sistema DEBE incluir un generador que, sobre una base sin compras, pedidos ni
  distribuciones, cree: 1 centro de salud, 5 representantes, unos 25 productos en unas 6 categorías
  con sus unidades de medida, al menos 3 proveedores, y compras, pedidos y distribuciones de los 36
  meses que terminan el mes anterior al actual (S-05).
- **FR-019**: El consumo generado DEBE partir de un consumo base por producto, aplicarle un factor
  estacional mensual (mayor en junio, julio y agosto), una tendencia de +3 % anual y una variación
  aleatoria de ±15 % obtenida con una semilla fija, de modo que la misma semilla sobre la misma base
  produzca exactamente los mismos datos (S-06).
- **FR-020**: El generador DEBE registrar los documentos en orden cronológico, aplicando las mismas
  reglas de F-003, F-004 y F-005 (sin atajos que las eviten), incluyendo entregas parciales, pedidos
  en los cuatro estados y algunas anulaciones; y terminar con productos bajo mínimo y con stock
  holgado.
- **FR-021**: Al terminar con éxito, el generador DEBE marcar la base como de demostración, con fecha
  de ejecución y semilla; desde entonces todas las pantallas y reportes muestran "Datos simulados
  con fines de demostración" (D-07).
- **FR-022**: El generador DEBE rechazar su ejecución sobre una base con documentos, sin cambiar
  nada.
- **FR-024**: El generador DEBE ejecutarse solo como un paso de instalación documentado en la guía de
  instalación, que admite indicar la semilla (con un valor por defecto fijo); el sistema NO DEBE
  ofrecerlo en ningún menú ni pantalla. Para volver a generar, se recrea la base.

**Generales**

- **FR-023**: Todos los textos de pantalla y mensajes DEBEN estar en español; el procedimiento de
  cálculo del pronóstico, la evaluación y la reposición DEBE estar documentado paso a paso, en un
  documento propio para el lector (`docs/metodo-pronostico.md`) enlazado desde las pantallas, para
  poder explicarse sin leer el código (principio VIII).

### Entidades clave

- **Informe IA**: informe redactado y guardado. Tipo (COMPRAS o DISTRIBUCIONES), período (desde,
  hasta), datos de entrada exactos enviados al modelo, texto devuelto, modelo usado, fecha de
  generación y usuario.
- **Configuración** (de F-006): marca de base de demostración, fecha de ejecución del generador y
  semilla usada.
- **Pronóstico, evaluación y reposición**: resultados calculados al consultarlos a partir del kardex
  (F-003) y de los productos (F-002); no se guardan.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Con la misma base inicial y la misma semilla, el generador produce datos idénticos en
  el 100 % de las ejecuciones.
- **SC-002**: Con los mismos datos, el pronóstico, la reposición y la evaluación dan el mismo
  resultado en el 100 % de las ejecuciones.
- **SC-003**: Para la serie de prueba construida a mano (estacionalidad perfecta, sin ruido), el
  método principal tiene menor error que el promedio móvil de 3 meses.
- **SC-004**: Tras generar el histórico simulado, la verificación de consistencia del inventario
  informa 0 diferencias.
- **SC-005**: La pantalla de pronóstico de todos los productos del catálogo simulado, con la
  evaluación completa, se muestra en menos de 10 segundos.
- **SC-006**: Un informe IA se genera en menos de 60 segundos con conexión normal.
- **SC-007**: En la demostración, el 100 % de las cifras del texto de un informe IA existe en su
  tabla de datos de entrada (verificación manual).
- **SC-008**: Sin conexión a internet, el 100 % de las funciones de pronóstico, reposición y
  evaluación funcionan, y el 100 % de los informes guardados se pueden abrir e imprimir.
- **SC-009**: En el 100 % de las pantallas y reportes de una base de demostración aparece la leyenda
  "Datos simulados con fines de demostración".
- **SC-010**: Una persona que no participó en el desarrollo puede explicar, con la pantalla de
  pronóstico y la de evaluación a la vista, de dónde sale la cantidad sugerida de un producto y por
  qué se confía en el método.

## Supuestos

- **Mes pronosticado:** el mes en curso es el primero sin datos completos; la reposición sugerida
  responde "¿cuánto comprar para este mes?". Pronosticar el mes siguiente queda como trabajo futuro.
- **Mínimos de datos:** 24 meses para el método principal (dos ciclos anuales completos) y 30 para
  evaluar (24 de entrenamiento más 6 de validación).
- **Ejecución del generador (FR-024):** la guía de instalación deja la base de demostración lista en
  un solo procedimiento: crear la base, cargar el usuario inicial y generar el histórico.
- **Usuario de los datos simulados:** los documentos generados quedan registrados a nombre del
  usuario inicial.
- **Modelo de lenguaje:** se accede a un servicio externo con una clave que vive en la configuración
  del servidor; qué servicio y qué modelo concreto se decide en el plan. La cuenta y quién la paga
  están pendientes (Q-02); mientras tanto se desarrolla con la clave de la asesoría.
- **Objetivos del proyecto:** se asume que D-06 cumple los objetivos del Capítulo I (pendiente Q-01).
- **Volumen:** unos 25 productos × 36 meses; decenas de informes guardados.
- **Fuera de alcance:** modelos de aprendizaje profundo, pronóstico por representante,
  reentrenamiento programado, chat conversacional con los datos, pronóstico de precios, envío de
  informes por correo, edición del texto de un informe.
- **Dependencias:** requiere F-001 a F-005 (el generador usa sus reglas y el pronóstico, su kardex) y
  F-006 (formato de impresión y leyenda). Es la última funcionalidad del orden de implementación.
