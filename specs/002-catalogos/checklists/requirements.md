# Lista de calidad de la especificación: F-002 · Catálogos

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
- Supuestos candidatos para `/speckit-clarify`: unicidad que incluye registros inactivos,
  desactivación de productos con stock, bloqueo del cambio de unidad con movimientos (RN-16),
  reactivación condicionada al registro padre (RN-17), catálogo que admite varios centros de salud
  y formato del CI con complemento.
- Nuevas reglas incorporadas a `docs/especificacion/02-modelo-de-dominio.md`: RN-16 y RN-17, y los
  formatos de `producto.codigo` y `representante.ci`.
- Algunos escenarios (histórico de compras, pedidos, movimientos) solo se verifican por completo
  cuando existan F-003 a F-005; está declarado en Supuestos › Dependencias.
