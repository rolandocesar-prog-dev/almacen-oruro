# Plan de implementación: F-003 · Compras e inventario

**Rama**: `003-compras-inventario` (se trabaja en `main`) | **Fecha**: 2026-09-14 | **Especificación**: [spec.md](spec.md)

**Entrada**: especificación de `specs/003-compras-inventario/spec.md`, con 3 aclaraciones del 13/09.

## Resumen

F-003 registra las compras con factura y controla el inventario. Una compra se guarda completa
(cabecera, líneas y un movimiento de entrada por línea) o no se guarda; el servidor calcula
subtotales y total; la factura no se repite para el mismo proveedor entre compras vigentes; una
compra no se edita, se anula con motivo y la anulación revierte el stock si alcanza. El encargado
consulta las existencias con los productos bajo mínimo arriba, el kardex de cada producto y una
verificación de que el stock coincide con la suma de movimientos.

**Enfoque técnico:** reutiliza la arquitectura de F-001 y los catálogos de F-002, **sin migraciones
ni dependencias nuevas**. El corazón es `src/servicios/inventario.ts`, con
`registrarMovimiento(tx, …)` como **única** vía para cambiar el stock: dentro de la transacción del
documento bloquea la fila del producto con `SELECT … FOR UPDATE`, verifica que el saldo no quede
negativo y escribe movimiento y stock juntos (research K-01, que concreta R-11). El formulario de
compra maneja las líneas en estado de React y envía un objeto validado con el mismo esquema Zod en el
cliente y en la acción (K-03). Los montos se previsualizan en centavos enteros y se guardan con
`Prisma.Decimal` (K-04).

## Contexto técnico

**Lenguaje/Versión**: TypeScript 5.9.3 estricto sobre Node.js 22 LTS (sin cambios)

**Dependencias principales**: las de F-001, **sin dependencias nuevas**

**Almacenamiento**: PostgreSQL 16; tablas `compra`, `compra_detalle` y `movimiento_inventario` con sus
CHECK, índices y el índice único parcial `compra_factura_vigente_unica`, ya creados; **sin migraciones
nuevas**

**Pruebas**: Vitest, unitarias e integración contra PostgreSQL real, incluidas operaciones
simultáneas con `Promise.all` (research K-12)

**Plataforma**: la de F-001 (servidor Node.js local, Chrome o Edge, pantallas chicas)

**Tipo de proyecto**: aplicación web full-stack (un solo proyecto)

**Metas de rendimiento**: registrar una compra de 5 productos en menos de 3 minutos (SC-001);
identificar los bajo mínimo en menos de 30 s (SC-007); guardar una compra en menos de 1 s con el
volumen de demostración

**Restricciones**: nada se edita ni se borra; el stock solo cambia con `registrarMovimiento`; montos
calculados por el servidor; todo o nada por documento; nombres en español

**Escala**: decenas de compras por mes; histórico simulado de 36 meses (F-007); unos cientos de
movimientos por producto

## Verificación contra la constitución

*Puerta: debe pasar antes de la investigación y otra vez después del diseño.*

