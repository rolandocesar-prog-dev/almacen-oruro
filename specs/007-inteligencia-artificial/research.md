# Investigación técnica · F-007 Inteligencia artificial

**Fecha**: 2026-09-15 · **Plan**: [plan.md](plan.md)

F-007 se apoya en todo lo anterior: el kardex de F-003 (serie de consumo), los catálogos de F-002, los
documentos de F-003 a F-005 (el generador los crea con sus servicios reales) y el encabezado, la vista de
impresión y la marca de demostración de F-006. Aquí solo se registran las decisiones **nuevas**, con el
formato **Decisión / Fundamento / Alternativas descartadas**. El prefijo es **A** (análisis con IA).

La constitución (principio VIII) separa las dos capas y esa separación ordena todas las decisiones: **el
sistema calcula, el modelo de lenguaje solo redacta**.

---

## A-01 · Serie de consumo mensual

**Decisión**: `serieDeConsumo(productoId)` en `src/servicios/ia/serie.ts` lee los movimientos
`SALIDA_DISTRIBUCION` y `ANULACION_DISTRIBUCION` del producto (`fechaDocumento`, `cantidad`) con un
`findMany`, los agrupa por mes en TypeScript y devuelve
`{ mes: "AAAA-MM", consumo }[]`, con `consumo = −Σ cantidad` del mes (las salidas son negativas y las
anulaciones positivas, así que la resta deja unidades consumidas). La serie va desde el mes del primer
movimiento del producto hasta el **mes anterior al actual**, con 0 en los meses sin movimientos (FR-001).

**Fundamento**: son unos 25 productos con cientos de movimientos cada uno; agrupar en memoria se explica
en tres líneas y evita SQL crudo, que en este proyecto está reservado al `SELECT … FOR UPDATE` (K-01,
principio II). Que la anulación lleve la fecha de la distribución anulada (RN-53) es lo que garantiza que
ningún mes quede negativo.

**Alternativas descartadas**: `date_trunc` con `$queryRaw` (más rápido, pero agrega SQL crudo por un
volumen que no lo justifica); guardar la serie en una tabla (sería una segunda fuente de verdad que
habría que mantener al anular un documento).

---

## A-02 · Holt-Winters aditivo escrito en el proyecto

**Decisión**: `src/servicios/ia/holt-winters.ts` implementa el método principal como funciones puras, sin
dependencias:

1. **Inicialización determinista**: nivel = promedio del primer año; tendencia = (promedio del segundo año
   − promedio del primero) / 12; índices estacionales = promedio, por mes calendario, de
   `valor − promedio de su año`.
2. **Recursión aditiva** con α (nivel), β (tendencia) y γ (estacionalidad).
3. **Ajuste de parámetros (FR-003)**: búsqueda en rejilla de las 9 × 9 × 9 = 729 combinaciones de
   {0,1 … 0,9}, quedándose con la de menor MAE de pronóstico a un mes **dentro de los datos de ajuste**;
   ante un empate gana la combinación de valores más bajos, en orden α, β, γ.
4. **Pronóstico** a uno o varios meses; un valor negativo se muestra como 0 y con un decimal.

**Fundamento**: el método tiene unas 60 líneas y se puede explicar paso a paso frente al tribunal
(principio I y VIII, FR-023); una librería de series de tiempo sería una caja negra y una dependencia más.
La inicialización y el desempate fijos son lo que hace el resultado reproducible (FR-004, SC-002).

**Alternativas descartadas**: librerías de pronóstico de npm (caja negra, dependencia nueva);
optimización numérica de los parámetros (no determinista y más difícil de explicar que 729 pruebas).

---

## A-03 · Qué método se usa para cada producto

**Decisión**: `pronosticarProducto(serie)` elige por longitud de la serie (FR-002):

| Serie | Método | Etiqueta en pantalla |
|---|---|---|
| ≥ 24 meses | Holt-Winters aditivo | "Holt-Winters" |
| 3 a 23 meses | promedio móvil de 3 meses | "Promedio móvil (3 meses)" |
| 1 o 2 meses | promedio de los meses disponibles | "Promedio de los meses disponibles" |
| sin consumo | 0 | "Sin historial" |

Los métodos de referencia de la evaluación son **ingenuo estacional** (mismo mes del año anterior) y
**promedio móvil de 3 meses**.

