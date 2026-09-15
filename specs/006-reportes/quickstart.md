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
- distribuciones del mes en curso, una de ellas anulada, con "Lavandina 1 L" entregada 6 y 4 unidades.

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
