# Método de pronóstico, evaluación y reposición

Este documento explica, paso a paso y sin leer el código, cómo calcula el sistema el pronóstico de
consumo, cómo demuestra su calidad y cómo sugiere cuánto reponer (F-007, FR-023; constitución, principio
VIII). Las cifras del ejemplo salieron del código del sistema. El código está en
`src/servicios/ia/serie.ts`, `holt-winters.ts`, `pronostico.ts` y `evaluacion.ts`.

**La regla que ordena todo el módulo: el sistema calcula y el modelo de lenguaje solo redacta.** Ningún
número de esta página lo produce un modelo de lenguaje: son cuentas deterministas sobre el kardex, que se
repiten igual cada vez y no necesitan internet.

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
usando solo esas cifras**. El modelo no calcula el pronóstico ni la reposición, y no ve datos personales.

El informe guarda y muestra **junto al texto** la tabla exacta que recibió el modelo, y cada número del
texto que no aparece en esa tabla se marca con "Cifra no encontrada en los datos".
