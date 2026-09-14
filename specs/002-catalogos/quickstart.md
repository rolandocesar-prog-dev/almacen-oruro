# Guía de validación · F-002 Catálogos

**Plan**: [plan.md](plan.md) · **Especificación**: [spec.md](spec.md)

## 1. Requisitos previos

El entorno de F-001 ya preparado: Docker Desktop abierto, `docker compose up -d`, migraciones
aplicadas y semilla cargada ([F-001 quickstart §2](../001-acceso-personal/quickstart.md#2-preparación-una-sola-vez)).
F-002 **no agrega migraciones**.

## 2. Pruebas automatizadas

```bash
npm test
```

**Resultado esperado:** todas en verde, incluidas las de F-001. Pruebas mínimas de F-002:

| Regla | Tipo | Requisito |
|---|---|---|
| `paraBuscar` y `coincideBusqueda`: "lavandína" encuentra "Lavandina"; "LAVA" encuentra "lavandina" | unitaria | FR-007 |
| Esquemas de los 7 catálogos: largos, formatos de código, NIT, CI, correo, stock mínimo y precio con coma | unitaria | FR-009 a FR-025 |
| Duplicados normalizados en los 8 campos o pares únicos, con aviso y enlace si el existente está inactivo | integración | FR-004, FR-005, SC-002 |
| El registro de un producto ignora cualquier `stockActual` enviado y empieza en 0; modificarlo no cambia el stock | integración | FR-013, FR-014, SC-005 |
| RN-13: categoría y unidad con productos activos; centro con representantes activos; representante con pedidos por atender; producto con saldo pendiente | integración | FR-011, FR-016, FR-023 |
| RN-16: cambiar la unidad de un producto con movimientos se rechaza; sin movimientos se permite | integración | FR-015 |
| RN-17: reactivar producto con categoría o unidad inactiva; representante con centro inactivo | integración | FR-024 |
| Selectores: solo activos, más el actual si está inactivo | integración | FR-003, SC-004 |
| Proveedor–producto: par único, precio opcional > 0, reactivación con proveedor y producto activos | integración | FR-025, FR-026 |
| No existe ninguna función de borrado en `src/servicios/catalogos/` | integración | FR-002 |

## 3. Recorrido de validación manual

Con la aplicación en marcha (`npm run dev`) y una sesión iniciada.

| # | Acción | Resultado esperado | Spec |
|---|---|---|---|
| 1 | Registrar la categoría "Desinfectantes" y la unidad "Bidón 5 L" (BID5) | Quedan activas | H1 · E1, E5 |
| 2 | Registrar la categoría " desinfectantes " | "Ya existe una categoría con el nombre 'Desinfectantes'" | H1 · E2 |
| 3 | Registrar el producto `lim-001` "Lavandina 1 L" con esa categoría, esa unidad y mínimo 10 | Queda activo con código `LIM-001` y stock 0 | H2 · E1 |
| 4 | Registrar otro producto con código `LIM-001` y otro con nombre " lavandina  1 l " | Mensajes de duplicado de código y de nombre | H2 · E2, E3 |
| 5 | Editar el producto | El stock actual se ve pero no se puede editar | H2 · E4 |
| 6 | Intentar desactivar la categoría "Desinfectantes" | "No se puede desactivar: 1 producto activo usa esta categoría" | H1 · E3 |
| 7 | Registrar el proveedor con NIT `10203-04` | "El NIT solo admite dígitos" | H3 · E2 |
| 8 | Registrar "Distribuidora Andina" con NIT `1020304050` y correo `ventas@` | Error de correo; con `ventas@andina.bo` se registra | H3 · E1, E4 |
| 9 | Registrar otro proveedor con NIT `1020304050` | "Ya existe un proveedor con el NIT '1020304050'" | H3 · E3 |
| 10 | Desactivar ese proveedor y registrar otro con el mismo NIT | Aviso de proveedor inactivo con enlace "Ver y reactivar" | Caso borde |
| 11 | Registrar el centro "Hospital General Oruro" y luego un representante | El centro aparece preseleccionado | H4 · E1, E2, E3 |
| 12 | Registrar otro representante con el mismo CI | "Ya existe un representante con el CI '…'" | H4 · E4 |
| 13 | Intentar desactivar el centro | "No se puede desactivar: 1 representante activo pertenece a este centro" | H4 · E5 |
| 14 | En `/productos`, buscar "lava", "LAVANDÍNA" y "xyz" | Aparece el producto en los dos primeros; "No hay resultados para 'xyz'" en el tercero | H5 · E1, E3 |
| 15 | Filtrar productos por categoría y alternar estado activos/inactivos/todos | Solo los que cumplen | H5 · E2, E4 |
| 16 | En la ficha del proveedor, asociar "Lavandina 1 L" con precio `12,50` | Aparece con "Bs 12,50"; la ficha del producto muestra el proveedor | H6 · E1, E5 |
| 17 | Asociar otra vez el mismo producto y probar precio `0` | "Este proveedor ya ofrece 'Lavandina 1 L'" y error de precio | H6 · E2, E3 |
| 18 | Revisar el menú en una pantalla de 375 px | Los enlaces de catálogos pasan a varias líneas sin desplazamiento horizontal | Constitución (interfaz) |

Los escenarios que dependen de pedidos o movimientos (H2 · E6, E8; H4 · E8) se validan con las pruebas
de integración hasta que existan F-003 a F-005.

## 4. Estado de la validación (14/09/2026)

| Qué | Estado | Cómo se verificó |
|---|---|---|
| Pruebas automatizadas (§2) | ✅ | 198 pruebas en verde en 27 archivos (77 de F-001 y 121 de F-002), más `lint`, `typecheck` y `build` sin errores |
| Pasos 1, 3, 5, 8, 11 (centro preseleccionado), 13, 14, 15 y 16 | ✅ | Páginas pedidas con una sesión de prueba contra la base de pruebas, con los datos del recorrido cargados por los esquemas y servicios reales: listados, fichas, stock de solo lectura sin campo `stockActual`, insignia "Bajo mínimo", búsqueda "lava" y "LAVANDÍNA", "No hay resultados para 'xyz'" con "Limpiar búsqueda", filtros inválidos en la URL, "Bs 12,50" en las dos fichas, id inexistente → 404 y sin sesión → `/ingreso` |
| Pasos 2, 4, 6, 7, 9, 10, 12, 13 (mensaje) y 17: mensajes al enviar formularios y al desactivar | ✅ por pruebas · ⏳ en pantalla | Cada mensaje está comprobado con su texto exacto en las pruebas unitarias y de integración; falta verlos en el navegador con una sesión real |
| Paso 18 y T044 (375 px, accesibilidad) | ✅ revisión de código · ⏳ visual | Etiquetas en todos los campos y selectores, tablas con desplazamiento propio, menú y filtros con `flex-wrap`; falta mirarlo en un teléfono o con el navegador en 375 px |
| SC-001 (registrar un producto en menos de 1 minuto) | ⏳ | Se mide en el recorrido manual con Raymond |
| SC-006 (encontrar un registro en menos de 10 s) | ✅ parte del sistema · ⏳ persona | La búsqueda respondió en unos 100 ms; el tiempo de la persona se mide en el recorrido manual |
| H2 · E6, E8 y H4 · E8 (pedidos y movimientos) | ✅ | Pruebas de integración con pedidos y movimientos de prueba (research C-11) |
