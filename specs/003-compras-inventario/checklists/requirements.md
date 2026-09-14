# Lista de calidad de la especificación: F-003 · Compras e inventario

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

- Primera pasada: SC-004 tenía una redacción confusa ("sin cabecera sin líneas"); se corrigió y la
  segunda pasada quedó aprobada.
- Se usa "operación indivisible" en lugar de "transacción" para no filtrar implementación; la
  constitución (principios III y IV) fija que es una transacción con bloqueo.
- Supuesto de mayor riesgo, candidato para `/speckit-clarify`: la fecha de la compra puede ser
  anterior a hoy, pero el kardex se ordena por el momento de registro. Impacta la serie mensual de
  consumo de F-007 y el generador de 36 meses de histórico simulado.
- Otros candidatos: vista previa de totales en el formulario, ceros a la izquierda en la factura,
  verificación de consistencia a pedido (FR-020).
- Nuevo campo incorporado a `docs/especificacion/02-modelo-de-dominio.md`: `anulada_por_id` en
  compra y distribución.
