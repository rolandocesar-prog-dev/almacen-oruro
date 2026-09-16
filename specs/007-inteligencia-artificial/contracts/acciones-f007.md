# Contrato de rutas, servicios, Server Actions y comandos · F-007

**Plan**: [../plan.md](../plan.md) · **Especificación**: [../spec.md](../spec.md) · **Convenciones
comunes**: [F-001](../../001-acceso-personal/contracts/acciones-f001.md),
[F-005](../../005-distribucion/contracts/acciones-f005.md) y
[F-006](../../006-reportes/contracts/acciones-f006.md).

---

## 1. Rutas

| Ruta | Archivo | Página | Parámetros (Zod) |
|---|---|---|---|
| `/ia` | `src/app/(sistema)/ia/page.tsx` | Índice: pronóstico, evaluación e informes | — |
| `/ia/pronostico` | `…/ia/pronostico/page.tsx` | Pronóstico y reposición sugerida | `categoria`, `soloConReposicion` |
| `/ia/pronostico/[productoId]` | `…/ia/pronostico/[productoId]/page.tsx` | Gráfico de consumo y pronóstico (P3) | — |
| `/ia/evaluacion` | `…/ia/evaluacion/page.tsx` | Comparación de los tres métodos | — |
| `/ia/informes` | `…/ia/informes/page.tsx` | Informes guardados | `tipo` = `todos` \| `compras` \| `distribuciones` |
| `/ia/informes/nuevo` | `…/ia/informes/nuevo/page.tsx` | Elegir tipo y período y generar | `tipo`, `desde`, `hasta` |
| `/ia/informes/[id]` | `…/ia/informes/[id]/page.tsx` | Texto junto a su tabla de datos | — |
| `/ia/informes/[id]/imprimir` | `src/app/(impresion)/ia/informes/[id]/imprimir/page.tsx` | Informe para imprimir, sin menú | — |

Todas con `requerirSesion()`. Cambios en páginas existentes: menú (**IA** después de Reportes) e inicio.
`/ia`, `/ia/pronostico/[productoId]` y `/ia/informes/[id]/imprimir` se suman a las rutas reservadas en
F-001.

---

## 2. Server Actions · `src/app/(sistema)/ia/informes/acciones.ts`

| Acción | Entrada | Servicio | Éxito | Errores de negocio |
|---|---|---|---|---|
| `generarInformeAccion(datos: unknown)` | `esquemaNuevoInforme` (`tipo`, `desde`, `hasta`) | `generarInforme(tipo, periodo, usuarioId)` | redirige a `/ia/informes/[id]?aviso=generado` | período sin documentos; sin conexión; servicio caído; más de 60 s; respuesta sin las cuatro secciones (data-model §4) |

Es la **única** acción de F-007: el pronóstico, la evaluación y la consulta de informes solo leen. Revalida
`/ia/informes` al terminar. No existe acción para editar ni borrar informes (FR-014).

---

## 3. Servicios

### `src/servicios/ia/serie.ts`

| Función | Devuelve | Notas |
|---|---|---|
| `serieDeConsumo(productoId)` | `{ mes: string; consumo: number }[]` | data-model §1; sin el mes en curso |
| `seriesDeConsumo(productoIds)` | `Map<number, Serie>` | una sola lectura de movimientos para la pantalla completa |

### `src/servicios/ia/holt-winters.ts` (funciones puras)

| Función | Devuelve |
|---|---|
| `ajustarHoltWinters(valores)` | `{ alfa, beta, gamma, nivel, tendencia, estacionales, maeAjuste }` |
| `pronosticarHoltWinters(ajuste, horizonte)` | `number[]` (valores negativos → 0) |
| `promedioMovil(valores, ventana)` | `number` |
| `ingenuoEstacional(valores, horizonte)` | `number[]` |

### `src/servicios/ia/pronostico.ts`

