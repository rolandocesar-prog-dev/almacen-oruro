# Contrato de rutas, servicios y componentes · F-006

**Plan**: [../plan.md](../plan.md) · **Especificación**: [../spec.md](../spec.md) · **Convenciones
comunes**: [F-001](../../001-acceso-personal/contracts/acciones-f001.md) y
[F-005](../../005-distribucion/contracts/acciones-f005.md).

**F-006 no tiene Server Actions**: los reportes solo consultan (FR-005). Los filtros viajan por la URL
(método GET), como en todos los listados del sistema, y cada página los valida con Zod.

---

## 1. Rutas

| Ruta | Archivo | Página | Parámetros (validados con Zod) |
|---|---|---|---|
| `/reportes` | `src/app/(sistema)/reportes/page.tsx` | Índice con los cinco reportes | — |
| `/reportes/compras` | `src/app/(sistema)/reportes/compras/page.tsx` | R-1 en pantalla | `desde`, `hasta`, `proveedor`, `incluirAnulados`, `pagina` |
| `/reportes/distribuciones` | `…/reportes/distribuciones/page.tsx` | R-2 | `desde`, `hasta`, `representante`, `producto`, `incluirAnulados`, `pagina` |
| `/reportes/existencias` | `…/reportes/existencias/page.tsx` | R-3 | `categoria`, `soloBajoMinimo` |
| `/reportes/kardex` | `…/reportes/kardex/page.tsx` | R-4 | `producto` (obligatorio), `desde`, `hasta` |
| `/reportes/pedidos` | `…/reportes/pedidos/page.tsx` | R-5 | `desde`, `hasta`, `estado`, `representante`, `incluirAnulados`, `pagina` |
| `/reportes/{reporte}/imprimir` | `src/app/(impresion)/reportes/{reporte}/imprimir/page.tsx` | El mismo reporte sin menú, con todas las filas | los mismos, sin `pagina` |

Todas protegidas con `requerirSesion()` (el layout `(impresion)` también). Cambios en páginas existentes:
menú (**Reportes** después de Distribuciones) e inicio (acceso). `/reportes` es nueva respecto de las rutas
reservadas en F-001, que ya incluían las cinco de detalle.

---

## 2. Servicios · `src/servicios/reportes.ts`

Todas son funciones de **solo lectura** y devuelven también los totales del rango completo (research E-02).

| Función | Parámetros | Devuelve |
|---|---|---|
| `reporteCompras(filtro)` | `{ desde, hasta, proveedorId?, incluirAnulados, pagina?, todas? }` | `{ filas, total, totales: { totalGastado, compras } }` |
| `reporteDistribuciones(filtro)` | `{ desde, hasta, representanteId?, productoId?, incluirAnulados, pagina?, todas? }` | `{ filas, total, totales: { porProducto } }` |
| `reporteExistencias(filtro)` | `{ categoriaId?, soloBajoMinimo }` | `{ grupos, totales: { productos, bajoMinimo } }` |
| `reporteKardex(productoId, { desde, hasta })` | id y rango | `{ producto, movimientos, saldoInicial, saldoFinal } \| null` |
| `reportePedidos(filtro)` | `{ desde, hasta, estado, representanteId?, incluirAnulados, pagina?, todas? }` | `{ filas, total, totales: { porEstado } }` |
| `FILAS_POR_PAGINA_REPORTE` | — | `100` |

`todas: true` (que usan las páginas de impresión) devuelve todas las filas del rango sin paginar (E-04).

## 3. Servicio · `src/servicios/configuracion.ts`

| Función | Devuelve | Notas |
|---|---|---|
| `obtenerConfiguracion()` | `{ modoDemostracion, datosSimuladosEn }` | lee la fila única `configuracion` (id 1); si no existe, `modoDemostracion: false`. F-006 solo lee; F-007 escribe (research E-07) |

## 4. Esquemas · `src/esquemas/reportes.ts`

`esquemaReporteCompras`, `esquemaReporteDistribuciones`, `esquemaReporteExistencias`,
`esquemaReporteKardex`, `esquemaReportePedidos`, el ayudante `textoDeFiltros(partes)` para el encabezado y
los tipos `FiltroReporteCompras`, `FiltroReporteDistribuciones`, `FiltroReporteExistencias`,
`FiltroReporteKardex` y `FiltroReportePedidos`.

---

## 5. Componentes

| Componente | Tipo | Uso |
|---|---|---|
| `componentes/reportes/encabezado-reporte.tsx` | servidor | nombre del sistema, del reporte, filtros aplicados, emisión, usuario y leyenda de demostración (FR-006, FR-007) |
| `componentes/reportes/tabla-reporte.tsx` | servidor | tabla de impresión sin `overflow`, para que el encabezado se repita en cada hoja |
| `componentes/ui/boton-imprimir.tsx` | cliente | `window.print()`; se mueve desde el vale de F-005 (research E-10) |
| `reportes/compras/filtros-compras.tsx` y sus pares por reporte | cliente | filtros con su esquema Zod (uno por reporte, I-07) |
