# Plan de implementación: F-006 · Reportes

**Rama**: `006-reportes` (se trabaja en `main`) | **Fecha**: 2026-09-15 | **Especificación**: [spec.md](spec.md)

**Entrada**: especificación de `specs/006-reportes/spec.md`, con la aclaración del 13/09 (la marca de datos
simulados vale para toda la base).

## Resumen

F-006 agrega cinco reportes de **solo consulta** sobre los datos de F-001 a F-005: compras (R-1),
distribuciones (R-2), existencias (R-3), kardex (R-4) y pedidos (R-5). Cada uno tiene sus filtros —rango de
fechas por defecto del mes en curso, catálogos con inactivos incluidos y la opción de incluir anulados—,
muestra sus totales y se imprime con un encabezado que dice qué reporte es, con qué filtros, cuándo se
emitió y quién lo emitió.

**Enfoque técnico:** reutiliza la arquitectura de F-001 a F-005, **sin migraciones ni dependencias nuevas**.
Un servicio `reportes.ts` con una función por reporte (E-01), que reutiliza `listarExistencias` y
`obtenerKardex` de F-003 y consulta directo en los otros tres; los totales se calculan con agregados sobre
todo el rango y **solo con documentos vigentes** (E-02, E-03). La pantalla pagina de 100 en 100 y la vista de
impresión trae todas las filas (E-04), en el grupo de rutas `(impresion)` que ya existe desde el vale
(E-05). El encabezado y la tabla de impresión son componentes compartidos (E-06) y la leyenda de datos
simulados sale de la fila única de `configuracion`, que escribe F-007 (E-07).

## Contexto técnico

**Lenguaje/Versión**: TypeScript 5.9.3 estricto sobre Node.js 22 LTS (sin cambios)

**Dependencias principales**: las de F-001, **sin dependencias nuevas** (la impresión y el PDF los hace el
navegador)

**Almacenamiento**: PostgreSQL 16, solo lectura; **sin migraciones nuevas**. Índices existentes:
`compra(fecha)`, `distribucion(fecha)`, `pedido(estado, fecha)` y `movimiento_inventario(producto_id,
fecha_documento)`

**Pruebas**: Vitest, unitarias (esquemas de filtros y texto del encabezado) e integración contra PostgreSQL
real, comparando cada total con la suma esperada (research E-12)

**Plataforma**: la de F-001 (servidor Node.js local, Chrome o Edge, pantallas chicas) más la impresión en A4

**Tipo de proyecto**: aplicación web full-stack (un solo proyecto)

**Metas de rendimiento**: cualquier reporte de un año completo del histórico simulado en menos de 5 s
(SC-005); generar e imprimir un reporte en menos de 1 minuto (SC-004)

**Restricciones**: los reportes no modifican nada (FR-005); los totales cuentan solo documentos vigentes
(FR-003); las fechas filtran por fecha del documento (RN-53); nombres y mensajes en español

**Escala**: 36 meses simulados, unos 25 productos, 5 representantes; un reporte anual de distribuciones puede
traer algunos miles de líneas

## Verificación contra la constitución

*Puerta: debe pasar antes de la investigación y otra vez después del diseño.*

