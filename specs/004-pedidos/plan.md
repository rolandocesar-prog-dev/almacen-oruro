# Plan de implementación: F-004 · Pedidos

**Rama**: `004-pedidos` (se trabaja en `main`) | **Fecha**: 2026-09-15 | **Especificación**: [spec.md](spec.md)

**Entrada**: especificación de `specs/004-pedidos/spec.md`, con 2 aclaraciones del 13/09 y 3
precisiones del 15/09 (número de pedido, tope de cantidad y líneas con distribuciones anuladas).

## Resumen

F-004 registra los pedidos que los representantes le hacen llegar al encargado: representante, fecha y
productos con la cantidad solicitada. El estado lo calcula el sistema a partir de lo entregado
(PENDIENTE, PARCIAL, ATENDIDO), salvo la anulación con motivo. Un pedido se edita solo mientras está
PENDIENTE y se anula en PENDIENTE o PARCIAL conservando lo entregado. Registrar, editar o anular un
pedido **no mueve stock**. El listado muestra por defecto lo que falta atender y el detalle, por
producto, lo solicitado, lo entregado y lo pendiente.

**Enfoque técnico:** reutiliza la arquitectura de F-001 a F-003, **sin migraciones ni dependencias
nuevas**. El estado se calcula con una función pura y se guarda con `recalcularEstadoPedido`, que usará
F-005 (research P-02). Editar, anular y distribuir empiezan bloqueando la fila del pedido con
`SELECT … FOR UPDATE`, así las operaciones simultáneas se ordenan solas: primero el pedido, después los
productos (P-03). La edición sincroniza las líneas por producto para no romper el historial de
distribuciones anuladas (P-04). El formulario sigue el patrón del de compras, con el stock actual de
cada producto como información (P-09).

## Contexto técnico

**Lenguaje/Versión**: TypeScript 5.9.3 estricto sobre Node.js 22 LTS (sin cambios)

**Dependencias principales**: las de F-001, **sin dependencias nuevas**

**Almacenamiento**: PostgreSQL 16; tablas `pedido` y `pedido_detalle` con sus CHECK e índices ya
creados; **sin migraciones nuevas**

**Pruebas**: Vitest, unitarias e integración contra PostgreSQL real, con entregas simuladas que imitan a
F-005 y operaciones simultáneas (research P-12)

**Plataforma**: la de F-001 (servidor Node.js local, Chrome o Edge, pantallas chicas)

**Tipo de proyecto**: aplicación web full-stack (un solo proyecto)

**Metas de rendimiento**: registrar un pedido de 5 productos en menos de 2 minutos (SC-001); saber qué
pedidos tienen algo por entregar en menos de 30 s (SC-004)

**Restricciones**: el pedido no mueve stock; estado calculado, nunca elegido salvo la anulación; edición
solo en PENDIENTE; nombres en español

**Escala**: decenas de pedidos por mes, 5 representantes, unos 25 productos por catálogo; histórico
simulado de 36 meses (F-007)

## Verificación contra la constitución

*Puerta: debe pasar antes de la investigación y otra vez después del diseño.*

