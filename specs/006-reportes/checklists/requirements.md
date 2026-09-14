# Lista de calidad de la especificación: F-006 · Reportes

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

- Primera pasada: el escenario 1 de R-3 decía que usaba el mismo orden que la consulta de
  existencias de F-003, que ordena primero los bajo mínimo; se corrigió para compartir productos e
  indicadores pero agrupar por categoría. Segunda pasada aprobada.
- Incluye los 3 criterios de `03-funcionalidades.md` §F-006 (total de R-1, saldo final de R-4 igual
  al stock, impresión sin menús y con filtros) y respeta la tabla D-12.
- La mención a "guardar como PDF desde el navegador" viene del propio insumo (fuera de alcance de
  03) y describe una capacidad del usuario, no la implementación.
- Candidatos para `/speckit-clarify`: totales que excluyen anulados aunque se muestren, R-4 que
  siempre incluye anulaciones, porcentaje atendido de R-5 a la fecha de emisión, criterio para
  mostrar la leyenda de datos simulados.
