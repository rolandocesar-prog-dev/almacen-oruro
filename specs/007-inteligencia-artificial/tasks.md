---
description: "Lista de tareas de implementación de F-007 · Inteligencia artificial"
---

# Tareas: F-007 · Inteligencia artificial

**Entrada**: documentos de diseño de `specs/007-inteligencia-artificial/`

**Prerrequisitos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/acciones-f007.md](contracts/acciones-f007.md),
[quickstart.md](quickstart.md). F-001 a F-006 implementadas (`registrarCompra`, `registrarPedido`,
`registrarDistribucion`, las anulaciones, `verificarConsistenciaInventario`, `listarExistencias`, los
reportes de F-006, `EncabezadoReporte`, el grupo `(impresion)`, `obtenerConfiguracion` y la banda de datos
simulados).

**Pruebas**: se incluyen (constitución, principio IX; [quickstart §2](quickstart.md#2-pruebas-automatizadas)).
Las de integración usan PostgreSQL real: **Docker Desktop debe estar abierto**. **Ninguna prueba llama al
servicio del modelo ni necesita `ANTHROPIC_API_KEY`** (research A-08, A-14).

**Sin migraciones** (las tablas `informe_ia` y `configuracion` ya existen). **Una dependencia nueva**:
`@anthropic-ai/sdk`, con versión exacta (T-01).

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[US#]**: historia de usuario de [spec.md](spec.md)

| Etiqueta | Historia de spec.md | Prioridad |
|---|---|---|
| US1 | Historia 1 · Generar el histórico simulado | P1 |
| US2 | Historia 2 · Ver el pronóstico y la reposición sugerida | P1 |
| US3 | Historia 3 · Evaluar la calidad del pronóstico | P1 |
| US4 | Historia 4 · Generar el Informe IA de compras | P2 |
| US5 | Historia 5 · Generar el Informe IA de distribuciones | P2 |
| US6 | Historia 6 · Consultar e imprimir informes ya generados | P2 |
| US7 | Historia 7 · Ver el gráfico de consumo y pronóstico | P3 |

**Patrón**: el de F-002 a F-006: `requerirSesion()` como primera instrucción de cada página, layout y
acción; `searchParams` validado con Zod (valor inválido → valor por defecto); un componente de filtros de
cliente por pantalla con su esquema (I-07); comentario con el FR o la RN en cada regla. **El pronóstico, la
evaluación y la reposición no se guardan y no dependen de internet** (FR-004, FR-007); **el modelo solo
redacta** (FR-012).

---

## Fase 1: Preparación

**Propósito**: confirmar que el punto de partida está sano antes de tocar código compartido.

- [X] T001 Verificar el entorno: `docker info` responde, el contenedor `almacen-oruro-postgres` está *healthy*, y `npm run lint`, `npm run typecheck` y `npm test` terminan sin errores con las 477 pruebas de F-001 a F-006 en verde; anotar el resultado para compararlo al final

---

## Fase 2: Fundamentos (bloquea todas las historias)

**Propósito**: el método de pronóstico, la serie de consumo, la aleatoriedad sembrada, los esquemas y la
navegación que usan las siete historias.

**⚠️ CRÍTICO**: ninguna historia empieza antes de terminar esta fase.

- [X] T002 [P] Crear `tests/unitarios/holt-winters.test.ts` (debe fallar antes de T003): con la serie construida a mano de 36 meses `base 100 × factor estacional {ene..dic}` **sin ruido** (estacionalidad perfecta), `ajustarHoltWinters` + `pronosticarHoltWinters` tienen menor MAE que `promedioMovil(valores, 3)` sobre los últimos 6 meses (SC-003); dos ejecuciones sobre la misma serie devuelven exactamente los mismos `{ alfa, beta, gamma }` y el mismo pronóstico (FR-004); ante empate gana la combinación de valores más bajos en orden α, β, γ (FR-003); un pronóstico negativo se devuelve como 0 (caso borde); `promedioMovil` con ventana mayor que la serie usa los meses disponibles; `ingenuoEstacional` devuelve el mismo mes del año anterior
- [X] T003 Crear `src/servicios/ia/holt-winters.ts` con funciones **puras** y comentarios que expliquen cada paso (FR-023, principio VIII): `ajustarHoltWinters(valores: number[])` según research A-02 —inicialización determinista (nivel = promedio del primer año; tendencia = (promedio del segundo año − promedio del primero) / 12; estacionales = promedio por mes calendario de `valor − promedio de su año`), recursión aditiva con α, β, γ, y búsqueda en rejilla de las **729** combinaciones de {0,1 … 0,9} minimizando el MAE de pronóstico a un mes dentro de los datos de ajuste, con desempate por valores más bajos—, `pronosticarHoltWinters(ajuste, horizonte): number[]` (negativos → 0), `promedioMovil(valores, ventana)` e `ingenuoEstacional(valores, horizonte)`
- [X] T004 [P] Crear `src/lib/aleatorio.ts` con `generadorAleatorio(semilla: number)` (algoritmo `mulberry32`, ~5 líneas, con comentario de por qué no se usa `Math.random()`: el histórico simulado debe ser reproducible, FR-019) y `tests/unitarios/aleatorio.test.ts`: la misma semilla produce la misma secuencia, semillas distintas producen secuencias distintas, y todos los valores caen en `[0, 1)`
- [X] T005 [P] Crear `src/esquemas/ia.ts` con `esquemaFiltroPronostico` (`categoria` id opcional con `.catch(undefined)`, `soloConReposicion` casilla `"si"` → booleano), `esquemaFiltroInformes` (`tipo`: `todos` | `compras` | `distribuciones` con `.catch("todos")`), `esquemaNuevoInforme` (`tipo` obligatorio "Elige el tipo de informe"; `desde` y `hasta` con el **mes anterior completo** por defecto y `desde ≤ hasta` → "La fecha «desde» no puede ser posterior a «hasta»") y `esquemaSeccionesInforme` (`resumen` texto no vacío; `hallazgos`, `alertas` y `recomendaciones` arreglos de texto que **pueden venir vacíos** —exigir un elemento obligaría al modelo a inventar una alerta, contra FR-012—, data-model §4), con sus tipos; y `tests/unitarios/esquemas-ia.test.ts` con los valores por defecto, el rango invertido, una respuesta con los tres arreglos vacíos aceptada y una respuesta a la que le falta una sección rechazada
- [X] T006 [P] Crear `tests/integracion/serie-consumo.test.ts` (debe fallar antes de T007) y `src/servicios/ia/serie.ts` con `serieDeConsumo(productoId)` y `seriesDeConsumo(productoIds)` según data-model §1: consumo del mes = `− Σ cantidad` de los movimientos `SALIDA_DISTRIBUCION` y `ANULACION_DISTRIBUCION` con `fecha_documento` en el mes; meses desde el primer movimiento hasta el **mes anterior al actual**, con 0 en los meses sin movimientos; la prueba usa distribuciones reales: un mes con una distribución de 6 da consumo 6; al anular esa distribución el mes vuelve a 0 (RN-53); un mes intermedio sin movimientos vale 0; el mes en curso no aparece; un producto sin movimientos devuelve una serie vacía
- [X] T007 [P] Sumar **IA** (`/ia`) después de Reportes en el menú de `src/app/(sistema)/layout.tsx` y su acceso en `src/app/(sistema)/page.tsx` ("Pronóstico de consumo, reposición sugerida e informes redactados"); crear `src/app/(sistema)/ia/page.tsx` con `requerirSesion()` y tres tarjetas (Pronóstico y reposición, Evaluación del pronóstico, Informes IA) con una línea de qué responde cada una

**Punto de control**: T002, T004, T005 y T006 en verde; `npm test` y `npm run typecheck` sin errores.

---

## Fase 3: Historia 1 · Generar el histórico simulado (Prioridad: P1) 🎯 MVP

**Objetivo**: una base de demostración con 36 meses coherentes, reproducible y marcada como simulada.

**Prueba independiente**: quickstart §3, pasos 1 a 3.

- [X] T008 [P] [US1] Crear `tests/integracion/generador-historico.test.ts` con una configuración **reducida** (`{ meses: 6, productos: 3, semilla: 42 }`) para que la prueba sea rápida: dos ejecuciones con la misma semilla sobre bases vacías producen los mismos **campos de negocio** —fecha de documento, número de factura y de vale, productos, cantidades, montos, estados y saldos—, comparados con `toEqual` sobre objetos armados a mano; **nunca** `creadoEn`, `actualizadoEn` ni los ids, que cambian en cada ejecución y harían fallar la prueba siempre (SC-001); `verificarConsistenciaInventario` informa 0 diferencias y ningún producto quedó con stock negativo (SC-004, H1 · E4); los datos incluyen entregas parciales, pedidos en los cuatro estados y al menos una anulación de compra y una de distribución (H1 · E5); al terminar, `configuracion` tiene `modoDemostracion: true`, `datosSimuladosEn` y `semillaSimulacion` (H1 · E6, FR-021); ejecutarlo sobre una base **con** documentos lo rechaza con "El generador solo se ejecuta sobre una base sin compras, pedidos ni distribuciones" y no cambia nada (H1 · E7, FR-022)
- [X] T009 [US1] Crear `src/servicios/ia/generador.ts` con `generarHistorico({ meses = 36, productos = 25, semilla, alPaso? })` según research A-07 y data-model §5: verifica que no haya compras, pedidos ni distribuciones; crea 1 centro de salud, 5 representantes, ~25 productos en 6 categorías con sus unidades y 3 proveedores; recorre los meses **en orden cronológico** terminando el mes anterior al actual y, en cada mes, calcula el consumo objetivo de cada producto con la función **pura y exportada** `objetivoDeConsumo(base, mes, anios, aleatorio)` = `base × estacional(mes) × 1,03^años × ruido(±15 %)`, alimentada por `generadorAleatorio(semilla)` (junio, julio y agosto por encima del resto, S-06) —y crear `tests/unitarios/consumo-simulado.test.ts` que la pruebe sin base de datos: con ruido neutro, el promedio de junio, julio y agosto es mayor que el de los otros nueve meses; `objetivoDeConsumo(base, mes, 1, …)` es un 3 % mayor que con `anios = 0` (FR-019); y sobre 1 000 valores con el generador sembrado, ninguno se aparta más del 15 % del valor sin ruido—; registra las compras necesarias con holgura, los pedidos de los representantes y sus distribuciones —algunas **parciales**, dejando pedidos PENDIENTE, PARCIAL y ATENDIDO, y anulando alguno— y de vez en cuando anula una compra o una distribución; **todo con `registrarCompra`, `registrarPedido`, `registrarDistribucion`, `anularCompra`, `anularDistribucion` y `anularPedido`, sin atajos** (FR-020); termina escribiendo `configuracion` con `modoDemostracion: true`, `datosSimuladosEn` y `semillaSimulacion`; y deja algunos productos bajo mínimo y otros con stock holgado (H1 · E8)
- [X] T010 [US1] Crear `scripts/generar-historico.mts` (envoltura delgada: lee `--semilla` con valor por defecto fijo `20260915`, llama a `generarHistorico` mostrando el avance mes a mes por consola y termina con un resumen de documentos creados) y agregar a `package.json` el script `"datos:simulados": "tsx --tsconfig ./tsconfig.json scripts/generar-historico.mts"`; el generador **no se ofrece en ninguna pantalla** (FR-024)

**Punto de control**: T008 en verde; `npm run datos:simulados -- --semilla 20260915` sobre una base recién creada deja la demostración lista (quickstart pasos 1 a 3).

---

## Fase 4: Historia 2 · Pronóstico y reposición sugerida (Prioridad: P1)

**Objetivo**: responder "¿qué compro y cuánto?" con un número reproducible y una fórmula a la vista.

**Prueba independiente**: quickstart §3, pasos 4 a 7 y 9.

- [X] T011 [P] [US2] Crear `tests/unitarios/pronostico.test.ts`: `metodoParaSerie` devuelve `"holt-winters"` con 24 meses o más, `"promedio-movil"` entre 3 y 23, `"promedio-disponible"` con 1 o 2 y `"sin-historial"` sin consumo (FR-002); `reposicionSugerida(40, 10, 35) === 15` (H2 · E3), stock mayor que pronóstico + mínimo → 0 (H2 · E4), sin historial → `máx(0, mínimo − stock)` (H2 · E7), y el resultado siempre es entero hacia arriba; y `tests/integracion/pronostico.test.ts`: con series creadas por distribuciones reales, `pronosticoDeProductos` devuelve una fila por producto **activo** con `{ codigo, nombre, unidad, mesPronosticado, metodo, pronostico, stockActual, stockMinimo, reposicionSugerida }`, los productos inactivos no aparecen (caso borde), dos llamadas seguidas dan exactamente el mismo resultado (SC-002) y los filtros por categoría y "solo con reposición mayor que 0" reducen la lista y el total de unidades sugeridas
- [X] T012 [US2] Crear `src/servicios/ia/pronostico.ts` con `MES_PRONOSTICADO` (mes en curso, el primero sin datos completos), `metodoParaSerie(serie)`, `pronosticarProducto(serie)` (devuelve `{ metodo, etiqueta, pronostico }` con el pronóstico a **un decimal** y 0 si sale negativo), `reposicionSugerida(pronostico, stockMinimo, stockActual)` = `máx(0, ⌈pronóstico + stock mínimo − stock actual⌉)` con comentario de FR-005, y `pronosticoDeProductos({ categoriaId?, soloConReposicion? })` que lee las series con `seriesDeConsumo` en una sola consulta y devuelve `{ filas, totales: { unidadesSugeridas, productos } }`; sin escribir nada en la base (FR-004)
- [X] T013 [US2] Crear `src/app/(sistema)/ia/pronostico/page.tsx` y `filtros-pronostico.tsx`: filtros Categoría (`listarCategorias({ estado: "todos" })`) y la casilla "Solo con reposición mayor que 0"; encabezado con el mes pronosticado y el total de unidades sugeridas; tabla con Código, Producto, Unidad, Método, Pronóstico, Stock actual, Stock mínimo y Reposición sugerida; la **fórmula** `Reposición = máx(0, ⌈pronóstico + stock mínimo − stock actual⌉)` visible en la pantalla (FR-005, FR-006); nota de que el pronóstico se calcula en el momento y no necesita internet (FR-007); enlace al gráfico de cada producto (llega en US7)

**Punto de control**: T011 en verde; quickstart pasos 4 a 7.

---

## Fase 5: Historia 3 · Evaluar la calidad del pronóstico (Prioridad: P1)

**Objetivo**: mostrar con números que el método principal pronostica mejor que dos métodos simples.

**Prueba independiente**: quickstart §3, paso 8.

- [X] T014 [P] [US3] Crear `tests/unitarios/evaluacion.test.ts`: `mae([10, 12], [11, 10]) === 1.5`; `wape` devuelve `Σ|error| / Σ real` y **`null` ("No aplica") cuando el consumo real suma 0** (FR-009, H3 · E6); `evaluarProducto` con una serie de 36 meses de estacionalidad perfecta marca `mejor: "holt-winters"` frente al promedio móvil (SC-003, H3 · E4), usa los **últimos 6 meses** como validación y los anteriores como ajuste (H3 · E1), y con menos de 30 meses devuelve `{ evaluable: false, motivo: "No evaluable: se necesitan al menos 30 meses" }` (H3 · E5); y `tests/integracion/evaluacion.test.ts`: `evaluarCatalogo` sobre datos reales devuelve el mismo resultado en dos llamadas (H3 · E7) y los productos no evaluables quedan fuera del resultado general
- [X] T015 [US3] Crear `src/servicios/ia/evaluacion.ts` con `mae(pronosticos, reales)`, `wape(pronosticos, reales)` (`null` si `Σ real = 0`), `evaluarProducto(serie)` según data-model §3 —validación = últimos 6 meses; ajuste = los anteriores; los tres métodos pronostican esos 6 meses **usando solo los meses de ajuste**, incluida la búsqueda en rejilla de Holt-Winters (FR-008, aclaración del 13/09)— y `evaluarCatalogo()` con el resultado general (MAE promedio y WAPE global por método, y el mejor), con comentario de por qué los parámetros no pueden elegirse mirando la validación
- [X] T016 [US3] Crear `src/app/(sistema)/ia/evaluacion/page.tsx`: explicación breve del procedimiento (qué se reserva, qué métodos compiten y qué miden MAE y WAPE); tabla por producto con MAE y WAPE de los tres métodos y el mejor **resaltado con texto** (no solo color); fila de resultado general; lista aparte de los productos "No evaluable" con su motivo (FR-009)

**Punto de control**: T014 en verde; quickstart paso 8.

---

## Fase 6: Historia 4 · Informe IA de compras (Prioridad: P2)

**Objetivo**: un informe redactado por el modelo a partir de datos calculados por el sistema, con su tabla
al lado.

**Prueba independiente**: quickstart §3, pasos 11, 12 y 14.

- [X] T017 [P] [US4] Crear `tests/integracion/informe-compras.test.ts` con un **redactor falso**: `datosInformeCompras({ desde, hasta })` devuelve los bloques de data-model §4 (`periodo`, `totales` con la variación porcentual contra el período anterior de igual duración, `porProveedor`, `topProductos`, `bajoMinimo`, `reposicion`) con las cifras esperadas sobre compras reales, y **no contiene** ninguna clave `telefono`, `direccion`, `correo`, `ci` ni `contrasena` recorriendo el objeto en profundidad (FR-012, research A-10); `generarInforme("COMPRAS", periodo, usuarioId, redactorFalso)` guarda un `informe_ia` con tipo, período, `datosEntrada`, texto con las cuatro secciones, `modelo` y usuario (FR-014); y **no guarda nada** si el período no tiene compras vigentes ("No hay datos suficientes para ese período: no se generó el informe"), si el redactor lanza `sin-conexion`, si lanza `demora` o si devuelve una respuesta sin las cuatro secciones, cada uno con el mensaje de data-model §4 (FR-015)
- [X] T018 [US4] Instalar `@anthropic-ai/sdk` con versión exacta (`npm install @anthropic-ai/sdk@<versión>` y sin rango en `package.json`, T-01); crear `src/servicios/ia/redactor.ts` con el puerto `type Redactor = (peticion: { tipo, datos }) => Promise<SeccionesInforme>`, la constante `MODELO_IA = "claude-opus-5"`, la clase `ErrorDeRedaccion` con motivo (`sin-conexion` | `demora` | `formato`) y `redactorAnthropic`: cliente del SDK con la clave de `ANTHROPIC_API_KEY`, `client.messages.parse` con `zodOutputFormat(esquemaSeccionesInforme)`, `max_tokens: 8000`, `output_config: { effort: "medium" }`, `timeout: 60_000` ms y `maxRetries: 0` (research A-08), instrucciones de sistema en español (redactar para la administración del centro de salud, **no inventar cifras**, usar solo los datos entregados, secciones *Resumen*, *Hallazgos*, *Alertas* y *Recomendaciones*), y traducción de los errores del SDK a `ErrorDeRedaccion` **de lo más específico a lo más general**: primero `Anthropic.APIConnectionTimeoutError` → `demora`, después `Anthropic.APIConnectionError` → `sin-conexion` (el de demora **extiende** al de conexión: al revés, toda demora se informaría como "sin conexión"), y `parsed_output` nulo o inválido → `formato`; agregar `ANTHROPIC_API_KEY` a `.env.example` con la nota de que solo hace falta para generar informes nuevos
- [X] T019 [US4] Crear `src/servicios/ia/informes.ts` con `datosInformeCompras({ desde, hasta })` —que reutiliza `reporteCompras`, `reporteExistencias` y el pronóstico, y arma el objeto **campo por campo** (nunca serializando entidades de Prisma, A-10)— y `generarInforme(tipo, periodo, usuarioId, redactor = redactorAnthropic)`: calcula los datos, rechaza si el período no tiene documentos vigentes, llama al redactor, valida con `esquemaSeccionesInforme`, arma el texto con las cuatro secciones y guarda el `informe_ia` con `MODELO_IA`; si algo falla, **no guarda nada** y lanza el `ErrorDeNegocio` con el mensaje correspondiente (FR-015)
- [X] T020 [US4] Crear `src/app/(sistema)/ia/informes/acciones.ts` con `generarInformeAccion(datos: unknown)` (requerirSesion → `esquemaNuevoInforme` → `generarInforme` → `aResultadoDeError` → `revalidatePath("/ia/informes")` → `redirect("/ia/informes/{id}?aviso=generado")`), `src/app/(sistema)/ia/informes/nuevo/page.tsx` y `formulario-informe.tsx` (cliente: tipo, desde y hasta con el mes anterior por defecto, botón "Generar informe" que muestra "Generando el informe…" mientras espera, la nota "Generar un informe nuevo necesita conexión a internet; los informes ya guardados se consultan e imprimen sin ella" (FR-016, SC-008) y el aviso de error con enlace a los informes guardados), y `src/app/(sistema)/ia/informes/[id]/page.tsx` básica (texto con sus cuatro secciones —cada sección vacía como "Sin hallazgos/alertas/recomendaciones en el período"—, modelo, fecha y usuario)

**Punto de control**: T017 en verde; quickstart pasos 11, 12 y 14 (los pasos 11 a 13 necesitan internet y clave).

---

## Fase 7: Historia 5 · Informe IA de distribuciones (Prioridad: P2)

**Objetivo**: el mismo informe, sobre lo entregado a los representantes.

**Prueba independiente**: quickstart §3, paso 13.

- [X] T021 [P] [US5] Crear `tests/integracion/informe-distribuciones.test.ts` con el redactor falso: `datosInformeDistribuciones({ desde, hasta })` trae `porRepresentante` (representante, servicio y unidades), `topProductos` (los 10 más distribuidos), `pedidosPorEstado` (`{ PENDIENTE, PARCIAL, ATENDIDO, ANULADO }`), `totales` con la variación contra el período anterior y `pronostico` de los 10 productos principales (FR-011); no contiene claves de contacto (A-10); `generarInforme("DISTRIBUCIONES", …)` guarda el informe y respeta los mismos rechazos que la Historia 4 (H5 · E2)
- [X] T022 [US5] Agregar `datosInformeDistribuciones` a `src/servicios/ia/informes.ts` reutilizando `reporteDistribuciones`, `reportePedidos` y el pronóstico; conectarlo en `generarInforme` según el tipo y ofrecer los dos tipos en el formulario de `/ia/informes/nuevo`

**Punto de control**: T021 en verde; quickstart paso 13.

---

## Fase 8: Historia 6 · Consultar e imprimir informes guardados (Prioridad: P2)

**Objetivo**: que un informe generado antes se abra e imprima aunque no haya internet.

**Prueba independiente**: quickstart §3, pasos 16 a 18.

- [X] T023 [P] [US6] Crear `tests/integracion/informes-consulta.test.ts`: `listarInformes({ tipo: "todos" })` devuelve los informes del más reciente al más antiguo con tipo, período, fecha, modelo y usuario, y filtra por tipo (FR-016); `obtenerInforme(id)` trae texto, datos de entrada y usuario, y `null` si no existe; generar dos veces el mismo tipo y período crea **dos** informes y el primero no cambia (H6 · E4); ninguna función de consulta escribe (conteo de `informe_ia` estable)
- [X] T024 [US6] Agregar `listarInformes({ tipo })` y `obtenerInforme(id)` a `src/servicios/ia/informes.ts`; crear `src/app/(sistema)/ia/informes/page.tsx` y `filtros-informes.tsx` con la tabla (Fecha, Tipo, Período, Modelo, Emitido por, "Ver informe"), el botón "Generar informe" y el mensaje vacío "Todavía no hay informes generados"
- [X] T025 [US6] Crear `src/componentes/ia/tabla-datos-informe.tsx` (servidor: renderiza los bloques de `datosEntrada` con `TablaReporte` de F-006 —**sin contenedor con desplazamiento**, para que al imprimir el encabezado se repita en cada hoja, decisión E-06—, compartido por la ficha y la impresión); completar `src/app/(sistema)/ia/informes/[id]/page.tsx` con el texto **junto a** su tabla de datos, la nota "Texto redactado por un modelo de lenguaje a partir de los datos de la tabla" y el enlace "Imprimir informe"; y crear `src/app/(impresion)/ia/informes/[id]/imprimir/page.tsx` con `requerirSesion()`, `EncabezadoReporte` de F-006 (título "Informe IA de compras/distribuciones", filtros = período, emisión y usuario, leyenda de datos simulados si corresponde), el texto, la tabla, el modelo, la fecha y la nota; controles "← Volver" e `BotonImprimir` dentro de un bloque `print:hidden` (FR-016, SC-008)

**Punto de control**: T023 en verde; quickstart pasos 16 a 18.

---

## Fase 9: Historia 7 · Gráfico de consumo y pronóstico (Prioridad: P3)

**Objetivo**: ver de un vistazo la serie y el pronóstico de un producto.

**Prueba independiente**: quickstart §3, paso 10.

- [X] T026 [US7] Crear `src/app/(sistema)/ia/pronostico/[productoId]/page.tsx` y `grafico-consumo.tsx` (componente de **servidor** que dibuja un SVG sin librerías, research A-12): barras del consumo mensual de la serie, los pronósticos del método principal para los 6 meses de validación si el producto es evaluable y el pronóstico del mes en curso, cada serie con su color y su leyenda en texto; meses en el eje horizontal y unidades en el vertical; tabla de respaldo con los mismos valores debajo del gráfico, para quien no vea colores y para imprimir; enlace "← Volver al pronóstico"

**Punto de control**: quickstart paso 10.

---

## Fase 10: Cierre y aspectos transversales

- [ ] T027 [P] Crear `tests/integracion/ia-invariantes.test.ts`: leyendo `src/servicios/ia/pronostico.ts`, `evaluacion.ts` y `serie.ts` con `readFileSync`, verificar que no contienen `.create(`, `.update(`, `.delete(` ni `$executeRaw` (FR-004); que `src/servicios/ia/informes.ts` no llama a `informeIa.update` ni `informeIa.delete` (FR-014); que `redactor.ts` es el **único** archivo que importa `@anthropic-ai/sdk` (research A-08) y que ni `pronostico.ts` ni `evaluacion.ts` lo importan (FR-007); y que tras calcular pronóstico y evaluación sobre datos de prueba, los conteos de `movimiento_inventario`, `producto` e `informe_ia` no cambiaron
- [ ] T028 [P] Revisar con `grep` que todas las páginas de `src/app/(sistema)/ia/` y `src/app/(impresion)/ia/` llaman a `requerirSesion` como primera instrucción, que la acción de informes también, y que todo `searchParams` se valida con un esquema Zod; corregir lo que falte
- [ ] T029 [P] Revisar accesibilidad e impresión a 375 px: etiquetas en los filtros y en el formulario de informe, el mejor método de la evaluación marcado con texto además de color, el gráfico con su tabla de respaldo, las tablas de pantalla con desplazamiento propio y la hoja del informe sin controles
- [ ] T030 Ejecutar `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`; confirmar que las 477 pruebas de F-001 a F-006 siguen en verde junto con las de F-007 y corregir errores y advertencias
- [ ] T031 Ejecutar el recorrido de `specs/007-inteligencia-artificial/quickstart.md` §3 con el método de `docs/decisiones.md` I-15, I-29, I-35 e I-41, sobre una base de pruebas con el histórico simulado generado por el comando; medir SC-005 (pronóstico y evaluación en menos de 10 s), cuánto tarda el generador completo de 36 meses (para anotarlo en `docs/instalacion.md` y que nadie crea que se colgó) y, si hay clave e internet, SC-006 (informe en menos de 60 s) y SC-007 (cada cifra del texto en la tabla); anotar en una sección "4. Estado de la validación" qué se verificó, qué pasos necesitan internet y qué queda para el recorrido con Raymond; al terminar, detener el servidor y borrar el archivo del token
- [ ] T032 [P] Actualizar `docs/decisiones.md` con la sección "Inteligencia artificial (plan de F-007, 15/09/2026)" que resuma A-01 a A-14 en el formato de tabla de E-01 a E-12, y con las decisiones de implementación nuevas (I-42 en adelante); `specs/001-acceso-personal/contracts/rutas.md` sumando `/ia`, `/ia/pronostico/[productoId]` e `/ia/informes/[id]/imprimir`; `docs/instalacion.md` con el paso de instalación del histórico simulado (`npm run datos:simulados -- --semilla 20260915`, qué hace, cuánto tarda, que solo corre sobre una base sin documentos y cómo regenerar) y la sección "10. Pronóstico, reposición e informes IA"; crear `docs/metodo-pronostico.md` con el procedimiento **paso a paso y con un ejemplo numérico** —serie de consumo → elección de método → ajuste de Holt-Winters y su rejilla → pronóstico del mes → evaluación con los 6 meses reservados → reposición sugerida—, escrito para explicarse sin leer el código (FR-023, principio VIII), y enlazarlo desde `/ia`, `/ia/pronostico` y `/ia/evaluacion`; y `docs/especificacion/README.md` marcando F-007 como implementada en el cronograma
- [ ] T033 [P] **Opcional (P3, FR-025)**: si queda tiempo, resaltar en el texto del informe los números que no aparecen en su tabla de datos, ignorando años, fechas y la numeración de listas, con la advertencia "Cifra no encontrada en los datos"; incluir su prueba unitaria. Si no se implementa, dejarlo anotado en `docs/trabajo-futuro.md`

---

## Dependencias y orden de ejecución

### Entre fases

- **Preparación (fase 1)** → **Fundamentos (fase 2)** → historias → **Cierre (fase 10)**.
- En la fase 2, T002, T004, T005, T006 y T007 tocan archivos distintos y van en paralelo; T003 va después
  de T002 (la prueba debe fallar antes).

### Entre historias

| Historia | Depende de | Motivo |
|---|---|---|
| US1 Generador | Fundamentos | Usa `generadorAleatorio` y los servicios de F-003 a F-005 |
| US2 Pronóstico | Fundamentos (serie y Holt-Winters); US1 para verlo con datos | El cálculo no depende del generador, pero sin histórico no hay nada que mostrar |
| US3 Evaluación | US2 | Reutiliza el ajuste y la serie |
| US4 Informe de compras | US2 (la reposición entra en los datos) | Trae la dependencia nueva y el puerto `Redactor` |
| US5 Informe de distribuciones | US4 | Agrega su función al mismo servicio y al mismo formulario |
| US6 Consulta e impresión | US4 | Lista y muestra lo que US4 guarda |
| US7 Gráfico | US2 y US3 | Dibuja la serie, la validación y el pronóstico |

US4 y US5 editan `src/servicios/ia/informes.ts`: van en secuencia. US6 puede empezar en cuanto US4 guarde
informes.

### Dentro de cada historia

Pruebas [P] primero (las de integración deben fallar antes del servicio) → servicio → páginas. Commit al
terminar cada fase, sin líneas de autoría.

---

## Ejemplos de trabajo en paralelo

```text
# Fase 2:
T002 tests/unitarios/holt-winters.test.ts
T004 src/lib/aleatorio.ts + su prueba
T005 src/esquemas/ia.ts + su prueba
T006 serie de consumo + su prueba
T007 menú, inicio e índice /ia

# Al empezar cada historia:
T008 (US1) · T011 (US2) · T014 (US3) · T017 (US4) · T021 (US5) · T023 (US6)

# Cierre:
T027 invariantes · T028 sesión y filtros · T029 accesibilidad · T032 documentación
```

---

## Estrategia de implementación

### MVP (Historias 1 a 3)

Fases 1 a 5: base de demostración, pronóstico con reposición y evaluación. Es la parte P1 y la que sostiene
el capítulo de resultados del proyecto; funciona **sin internet y sin clave de API**.

### Entrega incremental

| Paso | Fases | Resultado verificable |
|---|---|---|
| 1 | 1 y 2 | Método, serie, aleatoriedad y esquemas probados; F-001 a F-006 intactas |
| 2 | 3 (US1) | Base de demostración de 36 meses, reproducible y consistente |
| 3 | 4 (US2) | Pronóstico y reposición sugerida con la fórmula a la vista |
| 4 | 5 (US3) | Evaluación que compara los tres métodos |
| 5 | 6 y 7 (US4, US5) | Los dos informes IA con su tabla de datos |
| 6 | 8 (US6) | Informes guardados, consultables e imprimibles sin conexión |
| 7 | 9 (US7) | Gráfico de consumo y pronóstico |
| 8 | 10 | Invariantes, calidad, validación y documentación |

**Orden de corte** (`00-decisiones-y-alcance.md` §5 y plan): si el día se atrasa, se posterga primero
**T033** (resaltado de cifras, P3), después **US7** (gráfico, P3) y después **US4 a US6** (informes, P2).
US1 a US3 son imprescindibles.

---

## Notas

- [P] = archivos distintos y sin dependencias pendientes.
- El pronóstico, la evaluación y la reposición **no se guardan** y **no dependen de internet**; el modelo de
  lenguaje **solo redacta** a partir de datos ya calculados (principio VIII).
- Cada regla de negocio lleva en el código un comentario con su FR o RN y el porqué (principio I).
- Si aparece algo que la especificación no cubre, se corrige primero `spec.md`; no se improvisa en el código.
