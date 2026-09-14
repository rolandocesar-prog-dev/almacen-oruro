# Constitución · Sistema de almacén Regional Oruro

Sistema web con inteligencia artificial para el control de compra, almacenaje y distribución de
productos de limpieza — Regional Oruro. Proyecto de grado de Ingeniería de Sistemas: lo desarrolla
un asesor técnico y lo defiende ante un tribunal otro estudiante, que no escribió el código. De ahí
sale el criterio que ordena a todos los demás: el sistema tiene que poder explicarse.

## Principios fundamentales

### I. Explicabilidad por encima de la elegancia

- Todo el código DEBE poder explicarlo, frente a un tribunal, alguien que no lo escribió.
- Se DEBEN seguir las convenciones estándar y documentadas de Next.js (App Router), Prisma y
  TypeScript. Están PROHIBIDOS los patrones "ingeniosos", la metaprogramación y las capas de
  abstracción sin necesidad concreta: no hay repositorios genéricos, CQRS, inyección de
  dependencias ni buses de eventos.
- Las funciones DEBEN ser cortas y tener nombres que dicen lo que hacen.
- Los comentarios, en español, DEBEN explicar el **por qué** de cada decisión de negocio, no el qué.
- Toda decisión de diseño relevante DEBE registrarse en `docs/decisiones.md` con su fundamento.

**Fundamento:** quien defiende el proyecto no es quien lo programó (decisión D-08). Si una parte
del código no se puede explicar en pocas frases, es un riesgo para la defensa.

### II. La lógica de negocio vive en la aplicación

- Las reglas de negocio DEBEN implementarse en una capa de servicios en TypeScript
  (`src/servicios/`), un archivo o carpeta por módulo.
- La base de datos DEBE garantizar la integridad con claves foráneas, restricciones `UNIQUE` y
  `CHECK`, y transacciones.
- Está PROHIBIDO usar procedimientos almacenados y triggers para lógica de negocio.
- La interfaz NO DEBE contener reglas de negocio: llama a los servicios mediante Server Actions o
  rutas de API.

**Fundamento:** la lógica en TypeScript se lee, se prueba y se explica mejor que en SQL (D-04).
El sistema de 2022 tenía sus errores escondidos justamente en procedimientos almacenados.

### III. El kardex es la única fuente de verdad del stock

- Cualquier variación de stock DEBE registrar un `movimiento_inventario` y actualizar
  `producto.stock_actual` **en la misma transacción**.
- Ningún código DEBE modificar `stock_actual` por fuera de la función central de movimientos.
- El stock NUNCA puede quedar negativo; se valida dentro de la transacción, con bloqueo de fila.
- DEBE poder verificarse en todo momento que la suma de los movimientos de un producto es igual a
  su `stock_actual`.

**Fundamento:** trazabilidad, corrección de errores e histórico para la IA (D-05). Corrige los
defectos X-03 y X-12 del sistema de 2022.

### IV. Documentos inmutables

- Una compra o una distribución confirmada NO se edita ni se borra. Si tiene un error, se
  **anula** con motivo obligatorio y se genera el movimiento inverso en el kardex.
- Un documento DEBE guardarse completo (cabecera y detalle) en una sola transacción, o no se guarda.
  Si una validación falla, no se persiste nada y se informa el motivo al usuario.

**Fundamento:** con documentos inmutables el kardex siempre cuadra, y la regla se explica en una
frase (D-16). Corrige los defectos X-01 y X-02.

### V. Baja lógica

- Los catálogos (personal, categorías, unidades de medida, productos, proveedores, centros de
  salud, representantes) NO se borran físicamente: se desactivan.
- Los registros inactivos NO DEBEN aparecer para elegir en documentos nuevos, pero DEBEN seguir
  viéndose en el histórico.

**Fundamento:** borrar un proveedor rompía el histórico de compras (D-15, defecto X-11).

### VI. Validación en dos lugares, con un solo esquema

- Cada formulario DEBE validar en el cliente (experiencia de usuario) y en el servidor
  (autoridad), usando el **mismo esquema Zod**.
- Los mensajes de error DEBEN estar en español y decir qué está mal y cómo corregirlo.
- Los montos, subtotales y totales los DEBE calcular siempre el servidor; nunca se aceptan desde
  el cliente.

**Fundamento:** un solo esquema evita que las dos validaciones se contradigan. Corrige el defecto
X-14, donde el formulario enviaba el subtotal y el total.

### VII. Seguridad básica obligatoria

- Las contraseñas DEBEN guardarse con hash bcrypt; jamás en texto plano ni en registros de log.
- Todas las páginas y acciones, salvo el inicio de sesión, DEBEN exigir una sesión válida con
  expiración.
- El acceso a datos DEBE hacerse solo mediante Prisma (consultas parametrizadas).
- Los secretos (cadena de conexión, clave de API) DEBEN vivir en variables de entorno y nunca se
  versionan.

**Fundamento:** mínimo exigible a un sistema web. Corrige el defecto X-04 (contraseñas en texto
plano).

### VIII. IA transparente y verificable

- Los cálculos numéricos (series, pronósticos, métricas de error, reposición) DEBEN hacerse
  **localmente y de forma determinista**, con un algoritmo documentado paso a paso.