**Fundamento**: Holt-Winters con estacionalidad de 12 meses necesita dos ciclos completos para estimar los
índices; por debajo de eso, un promedio móvil es más honesto que un método mal ajustado.

---

## A-04 · Evaluación con validación reservada

**Decisión**: `evaluarProducto(serie)` exige al menos 30 meses (24 de ajuste + 6 de validación, FR-008).
Separa los últimos 6 meses, **ajusta cada método solo con los meses anteriores** —incluida la búsqueda en
rejilla de Holt-Winters, que nunca mira la validación (aclaración del 13/09)— y pronostica los 6 meses de
validación a horizontes 1 a 6. Calcula MAE y WAPE por método (`WAPE = Σ|error| / Σ real`; "No aplica" si el
real suma 0) y marca el mejor por MAE. El resultado general promedia el MAE y calcula el WAPE global
(suma de errores sobre suma de reales) de cada método sobre los productos evaluables.

**Fundamento**: es la comparación que sostiene el capítulo de resultados del proyecto; elegir los
parámetros con los datos de validación inflaría el resultado a favor del método principal.

---

## A-05 · Reposición sugerida

**Decisión**: `reposicionSugerida(pronostico, stockMinimo, stockActual) = máx(0, ⌈pronóstico + mínimo −
stock⌉)`, función pura, y la fórmula se muestra en la pantalla de pronóstico (FR-005, FR-006). Solo se
calcula para productos activos.

**Fundamento**: es la respuesta operativa del módulo ("¿qué compro y cuánto?") y, con la fórmula a la
vista, cualquiera puede rehacer la cuenta con los tres números de la fila (SC-010).

---

## A-06 · Todo se calcula al consultar, nada se guarda

**Decisión**: pronóstico, evaluación y reposición se calculan en cada consulta a partir del kardex y de los
productos; no hay tablas ni columnas nuevas (FR-004). Dentro de una misma petición, la serie de cada
producto se lee una sola vez y se reutiliza. **El ajuste de Holt-Winters no se comparte** entre el
pronóstico y la evaluación: el del pronóstico se calcula con toda la serie y el de la evaluación **solo con
los meses de ajuste** (A-04, aclaración del 13/09). Compartirlo dejaría que los parámetros hubieran visto
los meses de validación y la evaluación perdería sentido.

**Fundamento**: si un documento se registra con fecha pasada, el pronóstico siguiente ya lo refleja sin
recalcular nada a mano (caso borde de la especificación). El costo es bajo: 25 productos × 729
combinaciones × ~36 meses son unos cientos de miles de operaciones aritméticas, muy por debajo de los 10 s
de SC-005; la pantalla de evaluación se mide en el recorrido.

**Alternativas descartadas**: guardar el pronóstico del mes (habría que invalidarlo con cada documento
retroactivo, anulación o cambio de stock).

---

## A-07 · Generador de histórico simulado

**Decisión**: un script `scripts/generar-historico.mts`, ejecutado con
`npm run datos:simulados -- --semilla 20260915` (FR-024), que:

1. **Rechaza** la ejecución si ya hay compras, pedidos o distribuciones (FR-022).
2. Crea catálogo verosímil: 1 centro de salud, 5 representantes, ~25 productos en 6 categorías con sus
   unidades y 3 proveedores.
3. Recorre los **36 meses** que terminan el mes anterior al actual, en orden cronológico, y en cada mes:
   compra lo necesario para sostener el consumo (con algo de holgura), registra los pedidos de los
   representantes, los atiende con distribuciones —algunas parciales— y, de vez en cuando, anula una
   compra o una distribución. Todo con `registrarCompra`, `registrarPedido`, `registrarDistribucion`,
   `anularCompra`, `anularDistribucion` y `anularPedido`: **sin atajos** que salteen las reglas (FR-020).
4. El consumo objetivo de cada producto y mes sale de `base × estacional(mes) × (1,03)^años × ruido(±15 %)`
   (FR-019), con el ruido de un generador pseudoaleatorio propio (`mulberry32`, ~5 líneas) sembrado con la
   semilla: misma semilla y misma base vacía ⇒ mismos datos (SC-001).
5. Al terminar, marca la base como de demostración con fecha y semilla (FR-021).

