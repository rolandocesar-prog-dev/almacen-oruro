# Guía de validación · F-005 Distribución

**Plan**: [plan.md](plan.md) · **Especificación**: [spec.md](spec.md)

## 1. Requisitos previos

El entorno de F-001 a F-004: Docker Desktop abierto, `docker compose up -d`, migraciones aplicadas y
semilla cargada ([F-001 quickstart §2](../001-acceso-personal/quickstart.md#2-preparación-una-sola-vez)).
F-005 **no agrega migraciones**. Para el recorrido hacen falta:

- 3 productos activos: "Lavandina 1 L" con stock 6, "Jabón líquido" con stock 20 y "Trapeador" con stock 0
  (compras de F-003);
- un pedido PENDIENTE de un representante con Lavandina 10, Jabón 5 y Trapeador 2 (F-004), con fecha
  anterior a hoy;
- un segundo pedido PENDIENTE con Jabón 3, atendido en parte por una distribución REGISTRADA con el vale
  450 (Jabón 1).

## 2. Pruebas automatizadas

```bash
npm test
```

**Resultado esperado:** todas en verde, incluidas las de F-001 a F-004. Pruebas mínimas de F-005:

| Regla | Tipo | Requisito |
|---|---|---|
| `esquemaDistribucion`: vale de dígitos (con ceros a la izquierda), fecha no futura, cantidad vacía o entera de 1 a 1 000 000, al menos una línea con cantidad | unitaria | FR-001, FR-003 |
| `situacionDeLinea`: completa, sin stock, máximo = mínimo entre pendiente y stock | unitaria | FR-002, RN-36 |
| Registrar: stock baja, `SALIDA_DISTRIBUCION` con saldo y fecha de la distribución, entregado sube, estado PARCIAL o ATENDIDO | integración | FR-005, FR-007, RN-34 |
| Rechazos sin guardar nada: más que el stock, más que lo pendiente (mensaje con máximo, pendiente y stock), vale vigente, fecha anterior al pedido, pedido ATENDIDO o ANULADO, sin cantidades | integración | FR-001, FR-003, FR-004, FR-009, SC-003, SC-004, SC-007 |
| Varias entregas hasta ATENDIDO; líneas no incluidas siguen pendientes | integración | RN-33, Historia 2 |
| Anular: ANULADA, `ANULACION_DISTRIBUCION` positivo con la fecha de la distribución, stock repuesto, entregado baja, estado recalculado, pedido ANULADO sigue ANULADO, vale libre, no se anula dos veces | integración | FR-013 a FR-015, RN-35, RN-53 |
| Concurrencia: stock superado entre dos pedidos, pendiente superado en el mismo pedido, mismo vale, distribución contra anulación del pedido, anulación doble | integración | FR-006, SC-002, casos borde |
| Invariantes: 0 diferencias en la verificación de inventario; entregado = suma de distribuciones REGISTRADAS; sin editar ni borrar | integración | SC-005, SC-006, FR-012 |
| Listado con filtros y unidades; detalle con datos del pedido | integración | FR-010, FR-011 |

## 3. Recorrido de validación manual

Con la aplicación en marcha (`npm run dev`) y una sesión iniciada.

| # | Acción | Resultado esperado | Spec |
|---|---|---|---|
| 1 | **Distribuciones → Registrar distribución** | Solo pedidos PENDIENTE y PARCIAL, con % atendido | H2 · E4 |
| 2 | Elegir el primer pedido | Representante y servicio; Lavandina "Máximo 6", Jabón "Máximo 5", Trapeador "Sin stock" sin campo | H1 · E1, E10 |
| 3 | Escribir el vale 450 y salir del campo | "El vale 450 ya está registrado" con enlace | H1 · E5 |
| 4 | Lavandina 7 y guardar | "Lavandina 1 L: puedes entregar como máximo 6 (pendiente 10, stock 6)"; lo escrito se conserva | H1 · E3, FR-009 |
| 5 | Jabón 8 y guardar | "Jabón líquido: puedes entregar como máximo 5 (pendiente 5, stock 20)" | H1 · E4 |
| 6 | Fecha anterior al pedido; fecha de mañana; luego sin cantidades | Rango de fechas permitido; "La fecha de la distribución no puede ser futura"; "Entrega al menos un producto…" | H1 · E7, E8 |
| 7 | Vale 500, Lavandina 6 y Jabón 5; guardar | Ficha de la distribución; pedido PARCIAL con Lavandina pendiente 4 y Trapeador pendiente 2; stock de Lavandina 0 y su kardex con "Salida por distribución" −6 | H1 · E2, E6 |
| 8 | **Distribuciones** | La del paso 7 en el mes en curso con 11 unidades; filtros por representante, producto, estado y vale; en la ficha del pedido, la distribución con sus 11 unidades | H3 · E1, E2, SC-008 |
| 9 | Abrir su detalle | Pedido enlazado, representante del pedido, líneas; sin editar ni borrar; "Imprimir vale" y "Anular distribución" | H3 · E3, E4 |
| 10 | **Imprimir vale** | Vista sin menú con centro de salud, vale, pedido, productos y firmas; la vista previa de impresión no muestra botones | H5 · E1 |
| 11 | Anular sin motivo y luego con motivo | "Escribe el motivo de la anulación"; después ANULADA, stock de Lavandina 6, pedido PENDIENTE, kardex con "Anulación de distribución" +6 | H4 · E1, E2, E5 |
| 12 | Vale de la distribución anulada | Leyenda ANULADA visible | H5 · E2 |
| 13 | Registrar otra distribución con el vale 500 | Se acepta | H4 · E7 |
| 14 | **Existencias → Verificar consistencia** | "El inventario es consistente…" | SC-006 |
