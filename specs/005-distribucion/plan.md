# Plan de implementación: F-005 · Distribución

**Rama**: `005-distribucion` (se trabaja en `main`) | **Fecha**: 2026-09-15 | **Especificación**: [spec.md](spec.md)

**Entrada**: especificación de `specs/005-distribucion/spec.md`, con 2 aclaraciones del 13/09 y 3
precisiones del 15/09 (pedido por atender con valores inactivos, mensaje único de cantidad excedida y
controles de la vista de impresión).

## Resumen

F-005 registra las entregas de productos que atienden los pedidos de F-004. El encargado elige un pedido
PENDIENTE o PARCIAL, ve por cada línea lo pendiente, el stock y el máximo entregable, escribe el Nº de vale
del talonario y las cantidades, y guarda. En una sola transacción el stock baja con movimientos
`SALIDA_DISTRIBUCION`, lo entregado del pedido sube y su estado se recalcula. Una distribución no se edita:
se anula con motivo, lo que repone el stock y descuenta lo entregado. Se listan, se consultan y se imprime
el vale.

**Enfoque técnico:** reutiliza la arquitectura de F-001 a F-004, **sin migraciones ni dependencias nuevas**.
Registrar y anular siguen la regla de concurrencia del sistema: **primero el pedido (`bloquearPedido`),
después los productos (`bloquearProductos`)**, y verifican pendiente y stock con esos datos bloqueados
(research V-01, V-06). El stock solo cambia con `registrarMovimiento` y el estado del pedido solo con
`recalcularEstadoPedido`. El vale único se avisa al salir del campo y lo decide el índice único parcial
(V-04). El formulario muestra una fila por línea del pedido con su situación (V-02) y la vista del vale
usa un grupo de rutas sin menú (V-09).

## Contexto técnico

**Lenguaje/Versión**: TypeScript 5.9.3 estricto sobre Node.js 22 LTS (sin cambios)

**Dependencias principales**: las de F-001, **sin dependencias nuevas** (la impresión usa el navegador)

**Almacenamiento**: PostgreSQL 16; tablas `distribucion`, `distribucion_detalle`, `movimiento_inventario`,
`pedido` y `pedido_detalle` con sus CHECK e índices ya creados; **sin migraciones nuevas**

**Pruebas**: Vitest, unitarias e integración contra PostgreSQL real, con concurrencia real y verificación de
consistencia del inventario (research V-12)

**Plataforma**: la de F-001 (servidor Node.js local, Chrome o Edge, pantallas chicas)

**Tipo de proyecto**: aplicación web full-stack (un solo proyecto)

**Metas de rendimiento**: distribución de un pedido de 5 productos en menos de 2 minutos (SC-001)

**Restricciones**: stock nunca negativo, incluso en simultáneo (FR-006); todo o nada (RN-30); distribuciones
inmutables salvo la anulación (D-16); representante tomado del pedido (X-08); nombres en español

**Escala**: decenas de distribuciones por mes, unos 25 productos; histórico simulado de 36 meses (F-007)

## Verificación contra la constitución

*Puerta: debe pasar antes de la investigación y otra vez después del diseño.*

