-- Restricciones CHECK del Sistema de almacén Regional Oruro.
-- Prisma no las expresa en schema.prisma, así que se agregan en esta migración (research R-07).
-- Son la segunda línea de defensa: los servicios validan primero y la base garantiza que,
-- aunque haya un error de programación, nunca se guarden datos que rompan una regla.
-- Cada restricción indica la regla que protege. Detalle: specs/001-acceso-personal/data-model.md §4

-- ─── Acceso (F-001) ──────────────────────────────────────────────

-- FR-011: nombre de usuario de 3 a 30 caracteres, solo minúsculas, dígitos, punto y guion bajo.
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_nombre_usuario_formato"
  CHECK (nombre_usuario ~ '^[a-z0-9._]{3,30}$');

-- FR-010: teléfono opcional, solo dígitos, espacios, + y -.
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_telefono_formato"
  CHECK (telefono IS NULL OR telefono ~ '^[0-9 +-]{1,20}$');

-- FR-009: una sesión abierta no tiene fin ni motivo; una cerrada tiene los dos.
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_cierre_coherente"
  CHECK ((fin IS NULL) = (motivo_cierre IS NULL));

-- RN-03: una sesión no puede terminar antes de empezar.
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_fin_posterior"
  CHECK (fin IS NULL OR fin >= inicio);

-- ─── Catálogos (F-002) ───────────────────────────────────────────

-- RN-32 y principio III: el stock nunca es negativo.
ALTER TABLE "producto" ADD CONSTRAINT "producto_stock_no_negativo"
  CHECK (stock_actual >= 0);

-- F-002: el stock mínimo es un entero mayor o igual a 0.
ALTER TABLE "producto" ADD CONSTRAINT "producto_stock_minimo_no_negativo"
  CHECK (stock_minimo >= 0);

-- F-002: el NIT tiene solo dígitos.
ALTER TABLE "proveedor" ADD CONSTRAINT "proveedor_nit_digitos"
  CHECK (nit ~ '^[0-9]+$');

-- F-002: CI con dígitos y complemento opcional tras guion (ej. 4567890-1B).
ALTER TABLE "representante" ADD CONSTRAINT "representante_ci_formato"
  CHECK (ci ~ '^[0-9]+(-[0-9A-Z]+)?$');

-- F-002: el precio referencial, si existe, es mayor que 0.
ALTER TABLE "proveedor_producto" ADD CONSTRAINT "proveedor_producto_precio_positivo"
  CHECK (precio_referencial IS NULL OR precio_referencial > 0);

-- ─── Compras (F-003) ─────────────────────────────────────────────

-- F-003: el número de factura tiene solo dígitos.
ALTER TABLE "compra" ADD CONSTRAINT "compra_factura_digitos"
  CHECK (nro_factura ~ '^[0-9]+$');

-- RN-23: el total es la suma de subtotales positivos, nunca negativo.
ALTER TABLE "compra" ADD CONSTRAINT "compra_total_no_negativo"
  CHECK (total >= 0);

-- RN-25: una compra anulada tiene motivo, momento y usuario de anulación; una vigente no.
ALTER TABLE "compra" ADD CONSTRAINT "compra_anulacion_coherente"
  CHECK ((estado = 'ANULADA') = (motivo_anulacion IS NOT NULL AND anulada_en IS NOT NULL AND anulada_por_id IS NOT NULL));

-- F-003: se compra al menos una unidad.
ALTER TABLE "compra_detalle" ADD CONSTRAINT "compra_detalle_cantidad_positiva"
  CHECK (cantidad > 0);

-- F-003: el precio unitario es mayor que 0.
ALTER TABLE "compra_detalle" ADD CONSTRAINT "compra_detalle_precio_positivo"
  CHECK (precio_unitario > 0);

-- RN-23: el subtotal es exactamente cantidad por precio unitario.
ALTER TABLE "compra_detalle" ADD CONSTRAINT "compra_detalle_subtotal_exacto"
  CHECK (subtotal = cantidad * precio_unitario);

-- ─── Pedidos (F-004) ─────────────────────────────────────────────

-- RN-43: un pedido anulado tiene motivo, momento y usuario de anulación; los demás no.
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_anulacion_coherente"
  CHECK ((estado = 'ANULADO') = (motivo_anulacion IS NOT NULL AND anulada_en IS NOT NULL AND anulada_por_id IS NOT NULL));

-- RN-40: se solicita al menos una unidad.
ALTER TABLE "pedido_detalle" ADD CONSTRAINT "pedido_detalle_solicitada_positiva"
  CHECK (cantidad_solicitada > 0);

-- F-004 (FR-009): lo entregado va de 0 a lo solicitado; nunca se entrega de más.
ALTER TABLE "pedido_detalle" ADD CONSTRAINT "pedido_detalle_entregada_en_rango"
  CHECK (cantidad_entregada BETWEEN 0 AND cantidad_solicitada);

-- ─── Distribución (F-005) ────────────────────────────────────────

-- F-005: el número de vale tiene solo dígitos.
ALTER TABLE "distribucion" ADD CONSTRAINT "distribucion_vale_digitos"
  CHECK (nro_vale ~ '^[0-9]+$');

-- RN-35: una distribución anulada tiene motivo, momento y usuario de anulación; una vigente no.
ALTER TABLE "distribucion" ADD CONSTRAINT "distribucion_anulacion_coherente"
  CHECK ((estado = 'ANULADA') = (motivo_anulacion IS NOT NULL AND anulada_en IS NOT NULL AND anulada_por_id IS NOT NULL));

-- RN-32: se entrega al menos una unidad por línea.
ALTER TABLE "distribucion_detalle" ADD CONSTRAINT "distribucion_detalle_cantidad_positiva"
  CHECK (cantidad > 0);

-- ─── Inventario (F-003, F-005) ───────────────────────────────────

-- RN-50: un movimiento siempre mueve algo.
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_cantidad_no_cero"
  CHECK (cantidad <> 0);

-- RN-32 y RN-51: el saldo después de cada movimiento nunca es negativo.
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_saldo_no_negativo"
  CHECK (saldo_resultante >= 0);

-- D-05: los movimientos de compra apuntan a una compra; los de distribución, a una distribución.
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_origen_coherente"
  CHECK (
    (tipo IN ('ENTRADA_COMPRA', 'ANULACION_COMPRA') AND compra_id IS NOT NULL AND distribucion_id IS NULL)
    OR
    (tipo IN ('SALIDA_DISTRIBUCION', 'ANULACION_DISTRIBUCION') AND distribucion_id IS NOT NULL AND compra_id IS NULL)
  );

-- RN-24 y RN-34: entradas positivas (compra, anulación de distribución); salidas negativas
-- (distribución, anulación de compra).
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_signo_coherente"
  CHECK (
    (tipo IN ('ENTRADA_COMPRA', 'ANULACION_DISTRIBUCION') AND cantidad > 0)
    OR
    (tipo IN ('SALIDA_DISTRIBUCION', 'ANULACION_COMPRA') AND cantidad < 0)
  );

-- ─── Inteligencia artificial y sistema (F-006, F-007) ────────────

-- F-007: el período de un informe empieza antes o el mismo día en que termina.
ALTER TABLE "informe_ia" ADD CONSTRAINT "informe_periodo_valido"
  CHECK (desde <= hasta);

-- F-006: la configuración es una sola fila.
ALTER TABLE "configuracion" ADD CONSTRAINT "configuracion_fila_unica"
  CHECK (id = 1);