**Fundamento**: usar los servicios reales es lo que garantiza que el kardex cuadre (SC-004) y que los
pedidos y distribuciones sean coherentes; un generador que insertara filas directamente podría producir un
histórico imposible. Que sea un comando de instalación y no una pantalla evita que alguien lo ejecute por
curiosidad sobre datos reales.

**Alternativas descartadas**: `INSERT` masivo (rompería el principio III); ejecutarlo desde el menú
(descartado en la aclaración del 13/09); `Math.random()` (no reproducible).

---

## A-08 · Redacción con Claude a través de un puerto

**Decisión**: `src/servicios/ia/redactor.ts` define el puerto
`type Redactor = (peticion: { tipo, datos }) => Promise<SeccionesInforme>` y su implementación con el SDK
oficial de Anthropic (`@anthropic-ai/sdk`, **única dependencia nueva**):

- modelo **`claude-opus-5`**, guardado en cada informe (`informe_ia.modelo`);
- **salida estructurada** con Zod (`client.messages.parse` + `zodOutputFormat`), con el esquema
  `{ resumen: string, hallazgos: string[], alertas: string[], recomendaciones: string[] }`: así las cuatro
  secciones vienen garantizadas por el formato y, además, se validan (FR-012, FR-015). Los tres arreglos
  **pueden venir vacíos**: exigir al menos un elemento obligaría al modelo a inventar una alerta donde no
  la hay, justo lo contrario de FR-012; la pantalla resuelve el caso con "Sin alertas en el período";
- `max_tokens: 8000`, `output_config.effort: "medium"` (redactar no es una tarea de razonamiento profundo
  y conviene no acercarse al límite de 60 s) y `timeout: 60_000` ms por petición (FR-015). `max_tokens` sube
  de 4000 a 8000 en la implementación porque Claude Opus 5 piensa por defecto y ese pensamiento cuenta dentro
  del límite: con 4000 una respuesta larga podría cortarse y quedar sin formato;
- `maxRetries: 0`: el SDK reintenta por defecto hasta dos veces, **también las demoras**, así que una petición
  podría esperar tres veces 60 s. Sin reintentos, el límite de SC-006 se cumple y el usuario decide si vuelve
  a intentar;
- instrucciones del sistema en español: no inventar cifras, usar solo los datos entregados, tono de informe
  para la administración del centro de salud;
- la clave vive en `ANTHROPIC_API_KEY` (variable de entorno, nunca versionada, principio VII);
- los errores del SDK se traducen **de lo más específico a lo más general**:
  `APIConnectionTimeoutError` → `demora`, después `APIConnectionError` → `sin-conexion`, después el resto
  → `sin-conexion`. El orden importa porque el error de demora **extiende** al de conexión: al revés, una
  demora se informaría como "sin conexión".

El servicio de informes recibe el redactor como parámetro, con el de Anthropic por defecto.

**Fundamento**: el puerto es lo que hace **probable** toda la funcionalidad sin red ni clave: las pruebas
pasan un redactor falso (respuesta válida, respuesta incompleta, error, demora). Además deja la puerta
abierta si Q-02 termina con otra cuenta o proveedor. La salida estructurada evita el análisis frágil del
texto para verificar las cuatro secciones.

**Alternativas descartadas**: llamar al servicio con `fetch` a mano (el SDK oficial es el camino
documentado y trae reintentos y errores tipados); pedir texto libre y buscar los títulos con expresiones
regulares (frágil); dejar el modelo elegido en una variable de entorno (el informe debe guardar qué modelo
lo redactó, y un modelo fijo se explica mejor).

---

## A-09 · Datos de entrada de cada informe

**Decisión**: `datosInformeCompras(periodo)` y `datosInformeDistribuciones(periodo)` arman un objeto
**explícito** con los agregados de FR-011, reutilizando lo que ya existe: `reporteCompras`,
`reporteDistribuciones`, `reporteExistencias` y `reportePedidos` de F-006 y el pronóstico de A-03. Ese
objeto es lo que se envía al modelo, lo que se guarda en `informe_ia.datosEntrada` y lo que se muestra en
la tabla junto al texto (FR-013, FR-014).

**Fundamento**: un solo objeto para las tres cosas es lo que permite verificar cifra por cifra (SC-007);
si lo mostrado y lo enviado pudieran diferir, la verificación no probaría nada.