| # | Principio | Cómo lo cumple este plan | Antes | Después del diseño |
|---|---|---|---|---|
| I | Explicabilidad | Estado en una función pura con la tabla de la especificación; "bloqueo el pedido y veo su estado" como única regla de concurrencia; decisiones P-01 a P-12 en `docs/decisiones.md` | ✅ | ✅ |
| II | Lógica en la aplicación | RN-40 a RN-43 en `src/servicios/pedidos.ts`; la base respalda con FK, UNIQUE y CHECK; el único SQL crudo es el `SELECT … FOR UPDATE` parametrizado | ✅ | ✅ |
| III | Kardex como única fuente | Pedidos no escriben stock ni movimientos; prueba de SC-003 y la de única escritura de F-003 siguen vigentes | ✅ | ✅ |
| IV | Documentos inmutables | El pedido no es un documento inmutable según la especificación (se edita en PENDIENTE); se guarda completo o nada; no hay borrado de pedidos | ✅ | ✅ |
| V | Baja lógica | Selectores con representantes y productos activos; RN-13 de F-002 impide dar de baja lo que tiene pedidos por atender | ✅ | ✅ |
| VI | Validación en dos lugares | `esquemaPedido` y `esquemaAnulacionPedido` en formulario y acción; estado y entregado fuera del esquema | ✅ | ✅ |
| VII | Seguridad básica | `requerirSesion()` en cada página y acción; consultas parametrizadas | ✅ | ✅ |
| VIII | IA transparente | No aplica | ✅ | ✅ |
| IX | Pruebas donde duele | Transiciones de estado, edición y anulación por estado, concurrencia y stock intacto ([quickstart §2](quickstart.md#2-pruebas-automatizadas)) | ✅ | ✅ |
| X | Idioma y nombres | `registrarPedido`, `calcularEstadoPedido`, `bloquearPedido`, `/pedidos` | ✅ | ✅ |
| XI | Alcance cerrado | Sin aprobación, prioridad, pedidos recurrentes ni reserva de stock | ✅ | ✅ |

**Resultado:** sin violaciones.

## Estructura del proyecto

### Documentación (esta funcionalidad)

```text
specs/004-pedidos/
├── plan.md              # Este archivo
├── research.md          # Fase 0: 12 decisiones (P-01 a P-12)
├── data-model.md        # Fase 1: validaciones, estado calculado, ciclo de vida y consultas
├── quickstart.md        # Fase 1: pruebas mínimas y recorrido de 10 pasos
├── contracts/
│   └── acciones-f004.md # Rutas, Server Actions, servicios y componentes
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Código fuente (lo que agrega o cambia F-004)

```text
src/
├── esquemas/
│   ├── comunes.ts                     # CAMBIA: cantidadEntera, marcarProductosRepetidos
│   ├── compras.ts                     # CAMBIA: usa las piezas comunes (mismas reglas)
│   └── pedidos.ts                     # NUEVO: esquemaPedido, esquemaAnulacionPedido, filtros
├── servicios/pedidos.ts               # NUEVO: estado, bloqueo, registrar, editar, anular, consultas
├── componentes/formularios/errores-de-lineas.ts  # NUEVO: extraído del formulario de compra
└── app/(sistema)/
    ├── layout.tsx, page.tsx           # CAMBIAN: Pedidos en el menú y el inicio
    ├── compras/formulario-compra.tsx  # CAMBIA: usa mensajesPorLinea
    ├── representantes/[id]/page.tsx   # CAMBIA: "Ver sus pedidos"
    └── pedidos/                       # page, nuevo/, [id]/ (anular), [id]/editar/, acciones, formulario, filtros, insignia
tests/
├── ayudantes/pedidos.ts               # NUEVO: crearPedidoDePrueba, simularEntregaDePrueba
├── unitarios/                         # estado calculado, esquema de pedido y filtros
└── integracion/                       # registro, edición, anulación, estado, concurrencia, listado, detalle
```

**Decisión de estructura:** la de F-001 a F-003. `pedidos.ts` exporta `bloquearPedido` y
`recalcularEstadoPedido` para F-005, igual que `inventario.ts` exporta `registrarMovimiento`.

## Fases de este comando

| Fase | Artefacto | Estado |
|---|---|---|
| 0 · Investigación | [research.md](research.md): número, estado calculado, bloqueo del pedido, edición por sincronización, registro, anulación, listado, detalle, formulario, fechas, pantallas, pruebas | ✅ Sin pendientes |
| 1 · Diseño | [data-model.md](data-model.md): sin cambios de esquema | ✅ |
| 1 · Contratos | [contracts/acciones-f004.md](contracts/acciones-f004.md) | ✅ |
| 1 · Validación | [quickstart.md](quickstart.md) | ✅ |
| 2 · Tareas | `tasks.md` | Pendiente: `/speckit-tasks` |

## Cambios que este plan introduce en otros documentos y código existente

- **Esquema de base de datos:** ninguno.
- `specs/004-pedidos/spec.md`: supuesto del número de pedido (puede saltar, nunca se repite), tope de
  cantidad de 1 000 000 en FR-001 y caso borde de la línea con distribuciones anuladas.
- `src/esquemas/compras.ts` y `formulario-compra.tsx`: usan las piezas extraídas, con las mismas reglas
  y mensajes (sus pruebas deben seguir en verde).
- `docs/trabajo-futuro.md`: los fuera de alcance de la especificación.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Los estados PARCIAL y ATENDIDO no se pueden ver en pantalla hasta F-005 | Entregas simuladas en las pruebas con el mismo bloqueo y la misma función de recálculo que usará F-005 |
| Interbloqueos entre edición, anulación y distribución | Orden fijo: primero el pedido, después los productos; pruebas de concurrencia |
| La edición borra líneas con historial | Sincronización por producto y rechazo explícito de líneas con distribuciones anuladas (P-04) |
| El jueves 17/09 incluye F-004 y F-005 | Orden de corte: primero la Historia 4 (editar, P2) y después la 5 (anular, P2); las Historias 1 a 3 son imprescindibles para F-005 |

## Seguimiento de complejidad

Sin violaciones de la constitución que justificar.