| # | Principio | Cómo lo cumple este plan | Antes | Después del diseño |
|---|---|---|---|---|
| I | Explicabilidad | Una función por reporte con su consulta a la vista, sin generador genérico; decisiones E-01 a E-12 en `docs/decisiones.md` | ✅ | ✅ |
| II | Lógica en la aplicación | Filtros y totales en `src/servicios/reportes.ts`; consultas de Prisma, sin SQL crudo ni vistas | ✅ | ✅ |
| III | Kardex como única fuente | R-3 y R-4 leen las mismas funciones de F-003; ningún reporte escribe stock ni movimientos (se verifica leyendo el código) | ✅ | ✅ |
| IV | Documentos inmutables | Los reportes solo leen; los anulados se muestran marcados y nunca suman | ✅ | ✅ |
| V | Baja lógica | Los filtros ofrecen también proveedores, representantes y productos inactivos, porque su histórico sigue (FR-004) | ✅ | ✅ |
| VI | Validación en dos lugares | Un esquema Zod por reporte, usado por el formulario de filtros y por la página (E-08) | ✅ | ✅ |
| VII | Seguridad básica | `requerirSesion()` en cada página, incluidas las de impresión; consultas parametrizadas | ✅ | ✅ |
| VIII | IA transparente | La leyenda "Datos simulados con fines de demostración" se muestra en pantalla y en la hoja cuando la base está marcada (D-07); F-006 solo lee la marca | ✅ | ✅ |
| IX | Pruebas donde duele | SC-001, SC-002 y SC-003 son comparaciones numéricas probadas por reporte; más la prueba de que los reportes no escriben ([quickstart §2](quickstart.md#2-pruebas-automatizadas)) | ✅ | ✅ |
| X | Idioma y nombres | `reporteCompras`, `reporteExistencias`, `textoDeFiltros`, `/reportes` | ✅ | ✅ |
| XI | Alcance cerrado | Sin exportar a Excel ni PDF propio, sin gráficos ni reportes programados; R-4 y R-5 son P3 y primeros en el orden de corte | ✅ | ✅ |

**Resultado:** sin violaciones.

## Estructura del proyecto

### Documentación (esta funcionalidad)

```text
specs/006-reportes/
├── plan.md                    # Este archivo
├── research.md                # Fase 0: 12 decisiones (E-01 a E-12)
├── data-model.md              # Fase 1: filtros, filas, totales y encabezado de cada reporte
├── quickstart.md              # Fase 1: pruebas mínimas y recorrido de 14 pasos
├── contracts/
│   └── acciones-f006.md       # Rutas, servicios, esquemas y componentes (sin Server Actions)
├── checklists/
│   └── requirements.md
└── tasks.md                   # Fase 2 (/speckit-tasks)
```

### Código fuente (lo que agrega o cambia F-006)

```text
src/
├── esquemas/reportes.ts                       # NUEVO: un esquema de filtros por reporte y textoDeFiltros
├── servicios/
│   ├── reportes.ts                            # NUEVO: las cinco consultas con sus totales
│   └── configuracion.ts                       # NUEVO: lee la marca de datos simulados
├── componentes/
│   ├── reportes/encabezado-reporte.tsx        # NUEVO: encabezado común (pantalla e impresión)
│   ├── reportes/tabla-reporte.tsx             # NUEVO: tabla sin overflow, encabezado repetido por hoja
│   └── ui/boton-imprimir.tsx                  # NUEVO: movido desde el vale de F-005
└── app/
    ├── (sistema)/
    │   ├── layout.tsx, page.tsx               # CAMBIAN: Reportes en el menú, el inicio y la banda de demostración
    │   └── reportes/                          # índice y una carpeta por reporte (página + filtros)
    └── (impresion)/
        ├── distribuciones/[id]/vale/          # CAMBIA: usa el botón compartido
        └── reportes/                          # NUEVO: una carpeta imprimir/ por reporte
tests/
├── unitarios/                                 # esquemas de filtros y texto del encabezado
└── integracion/                               # un archivo por reporte más invariantes
```

**Decisión de estructura:** la de F-001 a F-005; el grupo `(impresion)` se amplía con los reportes.

## Fases de este comando

| Fase | Artefacto | Estado |
|---|---|---|
| 0 · Investigación | [research.md](research.md): servicio por reporte, totales, anulados, paginación, rutas, encabezado, marca de demostración, filtros, filas, botón, navegación y pruebas | ✅ Sin pendientes |
| 1 · Diseño | [data-model.md](data-model.md): sin cambios de esquema | ✅ |
| 1 · Contratos | [contracts/acciones-f006.md](contracts/acciones-f006.md) | ✅ |
| 1 · Validación | [quickstart.md](quickstart.md) | ✅ |
| 2 · Tareas | `tasks.md` | Pendiente: `/speckit-tasks` |

## Cambios que este plan introduce en otros documentos y código existente

- **Esquema de base de datos:** ninguno.
- `specs/001-acceso-personal/contracts/rutas.md`: sumar `/reportes` (índice) y las rutas
  `/reportes/{reporte}/imprimir` a las ya reservadas.
- `src/app/(impresion)/distribuciones/[id]/vale/`: usa `componentes/ui/boton-imprimir.tsx` en lugar de su
  copia local (research E-10); su prueba de recorrido no cambia.
- `src/app/(sistema)/layout.tsx`: menú con **Reportes** y banda "Datos simulados con fines de demostración"
  cuando la base está marcada (aclaración del 13/09).
- `docs/trabajo-futuro.md`: sección F-006 con los fuera de alcance (Excel, PDF propio, gráficos, reportes
  programados o por correo, reportes por centro de salud).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Un reporte anual de distribuciones tarda o consume memoria | Totales con agregados en la base, pantalla paginada de 100 en 100 y filtros por índices existentes; se mide en el recorrido con el histórico simulado (SC-005) |
| El encabezado de columnas no se repite entre hojas | Tabla de impresión sin contenedor con `overflow` (E-06); se comprueba en la vista previa de impresión |
| Los totales cambian si alguien anula un documento entre dos emisiones | Es lo esperado (caso borde de la especificación): la fecha y hora de emisión impresa distingue las versiones |
| La leyenda de datos simulados no se ve hasta que exista F-007 | `configuracion.modoDemostracion` se enciende a mano en las pruebas y en el recorrido |
| F-006 es P2 y F-007 depende del tiempo restante | Orden de corte: primero R-5, después R-4 (P3); R-1 a R-3 y la impresión son P2 |

## Seguimiento de complejidad

Sin violaciones de la constitución que justificar.