| Función | Devuelve | Notas |
|---|---|---|
| `metodoParaSerie(serie)` | `"holt-winters" \| "promedio-movil" \| "promedio-disponible" \| "sin-historial"` | data-model §2 |
| `pronosticarProducto(serie)` | `{ metodo, etiqueta, pronostico }` | pronóstico con un decimal |
| `reposicionSugerida(pronostico, stockMinimo, stockActual)` | entero ≥ 0 | FR-005 |
| `pronosticoDeProductos({ categoriaId?, soloConReposicion? })` | `{ filas, totales: { unidadesSugeridas, productos } }` | solo productos activos |
| `MES_PRONOSTICADO` | `"AAAA-MM"` del mes en curso | se muestra en la pantalla |

### `src/servicios/ia/evaluacion.ts`

| Función | Devuelve |
|---|---|
| `mae(pronosticos, reales)` / `wape(pronosticos, reales)` | `number` / `number \| null` ("No aplica") |
| `evaluarProducto(serie)` | `{ evaluable: boolean; motivo?: string; porMetodo: { metodo, mae, wape }[]; mejor: string }` |
| `evaluarCatalogo()` | `{ filas, general: { metodo, maePromedio, wapeGlobal }[], mejorGeneral }` |

### `src/servicios/ia/informes.ts`

| Función | Devuelve | Notas |
|---|---|---|
| `datosInformeCompras({ desde, hasta })` | objeto de data-model §4 | reutiliza los reportes de F-006 |
| `datosInformeDistribuciones({ desde, hasta })` | objeto de data-model §4 | incluye el pronóstico de los 10 principales |
| `generarInforme(tipo, { desde, hasta }, usuarioId, redactor?)` | `{ id }` | calcula datos → redacta → valida → guarda; nada se guarda si falla |
| `listarInformes({ tipo })` | `{ informes }` | del más reciente al más antiguo |
| `obtenerInforme(id)` | informe con texto, datos y usuario, o `null` | |

### `src/servicios/ia/redactor.ts`

| Pieza | Detalle |
|---|---|
| `type Redactor` | `(peticion: { tipo, datos }) => Promise<SeccionesInforme>` |
| `redactorAnthropic` | `@anthropic-ai/sdk`, modelo `claude-opus-5`, `client.messages.parse` con `zodOutputFormat`, `max_tokens: 8000`, `output_config.effort: "medium"`, `timeout: 60_000` ms, `maxRetries: 0`; clave en `ANTHROPIC_API_KEY` |
| `MODELO_IA` | `"claude-opus-5"`, se guarda en cada informe |
| Errores | `ErrorDeRedaccion` con motivo (`sin-conexion`, `demora`, `formato`), que el servicio traduce a los mensajes de data-model §4 |

`generarInforme` recibe el redactor como parámetro (por defecto `redactorAnthropic`): las pruebas pasan uno
falso y **no** usan red ni clave (research A-08, A-14).

---

## 4. Esquemas · `src/esquemas/ia.ts`

`esquemaFiltroPronostico` (`categoria`, `soloConReposicion`), `esquemaFiltroInformes` (`tipo`),
`esquemaNuevoInforme` (`tipo` obligatorio, `desde` y `hasta` con el mes anterior por defecto y
`desde ≤ hasta`), `esquemaSeccionesInforme` (la respuesta del modelo) y los tipos correspondientes.

---

## 5. Comando de instalación

| Comando | Qué hace |
|---|---|
| `npm run datos:simulados -- --semilla 20260915` | Ejecuta `scripts/generar-historico.mts`: verifica que no haya documentos, crea catálogo y 36 meses de compras, pedidos y distribuciones con los servicios reales, y marca la base como de demostración (FR-018 a FR-022, FR-024) |

No hay ninguna pantalla que lo ejecute. Para regenerar, se recrea la base.

---

## 6. Componentes nuevos

| Componente | Tipo | Uso |
|---|---|---|
| `ia/pronostico/filtros-pronostico.tsx` | cliente | categoría y "Solo con reposición mayor que 0" |
| `ia/informes/filtros-informes.tsx` | cliente | filtro por tipo |
| `ia/informes/nuevo/formulario-informe.tsx` | cliente | tipo, período y botón "Generar informe" con aviso de espera |
| `ia/pronostico/[productoId]/grafico-consumo.tsx` | servidor | SVG de barras + pronóstico (P3) |
| `componentes/ia/tabla-datos-informe.tsx` | servidor | tabla de los datos de entrada, compartida por la ficha y la impresión |