- El modelo de lenguaje **solo redacta** a partir de datos agregados que calcula el sistema; NO
  calcula ni inventa cifras. Junto a todo texto generado DEBEN mostrarse los datos que lo
  originaron.
- Cada informe generado DEBE guardarse con sus datos de entrada, fecha y modelo usado, para poder
  mostrarlo sin conexión.
- Los datos históricos simulados DEBEN declararse como simulados en la interfaz y en la
  documentación.
- Al modelo de lenguaje NO se le envían contraseñas ni datos de contacto.

**Fundamento:** el tribunal tiene que poder verificar cada cifra (D-06, D-07). El pronóstico
aporta el mérito técnico y la redacción cubre los requerimientos 14 y 15; mezclarlos haría
imposible explicar de dónde sale un número.

### IX. Pruebas donde duele

- DEBEN llevar pruebas automatizadas (Vitest) las reglas críticas: movimientos de stock y
  no-negatividad, duplicados (factura, vale, usuario, producto), transiciones de estado del
  pedido, anulaciones y cálculo del pronóstico.
- No se persigue un porcentaje de cobertura; se exige que las reglas del dominio estén demostradas.

**Fundamento:** con 9 días de plazo, las pruebas van donde un error rompe el inventario o la
defensa.

### X. Idioma y nombres

- La interfaz, los mensajes, la documentación y los comentarios DEBEN estar en español.
- Los nombres del dominio van en español: `snake_case` en la base de datos (`compra_detalle`,
  `stock_actual`) y `camelCase` en TypeScript (`registrarCompra`, `stockActual`).
- Se mantienen en inglés solo los nombres que impone el framework (`page.tsx`, `layout.tsx`,
  `route.ts`).

**Fundamento:** el código se explica en español ante un tribunal en español; el mismo término
debe aparecer igual en la especificación, la base y el código.

### XI. Alcance cerrado

- La fecha de entrega es fija: **21/09/2026**.
- NO se implementa nada que no esté en una especificación aprobada. Toda idea nueva va a
  `docs/trabajo-futuro.md`.
- Ante la duda entre completar una funcionalidad P1 o pulir una P3, gana la P1. Si el plazo
  aprieta, se recorta según el orden de `docs/especificacion/00-decisiones-y-alcance.md` §5
  **antes** de mover fechas.

**Fundamento:** no hay días de margen; el orden de corte se fija antes de necesitarlo.

## Restricciones técnicas

- **Stack:** Node.js 22 LTS, Next.js (App Router), TypeScript en modo estricto, Prisma ORM,
  PostgreSQL 16, Zod y Vitest (decisiones D-01, D-02 y D-03).
- **Modelo de datos:** relacional, con tipos rigurosos según
  `docs/especificacion/02-modelo-de-dominio.md` (claves enteras autoincrementales, importes
  `decimal(12,2)`, estados como enumeraciones controladas; corrige los defectos X-10 y X-13).
- **Interfaz:** componentes simples y accesibles; DEBE funcionar en Chrome y Edge de escritorio y
  adaptarse a pantallas chicas.
- **Estructura:** un solo repositorio y un solo proyecto; sin monorepo ni microservicios.
- **Ejecución local:** el sistema DEBE poder levantarse en local con PostgreSQL en Docker y un
  comando de semilla. Solo la generación de informes redactados puede depender de internet.

## Flujo de desarrollo

- **Metodología:** Spec-Driven Development con GitHub Spec Kit (D-09). Por cada funcionalidad
  (F-001 … F-007) se sigue el ciclo `specify` → `clarify` → `plan` → `tasks` → `analyze` →
  `implement`, y cada una queda en `specs/00x-nombre/`.
- **La especificación manda:** si durante la implementación aparece algo que la especificación
  no cubre, NO se improvisa en el código. Se corrige primero el `spec.md` (o
  `docs/especificacion/02-modelo-de-dominio.md`) y se regenera lo que corresponda.
- **Fuentes de referencia:** las decisiones, el alcance y los defectos corregidos están en
  `docs/especificacion/00-decisiones-y-alcance.md`; las entidades y reglas de negocio (RN-xx), en
  `02-modelo-de-dominio.md`; las funcionalidades y sus criterios de aceptación, en
  `03-funcionalidades.md`.
- **Puerta de calidad:** cada `plan.md` DEBE pasar el chequeo contra esta constitución antes de
  generar tareas, y una funcionalidad no se da por terminada si sus reglas críticas (principio IX)
  no tienen pruebas en verde.

## Gobierno

- Esta constitución prevalece sobre cualquier especificación, plan o tarea. Si hay conflicto, se
  corrige el documento subordinado.
- Cambiarla requiere registrar el motivo en `docs/decisiones.md` y subir su versión.
- **Versionado semántico:** MAYOR cuando se elimina o redefine un principio; MENOR cuando se
  agrega un principio o sección, o se amplía de forma material; PARCHE para aclaraciones y
  redacción.
- **Revisión de cumplimiento:** `/speckit-plan` verifica cada plan contra estos principios y
  `/speckit-analyze` revisa la consistencia antes de implementar. Toda excepción DEBE quedar
  justificada en la sección de complejidad del plan.

**Version**: 1.0.0 | **Ratified**: 2026-09-13 | **Last Amended**: 2026-09-13
