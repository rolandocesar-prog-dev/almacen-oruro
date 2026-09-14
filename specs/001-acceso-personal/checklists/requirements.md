# Lista de calidad de la especificación: F-001 · Acceso y personal

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
- Se completaron con supuestos documentados, en lugar de marcas de aclaración: expiración absoluta
  de 8 horas, sesiones múltiples permitidas, cambio obligatorio de la contraseña temporal,
  cierre de sesiones al desactivar o restablecer, y longitud de 3 a 30 caracteres para el nombre
  de usuario. Son candidatos para confirmar en `/speckit-clarify`.
- La especificación introdujo dos datos nuevos, ya incorporados a
  `docs/especificacion/02-modelo-de-dominio.md`: `usuario.debe_cambiar_contrasena` y
  `sesion.motivo_cierre`, junto con la regla RN-06.
- FR-014 menciona que las contraseñas se guardan "de forma irreversible" sin nombrar el algoritmo;
  bcrypt lo fija la constitución (principio VII) y se concreta en `/speckit-plan`.
