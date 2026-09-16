# Modelo de datos · F-007 Inteligencia artificial

**Fecha**: 2026-09-15 · **Plan**: [plan.md](plan.md)

**Cambios en el esquema: ninguno.** Las tablas `informe_ia` (con la enumeración `tipo_informe`) y
`configuracion` ya existen desde la migración de F-001, y el pronóstico se calcula a partir de
`movimiento_inventario` y `producto`. Definición física completa:
[`specs/001-acceso-personal/data-model.md` §3 y §4](../001-acceso-personal/data-model.md).

| Tabla | Qué guarda F-007 |
|---|---|
| `informe_ia` | tipo (COMPRAS o DISTRIBUCIONES), período (`desde`, `hasta`), `datos_entrada` (JSON exacto enviado al modelo), `texto`, `modelo`, `usuario_id`, `creado_en` |
| `configuracion` | `modo_demostracion`, `datos_simulados_en` y `semilla_simulacion`, que escribe el generador (F-006 solo los lee) |

**Lo que NO se guarda** (FR-004): la serie de consumo, el pronóstico, los parámetros ajustados, la
evaluación y la reposición sugerida. Se calculan al consultarlos.

---

## 1. Serie de consumo (FR-001)

```text
serieDeConsumo(productoId):
  movimientos = SALIDA_DISTRIBUCION y ANULACION_DISTRIBUCION del producto
  consumo(mes) = − Σ cantidad de los movimientos con fecha_documento en ese mes
  meses = del mes del primer movimiento al mes ANTERIOR al actual, sin huecos (0 donde no hubo)
```

| Valor | Tipo | Nota |
|---|---|---|
| `mes` | texto `"AAAA-MM"` | por fecha del documento (RN-53) |
| `consumo` | entero ≥ 0 | las salidas restan y las anulaciones suman, así que nunca queda negativo |

El **mes en curso no forma parte de la serie**: está incompleto (caso borde de la especificación).

---

## 2. Pronóstico (FR-002, FR-003)

| Serie disponible | Método | Etiqueta |
|---|---|---|
| ≥ 24 meses | Holt-Winters aditivo, estacionalidad 12 | "Holt-Winters" |
| 3 a 23 meses | promedio móvil de 3 meses | "Promedio móvil (3 meses)" |
| 1 o 2 meses | promedio de los meses disponibles | "Promedio de los meses disponibles" |
| sin consumo | 0 | "Sin historial" |

Parámetros de Holt-Winters: α, β, γ ∈ {0,1 … 0,9}; se prueban las **729** combinaciones y gana la de menor
MAE de pronóstico a un mes dentro de los datos de ajuste; ante empate, los valores más bajos (α, luego β,
luego γ). Un pronóstico negativo se muestra como **0**; se muestra con **un decimal**.

### Fila de la pantalla de pronóstico (FR-006)

`{ productoId, codigo, nombre, unidad, mesPronosticado, metodo, pronostico, stockActual, stockMinimo, reposicionSugerida }`,
solo de productos **activos**, con filtros por categoría y "Solo con reposición mayor que 0" y el total de
unidades sugeridas en el encabezado.

### Reposición sugerida (FR-005)

```text
reposicionSugerida = máx(0, ⌈pronóstico + stock mínimo − stock actual⌉)
```

Ejemplos de la especificación: pronóstico 40, mínimo 10, stock 35 → **15**; stock mayor que pronóstico +
mínimo → **0**; producto sin historial → `máx(0, mínimo − stock)`.

---

## 3. Evaluación (FR-008, FR-009)

| Concepto | Regla |
|---|---|
| Elegibilidad | serie ≥ 30 meses; si no, "No evaluable: se necesitan al menos 30 meses" y queda fuera del resultado general |
| Partición | validación = últimos 6 meses; ajuste = todos los anteriores |
| Métodos | Holt-Winters (ajustado **solo** con los meses de ajuste), ingenuo estacional, promedio móvil de 3 |
| MAE | `Σ|pronóstico − real| / 6`, en unidades |
| WAPE | `Σ|pronóstico − real| / Σ real`, en %; **"No aplica"** si `Σ real = 0` |
| Por producto | fila con MAE y WAPE de los tres métodos y el mejor (menor MAE) resaltado |
| General | MAE promedio y WAPE global (`Σ|error| / Σ real` de todos los productos evaluables) por método, con el mejor resaltado |

---

