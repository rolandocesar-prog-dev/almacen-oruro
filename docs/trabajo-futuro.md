# Trabajo futuro

Ideas y funciones que quedaron **fuera del alcance** de la entrega del 21/09/2026. Toda idea nueva
que surja durante el desarrollo se anota aquí en lugar de implementarse (constitución, principio XI).

Alcance general fuera de la entrega: ver
[`especificacion/00-decisiones-y-alcance.md` §3.2](especificacion/00-decisiones-y-alcance.md).

## F-001 · Acceso y personal

- Roles y permisos diferenciados (hoy hay un solo rol con acceso total, D-10).
- Recuperación de contraseña por correo electrónico.
- Registro de intentos de ingreso fallidos y bloqueo tras varios intentos.
- Autenticación en dos pasos.
- Cierre de sesión por inactividad (hoy la sesión vence a las 8 h desde el ingreso).

## F-002 · Catálogos

- Importación masiva de catálogos, imágenes de productos, lotes y vencimientos, historial de precios.
- Búsqueda en la base con la extensión `unaccent` de PostgreSQL si algún catálogo llegara a miles de
  registros: hoy se filtra en memoria porque son decenas (`specs/002-catalogos/research.md`, C-01).
- Paginación de los listados de catálogos, por el mismo motivo (C-02).

## Otras funcionalidades

Se completa a medida que se implementan F-002 a F-007.
