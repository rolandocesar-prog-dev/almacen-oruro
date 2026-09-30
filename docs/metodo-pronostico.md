# Método de pronóstico, evaluación y reposición

Este documento explica, paso a paso y sin leer el código, cómo calcula el sistema el pronóstico de
consumo, cómo demuestra su calidad y cómo sugiere cuánto reponer (F-007, FR-023; constitución, principio
VIII). Las cifras del ejemplo salieron del código del sistema. El código está en
`src/servicios/ia/serie.ts`, `holt-winters.ts`, `pronostico.ts` y `evaluacion.ts`.

**La regla que ordena todo el módulo: el sistema calcula y el modelo de lenguaje solo redacta.** Ningún
número de esta página lo produce un modelo de lenguaje: son cuentas deterministas sobre el kardex, que se
repiten igual cada vez y no necesitan internet.

Al final están las [preguntas probables del tribunal](#preguntas-probables-del-tribunal), con una respuesta
corta para cada una.

---

## Por qué esto es inteligencia artificial

El módulo tiene tres piezas. Solo una usa un servicio externo, y **no es la que aprende**:

| Pieza | Qué hace | ¿Aprende de los datos? | ¿Necesita internet? |
|---|---|---|---|
| **Pronóstico** | Ajusta un modelo al consumo de cada producto y predice el mes en curso | **Sí**: elige sus parámetros entre 729 combinaciones según cuánto se equivoca con el historial de ese producto | No |
| **Evaluación** | Oculta los últimos 6 meses, pronostica sin verlos y mide el error contra dos métodos simples | Comprueba el aprendizaje con datos que el modelo no vio | No |
| **Informes IA** | Un modelo de lenguaje (Claude) redacta en español las cifras que el sistema ya calculó | No: no aprende ni recuerda nada entre un informe y otro | Solo para generar uno nuevo |

La reposición sugerida es una cuenta sencilla (Paso 4); lo inteligente es el pronóstico del que depende.

**El argumento en tres frases.** El aprendizaje automático es la rama de la inteligencia artificial que
construye modelos a partir de datos para predecir casos que no vio. El pronóstico hace exactamente eso: no
tiene reglas escritas a mano sobre cuánto se consume cada producto; aprende de su historial la estación, la
tendencia y el nivel, con parámetros propios para cada producto, y predice un mes que todavía no ocurrió.
La evaluación hace lo que exige cualquier trabajo serio de aprendizaje automático: probar el modelo con
datos que no usó para ajustarse y compararlo con alternativas simples.

**Lo que hay que reconocer.** Holt-Winters nació en la estadística (Holt, 1957; Winters, 1960) y la frontera
entre estadística y aprendizaje automático es difusa: muchos métodos pertenecen a las dos. Se eligió a
propósito un modelo que Raymond puede explicar paso a paso, con papel y lápiz, en lugar de una red neuronal
que nadie podría explicar frente al tribunal (constitución, principio VIII).

---

## Paso 1 · La serie de consumo

Para cada producto, el consumo de un mes es lo que se **entregó por distribución** con fecha de documento
en ese mes, menos lo que se devolvió al **anular** esas distribuciones:

```text
consumo(mes) = − Σ cantidad de los movimientos SALIDA_DISTRIBUCION y ANULACION_DISTRIBUCION del mes
```

Las salidas se guardan con signo negativo y las anulaciones con signo positivo, por eso el signo menos
delante. Como una anulación lleva la fecha de la distribución que anula (RN-53), una entrega anulada deja
su mes en 0 y nunca en negativo.

- La serie empieza en el mes del primer movimiento del producto y termina en el **mes anterior al actual**.
- Un mes sin entregas vale **0**: es un dato, no un hueco.
- El **mes en curso no entra**: está incompleto y bajaría el pronóstico.
- Las compras no son consumo y no entran.

**Ejemplo.** Lavandina 1 L, 30 meses de marzo de 2024 a agosto de 2026 (datos inventados y redondos para
seguir la cuenta):

| | Mar | Abr | May | Jun | Jul | Ago | Sep | Oct | Nov | Dic | Ene | Feb |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Año 1 (2024-25) | 60 | 62 | 88 | 95 | 90 | 70 | 64 | 60 | 58 | 58 | 60 | 62 |
| Año 2 (2025-26) | 64 | 66 | 94 | 101 | 96 | 75 | 68 | 64 | 62 | 62 | 64 | 66 |
| Año 3 (2026) | 68 | 70 | 99 | 106 | 101 | 79 | | | | | | |

Se ve la estación (mayo a julio consumen más) y un crecimiento de un año al siguiente.

---

## Paso 2 · Qué método usar

| Historia del producto | Método |
|---|---|
| 24 meses o más | **Holt-Winters** aditivo con estacionalidad de 12 meses |
| 3 a 23 meses | Promedio de los últimos 3 meses |
| 1 o 2 meses | Promedio de los meses disponibles |
| Sin consumo | 0 ("Sin historial") |

Holt-Winters necesita **dos años completos** para saber cómo se comporta cada mes; con menos, un promedio
es más honesto que un método mal ajustado. La lavandina del ejemplo tiene 30 meses: usa Holt-Winters.

---

## Paso 3 · Holt-Winters

El método separa la serie en tres partes y las va corrigiendo mes a mes:

- **Nivel**: cuánto se consume "en general".
- **Tendencia**: cuánto sube o baja el nivel de un mes al siguiente.
- **Estacionalidad**: cuántas unidades se aparta cada mes del año de ese nivel (en el ejemplo, mayo suma y
  noviembre resta).

### 3.1 Valores iniciales

Se calculan siempre igual, para que el resultado se pueda repetir:

- nivel = promedio del primer año = **68,92**
- tendencia = (promedio del segundo año − promedio del primero) / 12 = (73,50 − 68,92) / 12 = **0,382**
- índice estacional de cada mes = promedio, entre los años completos, de "valor del mes − promedio de su
  año". Para marzo: ((60 − 68,92) + (64 − 73,50)) / 2 = **−9,21**. Los doce índices del ejemplo son:

| Mar | Abr | May | Jun | Jul | Ago | Sep | Oct | Nov | Dic | Ene | Feb |
|---|---|---|---|---|---|---|---|---|---|---|---|
| −9,21 | −7,21 | 19,79 | 26,79 | 21,79 | 1,29 | −5,21 | −9,21 | −11,21 | −11,21 | −9,21 | −7,21 |

### 3.2 Corrección mes a mes

Con tres pesos entre 0 y 1 —**α** para el nivel, **β** para la tendencia y **γ** para la estacionalidad—,
cada mes observado corrige las tres partes:

```text
nivel nuevo       = α × (valor − estacional del mes) + (1 − α) × (nivel + tendencia)
tendencia nueva   = β × (nivel nuevo − nivel anterior) + (1 − β) × tendencia
estacional nuevo  = γ × (valor − nivel nuevo) + (1 − γ) × estacional del mes
```

Un peso alto sigue de cerca lo último que pasó; uno bajo cambia despacio. Primer mes del ejemplo (marzo,
60 unidades) con α = 0,9, β = 0,1 y γ = 0,3:

- nivel = 0,9 × (60 + 9,21) + 0,1 × (68,92 + 0,382) = **69,22**
- tendencia = 0,1 × (69,22 − 68,92) + 0,9 × 0,382 = **0,374**
- estacional de marzo = 0,3 × (60 − 69,22) + 0,7 × (−9,21) = **−9,21**

### 3.3 Elegir α, β y γ

Se prueban **las 729 combinaciones** de 0,1, 0,2 … 0,9 para los tres pesos (9 × 9 × 9). Con cada una se
recorre la serie y, antes de mirar cada mes a partir del segundo año, se anota cuánto se habría equivocado
el pronóstico a un mes. Gana la combinación con **menor error absoluto medio**. Si dos empatan, gana la de
valores más bajos (primero α, después β, después γ): así el resultado es siempre el mismo.

Con los 30 meses del ejemplo gana **α = 0,9, β = 0,1, γ = 0,3**, con un error medio de 0,95 unidades.

### 3.4 El pronóstico

```text
pronóstico a h meses = nivel final + tendencia final × h + índice estacional del mes que se pronostica
```

Se muestra con **un decimal** y, si diera negativo, como 0. El mes pronosticado es el **mes en curso**.
En el ejemplo, septiembre de 2026 da **73,0** litros.

---

## Paso 4 · La reposición sugerida

```text
reposición = máx(0, ⌈pronóstico + stock mínimo − stock actual⌉)
```

Lo que se va a consumir, más lo que se quiere conservar como mínimo, menos lo que ya hay; hacia arriba,
porque no se compra media unidad, y nunca negativa. Con el pronóstico de 73,0, un mínimo de 72 y 105 en
stock: ⌈73,0 + 72 − 105⌉ = **40** litros. Si el stock fuera 200, la reposición sería **0**. Un producto sin
historial sugiere solo lo que falta para llegar al mínimo.

La fórmula está en la pantalla **IA → Pronóstico y reposición** para rehacer la cuenta con los números de
cada fila.

---

## Paso 5 · La evaluación: ¿pronostica bien?

1. Se **reservan los últimos 6 meses** de la serie. Ningún método los ve.
2. Con los meses anteriores, cada método pronostica esos 6 meses. Holt-Winters repite la búsqueda del
   paso 3.3 **solo con esos meses**: si eligiera sus pesos mirando la validación, se estaría evaluando con
   las respuestas a la vista.
3. Se compara cada pronóstico con lo que de verdad se consumió.

Compiten tres métodos:

- **Holt-Winters**, el del sistema.
- **Ingenuo estacional**: "este mes se consumirá lo mismo que el mismo mes del año pasado".
- **Promedio móvil**: "el promedio de los últimos 3 meses", repetido para los 6.

Y se miden dos errores, en los dos **menos es mejor**:

```text
MAE  = Σ |pronóstico − real| / 6          → en promedio, cuántas unidades se equivoca por mes
WAPE = Σ |pronóstico − real| / Σ real     → qué parte de lo consumido fue error
```

El WAPE permite comparar productos de distinto volumen; si en esos 6 meses no se consumió nada, "No
aplica". Hacen falta **al menos 30 meses** (24 para ajustar y 6 para validar).

**Ejemplo.** La lavandina se ajusta con 24 meses (de marzo de 2024 a febrero de 2026) y se validan de
marzo a agosto de 2026:

| | Mar | Abr | May | Jun | Jul | Ago | MAE | WAPE |
|---|---|---|---|---|---|---|---|---|
| Real | 68 | 70 | 99 | 106 | 101 | 79 | | |
| Holt-Winters | 64,0 | 66,0 | 93,0 | 99,9 | 94,9 | 74,4 | 5,12 | 5,9 % |
| Ingenuo estacional | 64 | 66 | 94 | 101 | 96 | 75 | 4,50 | 5,2 % |
| Promedio móvil | 64 | 64 | 64 | 64 | 64 | 64 | 23,17 | 26,6 % |

En este ejemplo el ingenuo estacional gana por poco: la serie inventada repite casi exacto el año anterior.
El promedio móvil, que no ve la estación, se equivoca cuatro veces más. **La comparación se muestra tal
cual sale**: que un método simple gane en un producto es un resultado, no una falla.

El **resultado general** de la pantalla promedia el MAE de todos los productos evaluables y calcula el WAPE
global (suma de todos los errores sobre suma de todos los consumos reales). Con el histórico simulado de la
demostración (semilla 20260915), Holt-Winters queda primero: MAE promedio 10,6 y WAPE 17,1 %, contra 10,9
y 17,7 % del ingenuo estacional y 19,9 y 32,1 % del promedio móvil.

---

## Paso 6 · Lo que hace el modelo de lenguaje (y lo que no)

En los **Informes IA** el sistema calcula primero los datos del período (totales, comparación con el
período anterior, proveedores, representantes, productos, bajo mínimo, reposición y pronóstico) y se los
entrega a un modelo de lenguaje (Claude, `claude-opus-5`) con la instrucción de **redactar en español
usando solo esas cifras**. El modelo no calcula el pronóstico ni la reposición. Recibe nombres de
productos, proveedores, centros de salud y representantes, pero **nunca** CI, teléfonos, direcciones, correos
ni contraseñas (hay una prueba automática que lo verifica).

El informe guarda y muestra **junto al texto** la tabla exacta que recibió el modelo, y cada número del
texto que no aparece en esa tabla se marca con "Cifra no encontrada en los datos".

---

## Preguntas probables del tribunal

Cada respuesta está pensada para decirse en voz alta; entre paréntesis, dónde está el respaldo.

**1. "Holt-Winters es estadística, no inteligencia artificial."**
Es un modelo predictivo que se ajusta con datos: prueba 729 combinaciones de parámetros para cada producto y
se queda con la que menos se equivoca en su historial. Después se valida con meses que no vio. Eso es
aprendizaje automático, aunque el método venga de la estadística; la frontera entre las dos es difusa y
muchos métodos son de ambas. (Sección "Por qué esto es inteligencia artificial"; Pasos 3.3 y 5.)

**2. "¿Por qué no usaron redes neuronales, ARIMA u otro método más moderno?"**
Por dos razones. Cada producto tiene unos 36 meses de historia: una red neuronal necesita miles de datos y con
tan pocos memoriza en vez de aprender. Y el sistema tiene que poder explicarse: Holt-Winters se sigue con
papel y lápiz, como en el ejemplo de este documento. ARIMA también sirve para pocos datos, pero exige
pruebas estadísticas previas que complican la explicación sin una ganancia demostrada. (Constitución,
principio VIII. Por qué el método se escribió en el propio sistema y no con una librería:
`specs/007-inteligencia-artificial/research.md`, A-02.)

**3. "¿Por qué no le piden el pronóstico directamente a Claude?"**
Porque un modelo de lenguaje no calcula de forma verificable: la misma pregunta puede dar números
distintos, y no se puede explicar de dónde salió una cifra. En el sistema, todo número lo calcula un
algoritmo que da siempre el mismo resultado con los mismos datos; Claude solo redacta. (Paso 6.)

**4. "Los datos son simulados: ¿cómo saben que funciona con datos reales?"**
No lo sabemos, y está declarado como limitación: el almacén no tiene años de datos reales. Lo que sí se
demuestra es que el modelo **descubre por sí solo** un patrón que no se le dijo: el generador de datos le
puso estación de invierno, un crecimiento del 3 % anual y un ruido de hasta ±15 %, y el pronóstico solo ve el
kardex, no esos valores. Con datos reales se ejecuta el mismo código, y la pantalla de evaluación dirá
cuánto se equivoca. (`src/servicios/ia/generador.ts`; D-07.)

**5. "Su método le gana al ingenuo estacional por muy poco."**
Es cierto: MAE promedio 10,6 contra 10,9, y WAPE 17,1 % contra 17,7 %. Con una estación estable, "lo mismo
que el año pasado" es un competidor fuerte. Holt-Winters además sigue la tendencia y se adapta si el consumo
cambia, cosa que el ingenuo no hace. Al promedio móvil, que no ve la estación, le gana con claridad: 19,9 y
32,1 %. Y el sistema muestra la comparación tal como sale, aunque en algún producto gane un método simple.
(Paso 5; pantalla "Evaluación del pronóstico".)

**6. "¿Qué impide que Claude invente cifras?"**
Tres cosas. La instrucción le ordena usar solo los datos enviados. El sistema revisa el texto y marca cada
número que no aparece en esos datos con "Cifra no encontrada en los datos". Y el informe muestra, junto al
texto, la tabla exacta que recibió el modelo, para que cualquiera compare. (Paso 6;
`src/servicios/ia/verificacion-cifras.ts`.)

**7. "¿Y si no hay internet, o si la empresa del modelo deja de dar el servicio?"**
El pronóstico, la evaluación y la reposición no usan internet, y los informes ya generados se abren e
imprimen sin conexión. Sin internet solo no se puede generar un informe nuevo, y el sistema lo dice con un
mensaje claro. Un solo archivo habla con el servicio externo (`src/servicios/ia/redactor.ts`); para cambiar
de proveedor se cambia ese archivo. (Constitución, principio VIII.)

**8. "¿Qué datos salen del sistema hacia Claude?"**
Solo cifras agregadas del período y nombres: productos, proveedores, centros de salud y representantes.
Nunca CI, teléfonos, direcciones, correos ni contraseñas; las pruebas automáticas lo verifican cada vez
que se ejecutan. (Paso 6; `tests/integracion/informe-compras.test.ts` e `informe-distribuciones.test.ts`.)
