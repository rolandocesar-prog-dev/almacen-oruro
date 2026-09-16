# Guía de validación · F-006 Reportes

**Plan**: [plan.md](plan.md) · **Especificación**: [spec.md](spec.md)

## 1. Requisitos previos

El entorno de F-001 a F-005: Docker Desktop abierto, `docker compose up -d`, migraciones aplicadas y
semilla cargada ([F-001 quickstart §2](../001-acceso-personal/quickstart.md#2-preparación-una-sola-vez)).
F-006 **no agrega migraciones**. Para el recorrido hacen falta datos de dos meses:

- 2 proveedores y compras del mes en curso por 100,00, 250,50 y 49,50 vigentes y una anulada de 500,00;
  además, una compra del mes anterior;
- 2 categorías con productos sobre y bajo el mínimo, y un producto inactivo con stock;
- 2 representantes con pedidos en los cuatro estados dentro del mes en curso;
- distribuciones del mes en curso, una de ellas anulada, con "Lavandina 1 L" entregada en dos vales de 4 unidades.

## 2. Pruebas automatizadas

```bash
npm test
```

**Resultado esperado:** todas en verde, incluidas las de F-001 a F-005. Pruebas mínimas de F-006:

| Regla | Tipo | Requisito |
|---|---|---|
| Esquemas de los cinco reportes: rango por defecto (mes en curso), `desde > hasta` rechazado, ids inválidos ignorados, casillas de anulados y bajo mínimo | unitaria | FR-002, FR-003 |
| `textoDeFiltros`: "Del 01/09/2026 al 15/09/2026 · Proveedor: … · Incluye anuladas" | unitaria | FR-006 |
| R-1: filas del rango ordenadas por fecha; total gastado 400,00 con 3 compras aunque se incluya la anulada de 500,00; filtro por proveedor; compra de otro mes fuera del rango | integración | FR-009, SC-001 |
| R-2: una fila por línea entregada; total por producto "Lavandina 1 L: 10"; filtros por representante y producto combinados; la anulada aparece marcada y no suma | integración | FR-010, SC-003 |
| R-3: mismos productos e indicadores que `listarExistencias`; agrupados por categoría; "solo bajo mínimo" y filtro por categoría; sin rango de fechas | integración | FR-011 |
| R-4: saldo inicial con movimientos anteriores, movimientos del rango, saldo final igual al stock actual con rango hasta hoy; producto sin movimientos | integración | FR-012, SC-002 |
| R-5: conteo por estado (3, 2, 4 y 1); filtro ANULADO sin marcar "incluir anulados"; filtro por representante; porcentaje atendido | integración | FR-013 |
| Los reportes no escriben: el servicio no llama a `create`, `update`, `delete` ni `$executeRaw` | integración | FR-005 |
| La leyenda de demostración aparece solo si `configuracion.modoDemostracion` está encendido | integración | FR-007 |

## 3. Recorrido de validación manual

Con la aplicación en marcha (`npm run dev`) y una sesión iniciada.

| # | Acción | Resultado esperado | Spec |
|---|---|---|---|
| 1 | **Reportes** | Índice con los cinco reportes | FR-001 |
| 2 | **Reporte de compras** sin tocar filtros | Rango del día 1 del mes a hoy; compras del mes ordenadas por fecha; total gastado y Nº de compras | H1 · E1, FR-002 |
| 3 | Marcar "Incluir anuladas" | Aparece la anulada marcada ANULADA; el total sigue en 400,00 con 3 compras | H1 · E2, FR-003 |
| 4 | Filtrar por un proveedor | Solo sus compras y sus totales | H1 · E3 |
| 5 | Poner "desde" posterior a "hasta" | "La fecha «desde» no puede ser posterior a «hasta»" | Casos borde |
| 6 | **Reporte de distribuciones** | Una fila por producto entregado; resumen "Lavandina 1 L: 10 unidades" | H2 · E1, E2 |
| 7 | Filtrar por representante y producto | Solo las líneas que cumplen ambos, con totales recalculados | H2 · E3 |
| 8 | **Reporte de existencias** | Productos agrupados por categoría con indicador; sin rango de fechas; total de bajo mínimo | H3 · E1, E4 |
| 9 | Marcar "Solo bajo mínimo" y elegir una categoría | Solo esos productos y el conteo correspondiente | H3 · E2, E3 |
| 10 | **Reporte de kardex** sin elegir producto; luego con uno | "Elige un producto para ver su kardex"; después, saldo inicial, movimientos y saldo final igual al stock actual | H4 · E1 a E3 |
| 11 | **Reporte de pedidos** con "Incluir anulados" | Conteo por estado 3, 2, 4 y 1; % atendido por pedido | H5 · E1, E2 |
| 12 | Filtrar pedidos por estado ANULADO | Aparecen los anulados sin marcar "incluir anulados" | H5 · E3 |
| 13 | **Imprimir** en cualquier reporte | Vista sin menús ni botones, con nombre del sistema, nombre del reporte, filtros aplicados, fecha y hora de emisión y usuario; todas las filas y los totales al final | H6 · E1, E2 |
| 14 | Encender `modoDemostracion` en `configuracion` y recargar | "Datos simulados con fines de demostración" en el reporte y en la hoja impresa; al apagarlo, desaparece | H6 · E3, FR-007 |

## 4. Estado de la validación (15/09/2026)

| Qué | Estado | Cómo se verificó |
|---|---|---|
| Pruebas automatizadas (§2) | ✅ | 477 pruebas en verde en 68 archivos (427 de F-001 a F-005 y 50 de F-006), más `lint`, `typecheck` y `build` sin errores. Incluyen los totales al centavo de R-1, el total por producto de R-2, los mismos productos que `listarExistencias` en R-3, el saldo final igual al stock actual en R-4, el conteo por estado de R-5 y la prueba de que los reportes no escriben (conteos de todas las tablas antes y después de emitir los cinco) |
| Pasos 1 a 14 del recorrido | ✅ | Páginas pedidas con una sesión de prueba contra la base de pruebas, con dos meses de datos cargados por los servicios reales (método de `docs/decisiones.md`, I-15, I-29 e I-35): índice con los cinco reportes; R-1 con Bs 400,00 y 3 compras vigentes, que no cambian al incluir la anulada, filtro por proveedor (Bs 149,50) y aviso de rango invertido; R-2 con una fila por línea entregada y "Lavandina 1 L: 8 BID5", filtros combinados y la anulada que no suma; R-3 agrupado por categoría con "Bajo mínimo", sin rango de fechas, y "2 productos · 2 bajo mínimo" con los filtros; R-4 que pide elegir producto y luego muestra saldo inicial 5, los movimientos y saldo final 7; R-5 con "Pendientes: 4 · Parciales: 2 · Atendidos: 4 · Anulados: 1" y el filtro ANULADO sin marcar la opción; las cinco vistas de impresión con encabezado, filtros, emisión y usuario, sin menú; sin sesión → `/ingreso`; y la leyenda "Datos simulados con fines de demostración" en el reporte, en la hoja y en el sistema al encender `modo_demostracion`, que desaparece al apagarlo |
| SC-005 (reporte de un año en menos de 5 s) | ✅ (16/09) | Con el histórico de F-007 (`npm run datos:simulados -- --semilla 20260915`: 36 meses, 1864 movimientos) en la base de pruebas y el build de producción (`next start`), cada reporte se pidió 6 veces para dos años completos (septiembre de 2025 a agosto de 2026 y enero a diciembre de 2025), en pantalla y en su hoja de impresión, con y sin anulados. **El más lento fue R-2 impreso** (unas 310 líneas entregadas): mediana de 284 ms y máximo de 322 ms. R-1, R-3, R-4 y R-5 respondieron entre 38 y 100 ms, y la primera carga en frío, 241 ms. Es el tiempo hasta recibir la página completa del servidor; el dibujo en el navegador no está incluido, pero con estas tablas no se acerca a los 5 s |
| Vista previa de impresión (encabezados repetidos por hoja) y 375 px | ✅ revisión de código · ⏳ visual | Tablas de reporte sin contenedor con `overflow`, `thead { display: table-header-group }` y `tr { break-inside: avoid }` en `globals.css`, controles con `print:hidden` y filtros con etiqueta; falta mirarlo en la vista previa del navegador y en un teléfono |
| SC-004 y SC-007 (generar e imprimir en menos de 1 minuto; hoja entendible por alguien ajeno) | ⏳ | Se miden en el recorrido manual con Raymond |