| # | Principio | Cómo lo cumple este plan | Antes | Después del diseño |
|---|---|---|---|---|
| I | Explicabilidad | Registro y anulación en pasos numerados con una sola regla de bloqueo; mensajes con máximo, pendiente y stock; decisiones V-01 a V-12 en `docs/decisiones.md` | ✅ | ✅ |
| II | Lógica en la aplicación | RN-30 a RN-36 en `src/servicios/distribuciones.ts`; la base respalda con FK, índice único parcial y CHECK de signo, saldo y cantidad; sin triggers | ✅ | ✅ |
| III | Kardex como única fuente | Toda variación de stock pasa por `registrarMovimiento` en la misma transacción; prueba de consistencia tras registros y anulaciones (SC-006); la prueba de única escritura de F-003 sigue vigente | ✅ | ✅ |
| IV | Documentos inmutables | Sin editar ni borrar (FR-012); anulación con motivo y movimiento inverso; guardado completo o nada | ✅ | ✅ |
| V | Baja lógica | Los filtros muestran representantes y productos inactivos; un pedido por atender con valores inactivos se distribuye igual porque el documento que eligió esos valores es el pedido (precisión de la especificación) | ✅ | ✅ |
| VI | Validación en dos lugares | `esquemaDistribucion` y `esquemaAnulacionDistribucion` en formulario y acción; lo que depende del pedido y del stock se verifica con datos bloqueados | ✅ | ✅ |
| VII | Seguridad básica | `requerirSesion()` en cada página (incluida la vista de impresión) y acción; consultas parametrizadas | ✅ | ✅ |
| VIII | IA transparente | No aplica (F-007 usará los movimientos de salida) | ✅ | ✅ |
| IX | Pruebas donde duele | No negatividad con concurrencia, vale duplicado, anulaciones, estado del pedido, consistencia ([quickstart §2](quickstart.md#2-pruebas-automatizadas)) | ✅ | ✅ |
| X | Idioma y nombres | `registrarDistribucion`, `anularDistribucion`, `situacionDeLinea`, `/distribuciones` | ✅ | ✅ |
| XI | Alcance cerrado | Sin distribuciones sin pedido, devoluciones parciales ni confirmación de recepción; impresión P3 primera en el orden de corte | ✅ | ✅ |

**Resultado:** sin violaciones.

## Estructura del proyecto

### Documentación (esta funcionalidad)

```text
specs/005-distribucion/
├── plan.md                    # Este archivo
├── research.md                # Fase 0: 12 decisiones (V-01 a V-12)
├── data-model.md              # Fase 1: validaciones, efectos en stock y pedido, consultas, invariantes
├── quickstart.md              # Fase 1: pruebas mínimas y recorrido de 14 pasos
├── contracts/
│   └── acciones-f005.md       # Rutas, Server Actions, servicios, esquemas y componentes
├── checklists/
│   └── requirements.md
└── tasks.md                   # Fase 2 (/speckit-tasks)
```

### Código fuente (lo que agrega o cambia F-005)

```text
src/
├── esquemas/distribuciones.ts                 # NUEVO: registro, anulación, filtros, avisos
├── servicios/distribuciones.ts                # NUEVO: situación de línea, registrar, anular, consultas
└── app/
    ├── (sistema)/
    │   ├── layout.tsx, page.tsx               # CAMBIAN: Distribuciones en el menú y el inicio
    │   └── distribuciones/                    # page, filtros, nueva/ (elegir pedido y formulario),
    │                                          # [id]/ (detalle y anular), acciones
    └── (impresion)/                           # NUEVO grupo de rutas sin menú
        ├── layout.tsx
        └── distribuciones/[id]/vale/          # page y botón de imprimir
tests/
├── ayudantes/distribuciones.ts                # NUEVO: pedido con stock listo para distribuir
├── ayudantes/inventario.ts                    # CAMBIA: crearSalidaDePrueba usa registrarDistribucion
├── unitarios/                                 # esquema de distribución, filtros, situación de línea
└── integracion/                               # registro, anulación, concurrencia, invariantes, listado, detalle
```

**Decisión de estructura:** la de F-001 a F-004, más el grupo de rutas `(impresion)` para la única vista
sin el menú del sistema (research V-09).

## Fases de este comando

| Fase | Artefacto | Estado |
|---|---|---|
| 0 · Investigación | [research.md](research.md): registro con bloqueos, formulario, validación, vale, elección del pedido, anulación, listado, detalle, impresión, navegación, ayudantes, pruebas | ✅ Sin pendientes |
| 1 · Diseño | [data-model.md](data-model.md): sin cambios de esquema | ✅ |
| 1 · Contratos | [contracts/acciones-f005.md](contracts/acciones-f005.md) | ✅ |
| 1 · Validación | [quickstart.md](quickstart.md) | ✅ |
| 2 · Tareas | [tasks.md](tasks.md): 34 tareas, revisadas con `/speckit-analyze` | ✅ |

## Cambios que este plan introduce en otros documentos y código existente

- **Esquema de base de datos:** ninguno.
- `specs/005-distribucion/spec.md`: caso borde del pedido por atender con representante o producto
  inactivo (corregido para coincidir con F-004, I-23) y sesión de precisiones del 15/09.
- `tests/ayudantes/inventario.ts`: `crearSalidaDePrueba` registra una distribución real (V-11); las pruebas
  de F-003 deben seguir en verde sin cambiar sus expectativas.
- `docs/trabajo-futuro.md`: sección F-005 con los fuera de alcance de la especificación (distribuciones sin
  pedido, confirmación de recepción, devoluciones parciales, numeración del vale según Q-04, PDF del vale).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Interbloqueos entre distribución, anulación de pedido, compra y anulación de compra | Orden único: pedido → distribución → productos en orden de `id`; pruebas de concurrencia reales |
| Stock negativo con distribuciones simultáneas | Verificación con productos bloqueados y `registrarMovimiento` como segunda barrera; CHECK de saldo en la base |
| Lo entregado del pedido se desfasa de las distribuciones | Se actualiza en la misma transacción que el movimiento; prueba del invariante SC-005 |
| El grupo de rutas `(impresion)` choca con `(sistema)/distribuciones/[id]` | Mismo nombre de parámetro `[id]` y URL distinta; se comprueba con `npm run build`; si fallara, la vista del vale oculta el menú con `print:hidden` y se registra la decisión |
| El jueves 17/09 incluía F-004 y F-005 | F-004 ya está implementada; orden de corte: primero la Historia 5 (imprimir, P3) y después la 4 (anular, P2) |

## Seguimiento de complejidad

Sin violaciones de la constitución que justificar.
