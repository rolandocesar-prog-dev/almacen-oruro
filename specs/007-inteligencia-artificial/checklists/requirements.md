# Lista de calidad de la especificación: F-007 · Inteligencia artificial

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
- Los nombres de métodos estadísticos (Holt-Winters, ingenuo estacional, promedio móvil) y de
  métricas (MAE, WAPE) no son detalles de implementación: son parte del dominio que
  `03-funcionalidades.md` exige dejar explícito y que se defiende ante el tribunal. La librería,
  el servicio del modelo de lenguaje y la forma de ejecutar el generador se deciden en el plan.
- Incluye los 7 criterios de `03-funcionalidades.md` §F-007 (generador reproducible, pronóstico
  determinista, serie de prueba, reposición 0, cifras verificables, funcionamiento sin conexión,
  leyenda de datos simulados).
- **Corrección metodológica:** el insumo elegía los parámetros "minimizando el error sobre el
  período de validación", lo que sesga la evaluación. La especificación los ajusta solo con
  entrenamiento (FR-003, FR-008) y se actualizó `03-funcionalidades.md`. Conviene confirmarlo en
  `/speckit-clarify`.
- Agregados respecto al insumo: resaltado automático de cifras no encontradas en los datos
  (FR-013), variación porcentual precalculada para que el modelo no calcule (FR-011), mínimo de 30
  meses para evaluar, período por defecto del informe (mes anterior completo), tiempo máximo de 60
  segundos para el modelo.
- Candidatos para `/speckit-clarify`: mes pronosticado (mes en curso o siguiente), forma de ejecutar
  el generador (instalación o menú), selección de parámetros, resaltado automático de cifras.
