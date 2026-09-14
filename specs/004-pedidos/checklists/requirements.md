# Lista de calidad de la especificación: F-004 · Pedidos

**Propósito**: validar que la especificación está completa y tiene calidad antes de planificar
**Creada**: 2026-09-13
**Funcionalidad**: [spec.md](../spec.md)

## Calidad del contenido

- [x] Sin detalles de implementación (lenguajes, frameworks, API)
- [x] Centrada en el valor para el usuario y en las necesidades del negocio
- [x] Escrita para personas no técnicas
- [x] Todas las secciones obligatorias completas

## Completitud de los requisitos

- [x] No quedan marcas [NEEDS CLARIFICATION]
- [x] Los requisitos se pueden probar y no son ambiguos
- [x] Los criterios de éxito son medibles
- [x] Los criterios de éxito no dependen de la tecnología
- [x] Todos los escenarios de aceptación están definidos
- [x] Los casos borde están identificados
- [x] El alcance está delimitado
- [x] Las dependencias y los supuestos están identificados

## Preparación de la funcionalidad

- [x] Todos los requisitos funcionales tienen criterios de aceptación claros
- [x] Los escenarios cubren los flujos principales
- [x] La funcionalidad cumple los resultados medibles de los criterios de éxito
- [x] No se filtran detalles de implementación en la especificación

## Notas

- Validación aprobada en la primera pasada.
- Incluye los 5 criterios de `03-funcionalidades.md` §F-004 (pedido nuevo PENDIENTE sin mover stock,
  representante inactivo fuera del selector, producto sin repetir, PARCIAL no editable, ATENDIDO no
  anulable).
- Supuestos candidatos para `/speckit-clarify`: número de pedido correlativo del sistema, listado
  por defecto con PENDIENTE y PARCIAL del más antiguo al más reciente, pedido que admite cantidades
  mayores al stock, representante desactivable con pedidos por atender.
- Campos incorporados a `docs/especificacion/02-modelo-de-dominio.md`: `anulada_en` y
  `anulada_por_id` en pedido, y la nota sobre el número de pedido.
