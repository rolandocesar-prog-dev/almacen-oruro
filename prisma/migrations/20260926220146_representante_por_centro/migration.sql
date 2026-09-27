-- F-009 · Un representante activo por centro de salud (RN-18, D-22).
-- Detalle y fundamentos: specs/009-observaciones-raymond/research.md, O-01 y O-02.

-- 1. Guardia: el modelo anterior tenía un centro con varios representantes activos, uno por
--    servicio (D-18, revertida). Esta migración NO convierte esos datos: no hay datos reales en
--    operación y la demostración se regenera. Sin la guardia, el índice del paso 3 fallaría con un
--    error técnico en inglés; con ella, la migración se detiene antes de cambiar nada y dice qué hacer.
DO $$
BEGIN
  IF EXISTS (
    SELECT centro_salud_id
    FROM "representante"
    WHERE activo
    GROUP BY centro_salud_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Esta base tiene centros de salud con varios representantes activos (modelo anterior a F-009). Recréala y regenera la demostración: docs/instalacion.md, sección "Actualizar a F-009"';
  END IF;
END $$;

-- 2. El representante deja de tener "servicio": se identifica por su nombre y su centro (D-22).
ALTER TABLE "representante" DROP COLUMN "servicio";

-- 3. La base garantiza la regla aun con dos operaciones simultáneas: entre los representantes
--    activos, un centro no se repite. Los inactivos no cuentan y conservan el historial.
CREATE UNIQUE INDEX "representante_centro_activo_unico" ON "representante"("centro_salud_id") WHERE (activo = true);
