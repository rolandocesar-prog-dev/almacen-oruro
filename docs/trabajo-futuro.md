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

## F-003 · Compras e inventario

- Órdenes de compra, aprobación, pagos y cuentas por pagar.
- Ajustes manuales de inventario (P3 de la especificación, fuera de la entrega).
- Valorización del inventario y precio promedio ponderado.
- Paginación del kardex si un producto llegara a miles de movimientos: hoy son unos cientos
  (`specs/003-compras-inventario/research.md`, K-08).
- Mostrar en pantalla la verificación encadenada de saldos (RN-51); hoy la demuestran las pruebas.

## F-004 · Pedidos

- Registro del pedido por el propio representante.
- Aprobación, prioridad o urgencia de pedidos.
- Pedidos recurrentes y reserva de stock para pedidos.

## F-005 · Distribución

- Distribuciones sin pedido, que atiendan varios pedidos a la vez, y transporte o logística.
- Confirmación de la recepción por el representante dentro del sistema.
- Devoluciones parciales (hoy se anula la distribución y se registra de nuevo con lo correcto).
- Vale generado por el sistema, si el almacén dejara el talonario físico (hoy el vale es manual y no se repite, D-19).
- PDF del vale generado en el servidor (hoy se imprime desde el navegador).

## F-006 · Reportes

- Exportar a Excel o a un PDF descargable propio (hoy se imprime o se guarda como PDF desde el navegador).
- Gráficos de tablero y comparaciones entre períodos.
- Reportes programados o enviados por correo.
- Reportes por centro de salud, cuando haya más de uno.
- Existencias "a una fecha pasada" (hoy se obtienen producto por producto con el kardex).

## F-007 · Inteligencia artificial

- Modelos de aprendizaje profundo y pronóstico por representante o por servicio.
- Pronóstico del mes siguiente además del mes en curso, y reentrenamiento programado.
- Chat conversacional con los datos y pronóstico de precios.
- Envío de informes por correo y edición del texto de un informe.
- Enlazar el resaltado de cifras con la celda de la tabla donde está cada número (hoy solo se marca lo que no se encontró).
- Mostrar `docs/metodo-pronostico.md` dentro del sistema (hoy las pantallas indican dónde está el archivo).
- Probar otros métodos de referencia (suavizado exponencial simple, Holt sin estacionalidad) y elegir el método por producto según la evaluación.

## Otras funcionalidades

Se completa a medida que se implementan F-002 a F-007.