## 4. Informes IA

### Período (FR-010)

`desde` y `hasta`; por defecto, el **mes anterior completo**; `desde ≤ hasta`; se usan solo documentos
vigentes y se agrupa por fecha del documento (RN-53).

### Datos de entrada (FR-011) — lo que se envía, se guarda y se muestra

**Compras**

| Bloque | Contenido |
|---|---|
| `periodo` | desde, hasta y el período anterior de igual duración |
| `totales` | total gastado y Nº de compras del período y del anterior, con variación porcentual |
| `porProveedor` | `{ proveedor, totalGastado, compras }[]` |
| `topProductos` | los 10 productos con más gasto: `{ codigo, producto, unidades, totalGastado }` |
| `bajoMinimo` | `{ codigo, producto, stockActual, stockMinimo }[]` |
| `reposicion` | `{ codigo, producto, pronostico, reposicionSugerida }[]` |

**Distribuciones**

| Bloque | Contenido |
|---|---|
| `periodo` | igual que compras |
| `porRepresentante` | `{ representante, servicio, unidades }[]` |
| `topProductos` | los 10 más distribuidos: `{ codigo, producto, unidad, unidades }` |
| `pedidosPorEstado` | `{ PENDIENTE, PARCIAL, ATENDIDO, ANULADO }` |
| `totales` | unidades entregadas del período y del anterior, con variación porcentual |
| `pronostico` | pronóstico del mes de los 10 productos principales |

**Nunca** se incluyen contraseñas, teléfonos, direcciones, correos ni CI (FR-012, research A-10).

### Respuesta del modelo (FR-012)

Salida estructurada validada con Zod:

```text
{ resumen: string, hallazgos: string[], alertas: string[], recomendaciones: string[] }
```

Se guarda como texto con esas cuatro secciones (*Resumen*, *Hallazgos*, *Alertas*, *Recomendaciones*).

### Rechazos (FR-015) — nada se guarda

| Situación | Mensaje |
|---|---|
| Período sin documentos vigentes | "No hay datos suficientes para ese período: no se generó el informe" |
| Sin conexión o servicio caído | "No se pudo generar el informe: sin conexión con el servicio de redacción. Puedes consultar los informes ya generados" |
| Más de 60 segundos | "El servicio de redacción tardó demasiado: el informe no se generó" |
| Respuesta sin las cuatro secciones | "La respuesta del servicio no tuvo el formato esperado: el informe no se generó" |

### Fila guardada

`{ id, tipo, desde, hasta, datosEntrada (JSON), texto, modelo, usuarioId, creadoEn }`. Cada generación crea
una fila nueva; ninguna se modifica ni se borra (FR-014).

---

## 5. Datos simulados (FR-018 a FR-022, FR-024)

| Parámetro | Valor |
|---|---|
| Alcance | 1 centro de salud, 5 representantes, ~25 productos en 6 categorías, 3 proveedores |
| Período | los 36 meses que terminan el mes anterior al actual |
| Consumo objetivo | `base × estacional(mes) × 1,03^años × ruido(±15 %)` |
| Estacional | mayor en junio, julio y agosto (S-06) |
| Aleatoriedad | generador `mulberry32` sembrado con la semilla del comando (por defecto, un valor fijo) |
| Documentos | compras, pedidos (los cuatro estados), distribuciones (algunas parciales) y algunas anulaciones, **todos por los servicios de F-003 a F-005** |
| Al terminar | `configuracion`: `modo_demostracion = true`, `datos_simulados_en`, `semilla_simulacion` |
| Rechazo | si ya hay compras, pedidos o distribuciones, no cambia nada |

---

## 6. Relación con otras funcionalidades

| Funcionalidad | Qué usa F-007 |
|---|---|
| F-002 | productos activos, categorías, stock mínimo |
| F-003 | movimientos del kardex (serie), `verificarConsistenciaInventario` (prueba del generador), `registrarCompra` y `anularCompra` |
| F-004 | `registrarPedido` y `anularPedido` en el generador; estados de pedido en el informe de distribuciones |
| F-005 | `registrarDistribucion` y `anularDistribucion` en el generador; las salidas son la serie de consumo |
| F-006 | `reporteCompras`, `reporteDistribuciones`, `reporteExistencias` y `reportePedidos` para los datos de los informes; `EncabezadoReporte`, el grupo `(impresion)` y la leyenda de datos simulados |
