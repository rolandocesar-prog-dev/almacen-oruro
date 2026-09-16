# Guía de validación · F-007 Inteligencia artificial

**Plan**: [plan.md](plan.md) · **Especificación**: [spec.md](spec.md)

## 1. Requisitos previos

El entorno de F-001 a F-006: Docker Desktop abierto, `docker compose up -d`, migraciones aplicadas y
semilla cargada ([F-001 quickstart §2](../001-acceso-personal/quickstart.md#2-preparación-una-sola-vez)).
F-007 **no agrega migraciones**. Además:

- `ANTHROPIC_API_KEY` en `.env` (solo para **generar** informes nuevos; todo lo demás funciona sin ella);
- la base de demostración lista, con el comando de instalación:

```bash
npm run datos:simulados -- --semilla 20260915
```

Ese comando solo corre sobre una base **sin** compras, pedidos ni distribuciones. Para volver a generar, se
recrea la base (`docker compose down -v`, `docker compose up -d`, `npm run db:migrar`, `npm run db:semilla`).

## 2. Pruebas automatizadas

```bash
npm test
```

**Resultado esperado:** todas en verde, incluidas las de F-001 a F-006. Ninguna prueba llama al servicio del
modelo ni necesita `ANTHROPIC_API_KEY`. Pruebas mínimas de F-007:

| Regla | Tipo | Requisito |
|---|---|---|
| Holt-Winters sobre una serie con estacionalidad perfecta y sin ruido: menor error que el promedio móvil | unitaria | SC-003 |
| Ajuste determinista: mismos parámetros y mismo pronóstico en dos ejecuciones; desempate por valores más bajos | unitaria | FR-003, FR-004 |
| Elección de método por longitud de serie (≥ 24, 3 a 23, 1 o 2, sin consumo) | unitaria | FR-002 |
| MAE y WAPE, con "No aplica" cuando el consumo real de validación suma 0 | unitaria | FR-009 |
| Reposición sugerida: 40 + 10 − 35 = 15; stock holgado → 0; sin historial → `máx(0, mínimo − stock)` | unitaria | FR-005 |
| Generador pseudoaleatorio: misma semilla, misma secuencia | unitaria | FR-019 |
| Consumo objetivo simulado: junio a agosto por encima del resto, +3 % de un año al siguiente, ruido dentro de ±15 % | unitaria | FR-019 |
| Secciones del informe: los tres arreglos pueden venir vacíos; falta una sección → rechazo | unitaria | FR-012, FR-015 |
| Serie de consumo desde el kardex: un mes con distribución y su anulación vuelve a 0; el mes en curso no entra | integración | FR-001 |
| Pronóstico y evaluación reproducibles sobre los mismos datos | integración | SC-002 |
| Generador reducido (3 productos, 6 meses): misma semilla → mismos datos; inventario consistente; rechazo si ya hay documentos; marca de demostración con fecha y semilla | integración | SC-001, SC-004, FR-021, FR-022 |
| Datos de informe: cifras esperadas y **sin** claves de teléfono, dirección, correo, CI ni contraseña | integración | FR-011, FR-012 |
| Generación con redactor falso: éxito guarda el informe; respuesta incompleta, error del servicio, demora y período vacío **no guardan nada** y dan su mensaje | integración | FR-014, FR-015 |
| Listado y ficha de informes guardados | integración | FR-016 |

## 3. Recorrido de validación manual

Con la aplicación en marcha (`npm run dev`) y una sesión iniciada, sobre la base de demostración.

| # | Acción | Resultado esperado | Spec |
|---|---|---|---|
| 1 | Cualquier pantalla | Banda "Datos simulados con fines de demostración" | H1 · E6, SC-009 |
| 2 | **Existencias** | Hay productos bajo mínimo y productos con stock holgado | H1 · E8 |
| 3 | **Existencias → Verificar consistencia** | "El inventario es consistente…" | H1 · E4, SC-004 |
| 4 | **IA → Pronóstico** | Una fila por producto activo con método, pronóstico, stock, mínimo y reposición; la fórmula a la vista; encabezado con el total de unidades sugeridas | H2 · E1 |
| 5 | Recargar la pantalla | Exactamente los mismos números | H2 · E2, SC-002 |
| 6 | Verificar a mano dos filas | `máx(0, ⌈pronóstico + mínimo − stock⌉)` coincide; una fila con stock holgado muestra 0 | H2 · E3, E4 |
| 7 | Filtrar por categoría y "Solo con reposición mayor que 0" | La lista y el total se reducen | H2 · E8 |
| 8 | **IA → Evaluación** | Tabla por producto con MAE y WAPE de los tres métodos, el mejor resaltado, y el resultado general; productos con menos de 30 meses como "No evaluable" | H3 · E3, E5 |
| 9 | Desconectar internet y repetir los pasos 4 y 8 | Funcionan igual | H2 · E9, SC-008 |
| 10 | **IA → Pronóstico → un producto** | Gráfico con el consumo mensual, los 6 meses de validación y el pronóstico del mes, diferenciado | H7 · E1, E2 |
| 11 | Con internet, **IA → Informes → Nuevo**, tipo compras, mes anterior | Tabla de datos y texto con *Resumen*, *Hallazgos*, *Alertas* y *Recomendaciones*, con modelo, fecha y usuario | H4 · E1 a E3 |
| 12 | Comparar cada cifra del texto con la tabla | Todas las cifras del texto están en la tabla | H4 · E4, SC-007 |
| 13 | Repetir con tipo distribuciones | Igual, con representantes, productos, pedidos por estado y pronóstico | H5 · E1 |
| 14 | Elegir un período sin documentos | "No hay datos suficientes para ese período"; no se llamó al modelo y no se guardó nada | H4 · E6 |
| 15 | Desconectar internet e intentar generar | "No se pudo generar el informe: sin conexión…" con acceso al historial; nada guardado | H6 · E5 |
| 16 | Sin internet, abrir **IA → Informes** y un informe guardado | Se ven texto y tabla tal como se generaron | H6 · E1, E2 |
| 17 | Imprimir un informe | Hoja con el encabezado de reportes, texto, tabla, modelo, fecha, la nota "Texto redactado por un modelo de lenguaje a partir de los datos de la tabla" y la leyenda de datos simulados | H6 · E3 |
| 18 | Generar otra vez el mismo tipo y período | Se guarda uno nuevo; el anterior no cambia | H6 · E4 |
| 19 | Medir el paso 4 con la evaluación completa y el paso 11 | Pronóstico y evaluación en menos de 10 s; informe en menos de 60 s | SC-005, SC-006 |

## 4. Estado de la validación (16/09/2026)

| Qué | Estado | Cómo se verificó |
|---|---|---|
| Pruebas automatizadas (§2) | ✅ | 602 pruebas en verde en 87 archivos (477 de F-001 a F-006 y 125 de F-007), más `lint`, `typecheck` y `build` sin errores. Ninguna llama al modelo ni necesita clave. Incluyen además el consumo simulado con estación, tendencia y ruido acotado, el formato del texto guardado, la traducción de los errores del SDK, el resaltado de cifras (FR-025) y los invariantes: el cálculo no escribe, los informes solo se crean, `redactor.ts` es el único archivo que importa el SDK y el generador no aparece en ninguna pantalla |
| Pasos 1 a 3 (histórico simulado) | ✅ | `npm run datos:simulados -- --semilla 20260915` sobre la base de pruebas vacía: 36 meses, 25 productos, 113 compras (5 anuladas), 188 pedidos (6 anulados), 187 distribuciones (7 anuladas), 1864 movimientos, en **9,4 s**. Banda de datos simulados en todas las pantallas, productos sin stock junto a otros con stock de sobra y "El inventario es consistente" |
| Pasos 4 a 8 y 10 | ✅ | Páginas pedidas con una sesión de prueba (método de `docs/decisiones.md`, I-15 e I-52): 25 productos con Holt-Winters, 838 unidades sugeridas y la fórmula a la vista; dos cargas idénticas; BOL-002 con 81,7 + 68 − 0 → 150 y DES-003 con 214 en stock → 0; filtros por categoría y "solo con reposición"; evaluación con los 25 productos evaluables y Holt-Winters primero (MAE 10,6 y WAPE 17,1 % contra 10,9 y 17,7 % del ingenuo estacional y 19,9 y 32,1 % del promedio móvil); gráfico de DES-002 con barras, línea de validación, barra rayada del mes y tabla de respaldo. Sin sesión, todas las rutas llevan a `/ingreso` |
| Paso 9 (sin internet) | ✅ por código · ⏳ físico | Una prueba verifica que serie, método, pronóstico, evaluación y detalle no importan el redactor, `fetch` ni el SDK; no se desconectó la red en el recorrido |
| Pasos 11 a 13 y SC-006, SC-007 (redacción real) | ⏳ Q-02 | No hay clave de API. Se verificó el formulario (tipos, mes anterior por defecto, aviso de que generar necesita internet); la redacción, su tiempo y la comparación cifra por cifra quedan para cuando Raymond tenga la clave |
| Pasos 14 y 15 | ✅ | Período sin documentos → "No hay datos suficientes para ese período: no se generó el informe"; con el redactor **real** y sin clave → "No se pudo generar el informe: sin conexión con el servicio de redacción…" en 112 ms, sin guardar nada |
| Pasos 16 a 18 | ✅ con redactor de prueba | Tres informes guardados con un redactor de prueba marcado como tal: listado del más reciente al más antiguo con filtro por tipo, ficha con texto, "Sin alertas en el período", tabla de datos, modelo, fecha, usuario y la nota del modelo; hoja de impresión con el encabezado de reportes, la leyenda de datos simulados y sin menú; generar dos veces crea dos informes y el primero no cambia |
| SC-005 (pronóstico y evaluación en menos de 10 s) | ✅ | Con los 36 meses: pronóstico en 379 ms y evaluación en 417 ms |
| 375 px y gráfico | ✅ | Revisado en el navegador integrado: ninguna pantalla del módulo desborda a 375 px y el gráfico se lee con su leyenda |
| SC-010 (reposición rehecha a mano por alguien ajeno) | ⏳ | En el recorrido con Raymond |

Mejoras que salieron del recorrido: el generador pedía la quinta parte del consumo previsto y dejaba meses
en 0 que arrastraban el pronóstico (corregido, I-50), la unidad del eje del gráfico se encimaba con la
primera marca y la ficha del informe desbordaba en pantallas angostas (corregidos).
