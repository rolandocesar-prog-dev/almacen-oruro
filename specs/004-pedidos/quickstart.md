# Guía de validación · F-004 Pedidos

**Plan**: [plan.md](plan.md) · **Especificación**: [spec.md](spec.md)

## 1. Requisitos previos

El entorno de F-001 a F-003: Docker Desktop abierto, `docker compose up -d`, migraciones aplicadas y
semilla cargada ([F-001 quickstart §2](../001-acceso-personal/quickstart.md#2-preparación-una-sola-vez)).
F-004 **no agrega migraciones**. Para el recorrido hacen falta al menos 2 representantes activos y uno
inactivo, y 3 productos activos, uno con stock menor que lo que se va a pedir (F-002 y F-003).

## 2. Pruebas automatizadas

```bash
npm test
```

**Resultado esperado:** todas en verde, incluidas las de F-001 a F-003. Pruebas mínimas de F-004:

| Regla | Tipo | Requisito |
|---|---|---|
| `calcularEstadoPedido`: sin entregas → PENDIENTE; todas completas → ATENDIDO; resto → PARCIAL | unitaria | FR-008, SC-002 |
| `esquemaPedido`: representante, fecha no futura, al menos una línea, cantidad entera 1 a 1 000 000, producto repetido con número de línea, sin campos de estado ni entregado | unitaria | FR-001 |
| Registrar: PENDIENTE, entregado 0, número asignado, ningún stock ni movimiento cambia; representante o producto inactivo rechazados; línea inválida no guarda nada | integración | FR-001 a FR-004, FR-007, SC-003, SC-005 |
| Editar: agrega, quita y cambia líneas conservando el número; rechazo si no está PENDIENTE; línea con distribuciones anuladas no se quita | integración | FR-006, RN-42 |
| Anular: PENDIENTE y PARCIAL quedan ANULADO conservando lo entregado; ATENDIDO y ANULADO rechazados; motivo obligatorio; stock intacto | integración | FR-010 a FR-012, SC-006 |
| `recalcularEstadoPedido` con entregas simuladas: PARCIAL, ATENDIDO, vuelta a PENDIENTE y ANULADO que sigue ANULADO | integración | FR-008, RN-35 |
| Concurrencia: edición contra entrega simulada y anulación contra entrega que completa: una sola gana | integración | casos borde, research P-12 |
| Listado: por defecto PENDIENTE y PARCIAL del más antiguo al más reciente; filtros; % atendido 40 % y 99 % | integración | FR-013 |
| Detalle: pendiente y saldo anulado por línea; acciones según el estado | integración | FR-014, FR-015 |

## 3. Recorrido de validación manual

Con la aplicación en marcha (`npm run dev`) y una sesión iniciada.

| # | Acción | Resultado esperado | Spec |
|---|---|---|---|
| 1 | **Pedidos → Registrar pedido** | El representante inactivo no aparece | H1 · E2 |
| 2 | Elegir un producto con stock 4 y pedir 10 | Se muestra "Stock actual: 4" y se acepta | H1 · E7 |
| 3 | Agregar 3 productos y guardar | Ficha con Nº, PENDIENTE, entregado 0; el stock de los productos no cambió | H1 · E1 |
| 4 | Registrar con un producto repetido, sin líneas, cantidad 2,5 y fecha de mañana | Mensajes con número de línea; no se guarda nada | H1 · E3 a E6, E8 |
| 5 | Abrir **Pedidos** | Solo PENDIENTE y PARCIAL, del más antiguo al más reciente, con % atendido | H2 · E1 |
| 6 | Filtrar por estado "Todos", por representante y por fechas | Solo los que cumplen | H2 · E2, E3 |
| 7 | Abrir el pedido del paso 3 | Solicitado, entregado y pendiente por línea; acciones Editar, Anular y Distribuir | H3 · E1, E5 |
| 8 | **Editar**: agregar un producto, quitar otro y cambiar una cantidad | Mismo Nº, sigue PENDIENTE, con las líneas nuevas | H4 · E1 |
| 9 | Anular sin motivo y luego con motivo | "Escribe el motivo de la anulación"; después ANULADO, sin acciones, fuera del listado por defecto | H5 · E1, E4 |
| 10 | Ficha de un representante → "Ver sus pedidos" | Listado filtrado por ese representante con todos los estados | Navegación |

Los escenarios con entregas (H2 · E4, H3 · E2 a E4, H4 · E2 y E3, H5 · E2 y E3) se prueban con entregas
simuladas en las pruebas de integración y se recorren en pantalla cuando exista F-005.

## 4. Estado de la validación (15/09/2026)

| Qué | Estado | Cómo se verificó |
|---|---|---|
| Pruebas automatizadas (§2) | ✅ | 365 pruebas en verde en 51 archivos (289 de F-001 a F-003 y 76 de F-004), más `lint`, `typecheck` y `build` sin errores. Incluyen concurrencia real con el pedido bloqueado: dos entregas simultáneas sobre la misma línea, edición contra entrega y anulación contra la entrega que completa el pedido |
| Pasos 1, 3, 5, 6, 7, 8 (resultado) y 10 | ✅ | Páginas pedidas con una sesión de prueba contra la base de pruebas, con datos cargados por los esquemas y servicios reales (método de `docs/decisiones.md`, I-15): representante y producto inactivos fuera del formulario; ficha "Pedido Nº 1" Pendiente con unidad BID5, Editar, Distribuir y Anular pedido, y el stock de Lavandina sigue en 4 en su kardex; listado por defecto con 3 pedidos del más antiguo al más reciente y "40 %"; filtros por estado, representante y fechas, aviso de rango invertido y mensaje vacío; PARCIAL sin Editar, ATENDIDO sin acciones; edición con "Pedido actualizado.", mismo número y líneas nuevas; un PARCIAL en `/editar` muestra "solo se editan pedidos pendientes"; "Ver sus pedidos" desde la ficha del representante; ids inexistentes → 404; sin sesión → `/ingreso` |
| Paso 9 (resultado) y escenarios con entregas | ✅ en pantalla con entregas simuladas | Pedido ANULADO desde PARCIAL con "Saldo anulado", motivo, "Anulado por", la distribución anulada Nº 000451 enlazada y sin acciones; las entregas se simularon en el script con `bloquearPedido` y `recalcularEstadoPedido`, como en las pruebas |
| Pasos 2, 4 y 9 (escribir en el formulario): stock informativo al elegir el producto, errores por línea, anulación sin motivo | ✅ por pruebas · ⏳ en pantalla | Cada regla y mensaje está comprobado en las pruebas unitarias e integración, y la página entrega el stock de cada producto al formulario; falta verlos en el navegador con una sesión real, porque exigen escribir en el formulario |
| T032 (375 px, accesibilidad) | ✅ revisión de código · ⏳ visual | Cada línea en un `<fieldset>` "Línea n" con etiquetas visibles, stock informativo asociado con `aria-describedby` al selector, errores con `aria-describedby`, tablas con desplazamiento propio e insignias de estado con texto; falta mirarlo en un teléfono |
| SC-004 (pedidos por atender en menos de 30 s) | ✅ parte del sistema · ⏳ persona | `/pedidos` respondió en unos 225 ms mostrando por defecto solo lo que falta entregar, con % atendido |
| SC-001 (pedido de 5 productos en menos de 2 min) | ⏳ | Se mide en el recorrido manual con Raymond |
| Distribuir y anular distribuciones en pantalla | ✅ con F-005 (15/09) | El enlace "Distribuir" de la ficha del pedido abre `/distribuciones/nueva?pedido={id}`, que existe desde F-005; el formulario, la distribución y su anulación se verificaron en el recorrido de F-005 ([quickstart §4](../005-distribucion/quickstart.md#4-estado-de-la-validación-15092026)). Escribir en el formulario sigue pendiente del recorrido manual |