---

## A-10 · Qué no se le envía al modelo

**Decisión**: el objeto de datos se construye campo por campo y solo contiene nombres de productos,
proveedores, representantes y servicios, cantidades, montos y fechas. **Nunca** se serializa una entidad
completa de Prisma, para que no puedan colarse teléfonos, direcciones, correos, CI ni contraseñas (FR-012).
Una prueba recorre el objeto generado y falla si aparece alguna de esas claves.

**Fundamento**: el principio VIII lo exige y una prueba automática lo demuestra, en lugar de confiar en la
revisión manual.

---

## A-11 · Informes guardados, consulta e impresión

**Decisión**: cada generación crea una fila nueva en `informe_ia` (tipo, período, datos de entrada, texto,
modelo, usuario, fecha); no se edita ni se borra ninguna (FR-014). El listado `/ia/informes` filtra por
tipo; la ficha `/ia/informes/[id]` muestra texto y tabla; la impresión
`/ia/informes/[id]/imprimir` vive en el grupo `(impresion)` de F-005 y usa `EncabezadoReporte` de F-006,
con la nota "Texto redactado por un modelo de lenguaje a partir de los datos de la tabla" y la leyenda de
datos simulados si corresponde (FR-016). Todo eso funciona **sin conexión**: solo lee la base (SC-008).

**Fundamento**: en la defensa puede no haber internet; lo único que necesita red es generar un informe
nuevo.

---

## A-12 · Gráfico sin dependencias (P3)

**Decisión**: `/ia/pronostico/[productoId]` dibuja un **SVG en el servidor**: barras del consumo mensual,
los pronósticos del método principal para los 6 meses de validación y el pronóstico del mes en curso, con
otro color y su leyenda (FR-017). Sin librería de gráficos.

**Fundamento**: son unos 36 valores; un SVG de barras son ~30 líneas de JSX que se explican y se imprimen
bien. Es P3: si el plazo aprieta, es lo primero que se corta.

**Alternativas descartadas**: Chart.js o Recharts (dependencia nueva y componente de cliente para un
gráfico estático).

---

## A-13 · Rutas y navegación

**Decisión**: rutas reservadas en F-001 (`/ia/pronostico`, `/ia/evaluacion`, `/ia/informes`,
`/ia/informes/nuevo`, `/ia/informes/[id]`) más `/ia` (índice), `/ia/pronostico/[productoId]` (gráfico) y
`/ia/informes/[id]/imprimir`. El menú suma **IA** después de Reportes; el inicio, su acceso.

---

## A-14 · Pruebas

**Decisión**:

- **Unitarias (sin base de datos)**: Holt-Winters sobre una serie construida a mano con estacionalidad
  perfecta y sin ruido (el método principal debe tener menor error que el promedio móvil, SC-003);
  determinismo del ajuste y del desempate; promedio móvil e ingenuo estacional; MAE y WAPE, incluido el
  "No aplica"; elección de método por longitud de serie; reposición sugerida (incluidos los casos 15 y 0
  de la especificación); el generador pseudoaleatorio con la misma semilla.
- **Integración**: serie de consumo a partir de distribuciones y anulaciones reales (un mes con anulación
  vuelve a 0); pronóstico y evaluación reproducibles; el generador con una configuración reducida
  (3 productos, 6 meses) que verifica reproducibilidad, consistencia del inventario (SC-004), rechazo
  sobre una base con documentos y marca de demostración; datos de informe con las cifras esperadas y sin
  claves prohibidas (A-10); generación de informes con un **redactor falso** (éxito, respuesta incompleta,
  error del servicio, período sin documentos) y su guardado; listado y ficha.
- **Ninguna prueba llama al servicio del modelo** ni necesita `ANTHROPIC_API_KEY`.

**Fundamento**: principio IX. Lo que puede romper este módulo es el cálculo (determinismo y errores) y el
manejo de fallas del servicio externo; ahí van las pruebas.

---

No quedan marcas **NEEDS CLARIFICATION**. Pendientes externos: **Q-02** (cuenta y clave del modelo; hasta
entonces se usa la clave de la asesoría en `.env`) y **Q-01** (objetivos del Capítulo I), que no bloquean
la implementación.
