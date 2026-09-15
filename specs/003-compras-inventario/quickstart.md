# Guía de validación · F-003 Compras e inventario

**Plan**: [plan.md](plan.md) · **Especificación**: [spec.md](spec.md)

## 1. Requisitos previos

El entorno de F-001 y F-002: Docker Desktop abierto, `docker compose up -d`, migraciones aplicadas y
semilla cargada ([F-001 quickstart §2](../001-acceso-personal/quickstart.md#2-preparación-una-sola-vez)).
F-003 **no agrega migraciones**. Para el recorrido manual hacen falta al menos 2 proveedores activos,
3 productos activos (uno con stock mínimo 5) y un proveedor y un producto inactivos (F-002).

## 2. Pruebas automatizadas

```bash
npm test
```

**Resultado esperado:** todas en verde, incluidas las de F-001 y F-002. Pruebas mínimas de F-003:

| Regla | Tipo | Requisito |
|---|---|---|
| `esquemaCompra`: factura solo dígitos, fecha no futura, al menos una línea, cantidad 1 a 1 000 000, precio con coma y 2 decimales, producto repetido con número de línea, total máximo, sin campos `subtotal` ni `total` | unitaria | FR-001 a FR-003 |
| `aCentavos` y `formatearCentavos`: 10 × 12,50 + 4 × 30,00 = Bs 245,00 sin errores de coma flotante | unitaria | FR-003 |
| `erroresPorRuta`: "lineas.1.cantidad" | unitaria | FR-007 |
| Registrar compra de 3 productos: stock, 3 `ENTRADA_COMPRA`, saldos, total calculado aunque lleguen otros valores | integración | FR-003, FR-005, SC-005 |
| Factura duplicada del mismo proveedor rechazada sin cambiar stock; de otro proveedor aceptada; libre tras anular | integración | FR-004, SC-003 |
| Falla a mitad de la transacción, después del primer movimiento (stock del segundo producto forzado al máximo de la columna): no queda cabecera, línea ni movimiento | integración | FR-005, SC-004 |
| Proveedor o producto inactivos rechazados | integración | RN-14 |
| Anular: `ANULACION_COMPRA` con cantidad negativa y fecha del documento anulado; stock vuelve al valor previo | integración | FR-012, FR-022 |
| Anular con stock insuficiente en una de varias líneas: nada cambia y el mensaje lista cada faltante | integración | FR-013, RN-25 |
| Anular dos veces y motivo vacío | integración y unitaria | FR-011, FR-014 |
| Concurrencia: 10 compras simultáneas, factura duplicada simultánea, productos en orden inverso, anulación doble | integración | FR-016, SC-006, research K-12 |
| `verificarConsistenciaInventario` informa 0 diferencias tras compras y anulaciones, y detecta una diferencia provocada a mano | integración | FR-020, SC-002 |
| RN-51: cada saldo = saldo anterior + cantidad en orden de `id` | integración | FR-017 |
| Kardex con rango: saldo anterior y final por fecha del documento; compra con fecha pasada aparece después en orden de registro | integración | FR-019, RN-53 |
| Existencias: orden bajo mínimo primero, stock = mínimo es bajo mínimo, inactivo con stock visible por defecto, inactivos no cuentan | integración | FR-018, RN-52 |
| Ningún archivo de `src/` fuera de `inventario.ts` escribe `stockActual`; no hay funciones para editar ni borrar compras o movimientos | integración | FR-010, FR-015 |

## 3. Recorrido de validación manual

Con la aplicación en marcha (`npm run dev`) y una sesión iniciada.

| # | Acción | Resultado esperado | Spec |
|---|---|---|---|
| 1 | Abrir **Compras → Registrar compra** | El proveedor y el producto inactivos no aparecen para elegir | H1 · E9 |
| 2 | Proveedor A, factura 1234, fecha de hoy; líneas 10 × 12,50 y 4 × 30,00 | La vista previa muestra Bs 125,00, Bs 120,00 y total Bs 245,00 | H1 · E2 |
| 3 | Agregar un tercer producto y guardar | Ficha REGISTRADA con 3 líneas y total calculado; el stock de cada producto sube | H1 · E1 |
| 4 | Abrir **Existencias** | Los bajo mínimo arriba y resaltados; el encabezado los cuenta | H2 · E1 a E3 |
| 5 | Elegir un producto de la compra | Kardex con `Entrada por compra`, "Factura 1234 · A" enlazado y saldo igual al stock actual | H3 · E1, E2, E5 |
| 6 | Nueva compra: proveedor A, escribir 1234 y salir del campo | "La factura 1234 ya está registrada para este proveedor" antes de cargar productos | H1 · E3 |
| 7 | Cambiar al proveedor B con la misma factura | El aviso desaparece y la compra se puede guardar | H1 · E4 |
| 8 | Nueva compra con una línea de cantidad 0 y otra de precio 12,505 | "Línea 1: …" y "Línea 2: …" junto a cada campo; lo escrito se conserva | H1 · E5, FR-007 |
| 9 | Agregar dos veces el mismo producto | "Línea 2: el producto ya está en la línea 1; modifica su cantidad" | H1 · E6 |
| 10 | Guardar sin líneas y con fecha de mañana | "Agrega al menos un producto" y "La fecha de la compra no puede ser futura" | H1 · E7, E8 |
| 11 | En **Compras**, filtrar por proveedor A, estado y factura "12" | Solo las compras que cumplen; la ficha no ofrece editar ni borrar | H4 · E1 a E4 |
| 12 | Anular la compra del paso 3 sin motivo | "Escribe el motivo de la anulación" | H5 · E3 |
| 13 | Anularla con motivo "Cantidades mal cargadas" | ANULADA con motivo, quién y cuándo; `Anulación de compra` en el kardex con la fecha de la factura; stock como antes | H5 · E1, H3 · E8 |
| 14 | Intentar anularla otra vez y registrar de nuevo la factura 1234 del proveedor A | No se ofrece anular; la nueva compra se acepta | H5 · E4, E5 |
| 15 | Kardex con rango de fechas | Saldo anterior y saldo final por fecha del documento | H3 · E4 |
| 16 | **Existencias → Verificar consistencia** | "El inventario es consistente…" con la cantidad de productos revisados | H3 · E6 |
| 17 | Existencias con filtro "Inactivos" y búsqueda "LAVANDÍNA" | Aparecen los inactivos, también sin stock; la búsqueda ignora tildes | H2 · E4, E6 |

Los escenarios que necesitan distribuciones (H3 · E7 con una distribución real, H5 · E2 con stock ya
distribuido) se prueban con movimientos de salida insertados por `registrarMovimiento` en las pruebas
de integración, y se recorren en pantalla cuando exista F-005.

## 4. Estado de la validación (15/09/2026)

| Qué | Estado | Cómo se verificó |
|---|---|---|
| Pruebas automatizadas (§2) | ✅ | 289 pruebas en verde en 40 archivos (198 de F-001 y F-002, 91 de F-003), más `lint`, `typecheck` y `build` sin errores. Incluyen concurrencia real: 10 compras simultáneas, factura duplicada simultánea, productos en orden inverso, anulación doble y anulación contra salida |
| Pasos 1, 3, 4, 5, 11, 13, 15, 16 y 17 | ✅ | Páginas pedidas con una sesión de prueba contra la base de pruebas, con datos cargados por los esquemas y servicios reales (método de `docs/decisiones.md`, I-15): proveedor y producto inactivos fuera del formulario; ficha con Bs 125,00, Bs 120,00, Bs 75,00 y total Bs 320,00, "Anular compra" y sin editar ni borrar; existencias con "3 productos · 1 bajo mínimo" y el bajo mínimo arriba; kardex con "Factura 1234 · Distribuidora Andina" y stock 10; filtros por proveedor, factura "12" y estado; compra anulada con motivo y sin opción de anular; kardex con "Anulación de compra"; saldos del rango y aviso de rango invertido; "El inventario es consistente…" con 4 productos; inactivos y búsqueda "LAVANDÍNA"; id inexistente → 404; sin sesión → `/ingreso` |
| Pasos 2, 6 a 10, 12 y 14: vista previa, aviso de factura al salir del campo, errores por línea, anulación sin motivo y registro de la factura liberada | ✅ por pruebas · ⏳ en pantalla | Cada regla y mensaje está comprobado en las pruebas unitarias e integración; falta verlos en el navegador con una sesión real, porque exigen escribir en el formulario |
| T038 (375 px, accesibilidad) | ✅ revisión de código · ⏳ visual | Etiquetas en cada campo de cada línea dentro de un `<fieldset>` "Línea n", errores con `aria-describedby`, tablas con desplazamiento propio y bajo mínimo resaltado con texto además de color; falta mirarlo en un teléfono |
| SC-001 (compra de 5 productos en menos de 3 min) | ⏳ | Se mide en el recorrido manual con Raymond |
| SC-007 (bajo mínimo en menos de 30 s) | ✅ parte del sistema · ⏳ persona | Existencias respondió en unos 140 ms con los bajo mínimo arriba y contados en el encabezado |
| H3 · E7 y H5 · E2 (con distribuciones) | ✅ por pruebas | Salidas registradas con `registrarMovimiento` en las pruebas; en pantalla, cuando exista F-005 |