| # | Principio | Cómo lo cumple este plan | Antes | Después del diseño |
|---|---|---|---|---|
| I | Explicabilidad | "Bloqueo la fila, leo, verifico, escribo" en una función corta; anulación en tres pasos; sin librerías nuevas; decisiones K-01 a K-12 en `docs/decisiones.md` | ✅ | ✅ |
| II | Lógica en la aplicación | RN-20 a RN-26 y RN-50 a RN-53 en `src/servicios/compras.ts` e `inventario.ts`; la base respalda con CHECK, FK e índice parcial; el único SQL crudo es el `SELECT … FOR UPDATE` parametrizado, que Prisma no ofrece | ✅ | ✅ |
| III | Kardex como única fuente | `registrarMovimiento` es la única escritura de `stockActual`, en la misma transacción y con bloqueo de fila; verificación de consistencia a pedido; prueba que busca otras escrituras | ✅ | ✅ |
| IV | Documentos inmutables | Sin editar ni borrar compras; anulación con motivo y movimientos inversos; compra, líneas y movimientos en una transacción | ✅ | ✅ |
| V | Baja lógica | Selectores con proveedores y productos activos; compras y kardex siguen mostrando catálogos inactivos | ✅ | ✅ |
| VI | Validación en dos lugares | `esquemaCompra` y `esquemaAnulacion` en formulario y acción; subtotal y total fuera del esquema y calculados por el servidor | ✅ | ✅ |
| VII | Seguridad básica | `requerirSesion()` en cada página y acción, también en la verificación de factura; consultas parametrizadas | ✅ | ✅ |
| VIII | IA transparente | No aplica; deja el kardex por `fecha_documento` listo para la serie mensual de F-007 | ✅ | ✅ |
| IX | Pruebas donde duele | Stock y no negatividad, concurrencia, factura duplicada, todo o nada, anulaciones y consistencia ([quickstart §2](quickstart.md#2-pruebas-automatizadas)) | ✅ | ✅ |
| X | Idioma y nombres | `registrarCompra`, `anularCompra`, `registrarMovimiento`, `/existencias`, `/kardex` | ✅ | ✅ |
| XI | Alcance cerrado | Sin órdenes de compra, pagos, ajustes manuales ni valorización; kardex sin paginar anotado en `docs/trabajo-futuro.md` | ✅ | ✅ |

**Resultado:** sin violaciones.

## Estructura del proyecto

### Documentación (esta funcionalidad)

```text
specs/003-compras-inventario/
├── plan.md              # Este archivo
├── research.md          # Fase 0: 12 decisiones (K-01 a K-12)
├── data-model.md        # Fase 1: validaciones, cálculos, ciclo de vida, movimientos y consultas
├── quickstart.md        # Fase 1: pruebas mínimas y recorrido de 17 pasos
├── contracts/
│   └── acciones-f003.md # Rutas, Server Actions, servicios y componentes
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Código fuente (lo que agrega o cambia F-003)

```text
src/
├── lib/
│   ├── errores.ts                     # CAMBIA: erroresPorRuta() para errores de líneas (K-03)
│   └── dinero.ts                      # CAMBIA: aCentavos(), formatearCentavos() (K-04)
├── esquemas/
│   ├── comunes.ts                     # CAMBIA: montoPositivo, fechaNoFutura, esquemaRangoFechas
│   ├── catalogos/proveedor-producto.ts# CAMBIA: usa montoPositivo (mismas reglas)
│   ├── compras.ts                     # NUEVO: esquemaCompra, esquemaAnulacion, filtros, verificación de factura
│   └── inventario.ts                  # NUEVO: filtros de existencias y kardex
├── servicios/
│   ├── inventario.ts                  # NUEVO: bloquearProductos, registrarMovimiento, existencias, kardex, consistencia
│   └── compras.ts                     # NUEVO: registrarCompra, anularCompra, buscarFacturaVigente, obtener, listar
├── componentes/ui/paginacion.tsx      # NUEVO: extraído de sesiones (F-001)
└── app/(sistema)/
    ├── layout.tsx, page.tsx           # CAMBIAN: Compras y Existencias en el menú y el inicio
    ├── sesiones/page.tsx              # CAMBIA: usa Paginacion
    ├── productos/[id]/page.tsx        # CAMBIA: enlace "Ver kardex"
    ├── compras/                       # page, nueva/, [id]/ (anular-compra), acciones.ts, formulario, filtros
    ├── existencias/                   # page, verificacion/, filtros
    └── kardex/[productoId]/           # page, filtro de fechas
tests/
├── ayudantes/catalogos.ts             # CAMBIA: crearMovimientoDePrueba usa registrarCompra; nuevo crearSalidaDePrueba
├── unitarios/                         # esquema de compra, centavos, errores por ruta, filtros
└── integracion/                       # registro, anulación, concurrencia, kardex, existencias, consistencia, sin escrituras de stock
```

**Decisión de estructura:** la de F-001 y F-002. `inventario.ts` queda separado de `compras.ts`
porque F-005 lo usa igual para las distribuciones.

## Fases de este comando

| Fase | Artefacto | Estado |
|---|---|---|
| 0 · Investigación | [research.md](research.md): bloqueo del stock, anulación, formulario de líneas, montos, aviso de factura, fechas, existencias, kardex y consistencia, listado, pantallas, orden de registro, concurrencia | ✅ Sin pendientes |
| 1 · Diseño | [data-model.md](data-model.md): sin cambios de esquema | ✅ |
| 1 · Contratos | [contracts/acciones-f003.md](contracts/acciones-f003.md) | ✅ |
| 1 · Validación | [quickstart.md](quickstart.md) | ✅ |
| 2 · Tareas | `tasks.md` | Pendiente: `/speckit-tasks` |

## Cambios que este plan introduce en otros documentos y código existente

- **Esquema de base de datos:** ninguno.
- `specs/003-compras-inventario/spec.md`: FR-017 y FR-018 separados (estaban en la misma línea) y
  **límite de cantidad** por línea de 1 000 000 en FR-002 y en los casos borde, para que el stock no
  desborde su columna entera.
- `specs/001-acceso-personal/contracts/rutas.md`: ruta `/existencias/verificacion`.
- `src/esquemas/catalogos/proveedor-producto.ts`: el precio referencial se arma con `montoPositivo`,
  con las mismas reglas y mensajes (sus pruebas deben seguir en verde).
- `src/app/(sistema)/sesiones/page.tsx`: la paginación pasa a `src/componentes/ui/paginacion.tsx`.
- `tests/ayudantes/catalogos.ts`: `crearMovimientoDePrueba` deja de escribir el stock a mano.
- `docs/trabajo-futuro.md`: paginación del kardex, verificación encadenada de saldos en pantalla y
  ajustes manuales de inventario (P3).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Interbloqueos o esperas largas con compras y anulaciones simultáneas | Bloqueo en orden de `id`; pruebas de concurrencia con productos en orden inverso (K-12) |
| El formulario de líneas es el componente de cliente más grande del sistema | Estado simple (arreglo de líneas), mismo esquema Zod, errores por ruta; se prueba primero la lógica pura (centavos, errores) |
| Fechas de tipo `date` corridas un día por zona horaria | Se tratan como texto `AAAA-MM-DD` y medianoche UTC (K-06); prueba unitaria de `fechaNoFutura` a las 21:30 y a las 00:30 de La Paz, y prueba de integración de que la fecha se guarda y se lee igual |
| F-005 necesita reglas de salida que F-003 no ejercita en pantalla | `registrarMovimiento` ya rechaza saldos negativos y se prueba con salidas insertadas por un ayudante |
| El día 16/09 no alcanza para todo | Orden de corte: primero la Historia 5 (anulación, P2); las Historias 1 a 4 son imprescindibles para F-004 y F-005 |

## Seguimiento de complejidad

Sin violaciones de la constitución que justificar.
