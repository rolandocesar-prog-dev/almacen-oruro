# 01 · Insumo para la constitución

> **Uso:** este texto se le pasa al comando `/speckit-constitution` de Spec Kit. El comando lo convierte en `.specify/memory/constitution.md`, que todos los comandos siguientes (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`) consultan y respetan.
>
> La constitución contiene **principios que no se negocian**. Lo que puede cambiar de una funcionalidad a otra va en las especificaciones, no aquí.

---

## Texto para `/speckit-constitution`

Crea la constitución del proyecto "Sistema web con IA para el control de compra, almacenaje y distribución de productos de limpieza — Regional Oruro". Es un proyecto de grado de Ingeniería de Sistemas: lo desarrolla un asesor técnico y lo defiende ante un tribunal otro estudiante, que no escribió el código. Redacta la constitución en español con estos principios:

### I. Explicabilidad por encima de la elegancia
- Todo el código tiene que poder explicarlo, frente a un tribunal, alguien que no lo escribió.
- Se siguen las convenciones estándar y documentadas de Next.js (App Router), Prisma y TypeScript. Nada de patrones "ingeniosos", metaprogramación ni capas de abstracción sin necesidad concreta (no hay repositorios genéricos, CQRS, inyección de dependencias ni eventos).
- Funciones cortas, con nombres que dicen lo que hacen.
- Comentarios en español que explican el **por qué** de cada decisión de negocio, no el qué.
- Toda decisión de diseño relevante se registra en `docs/decisiones.md` con su fundamento.

### II. La lógica de negocio vive en la aplicación
- Las reglas de negocio se implementan en una capa de servicios en TypeScript (`src/servicios/`), una por módulo.
- La base de datos garantiza la integridad con claves foráneas, restricciones `UNIQUE` y `CHECK`, y transacciones.
- Prohibido usar procedimientos almacenados y triggers para lógica de negocio.
- La interfaz no contiene reglas de negocio: llama a los servicios mediante Server Actions o rutas de API.

### III. El kardex es la única fuente de verdad del stock
- Cualquier variación de stock registra un `movimiento_inventario` y actualiza `producto.stock_actual` **en la misma transacción**.
- Ningún código modifica `stock_actual` por fuera de la función central de movimientos.
- El stock nunca puede ser negativo; se valida dentro de la transacción, con bloqueo de fila.
- Tiene que poder verificarse siempre que la suma de movimientos de un producto es igual a su `stock_actual`.

### IV. Documentos inmutables
- Una compra o una distribución confirmada no se edita ni se borra. Si hay un error, se **anula** con motivo obligatorio y se genera el movimiento inverso en el kardex.
- Un documento se guarda completo (cabecera y detalle) en una sola transacción, o no se guarda.

### V. Baja lógica
- Los catálogos (personal, categorías, unidades, productos, proveedores, centros de salud, representantes) no se borran físicamente: se desactivan.
- Los registros inactivos no aparecen para elegir en documentos nuevos, pero se siguen viendo en el histórico.

### VI. Validación en dos lugares, con un solo esquema
- Cada formulario valida en el cliente (experiencia de usuario) y en el servidor (autoridad), usando el **mismo esquema Zod**.
- Los mensajes de error están en español, dicen qué está mal y cómo corregirlo.
- Los montos y totales los calcula siempre el servidor, nunca se aceptan desde el cliente.

### VII. Seguridad básica obligatoria
- Contraseñas con hash bcrypt; jamás en texto plano ni en registros de log.
- Todas las páginas y acciones, salvo el inicio de sesión, exigen una sesión válida con expiración.
- Acceso a datos solo mediante Prisma (consultas parametrizadas).
- Los secretos (cadena de conexión, clave de API) viven en variables de entorno y nunca se versionan.

### VIII. IA transparente y verificable
- Los cálculos numéricos (series, pronósticos, métricas de error, reposición) se hacen **localmente y de forma determinista**, con un algoritmo documentado paso a paso.
- El modelo de lenguaje **solo redacta** a partir de datos agregados que calcula el sistema; no calcula ni inventa cifras. Junto a todo texto generado se muestran los datos que lo originaron.
- Cada informe generado se guarda con sus datos de entrada, fecha y modelo usado, para poder mostrarlo sin conexión.
- Los datos históricos simulados se declaran como simulados en la interfaz y en la documentación.
- Al modelo de lenguaje no se le envían contraseñas ni datos de contacto.

### IX. Pruebas donde duele
- Llevan pruebas automatizadas (Vitest) las reglas críticas: movimientos de stock y no-negatividad, duplicados (factura, vale, usuario, producto), transiciones de estado del pedido, anulaciones y cálculo del pronóstico.
- No se busca un porcentaje de cobertura; se busca que las reglas del dominio estén demostradas.

### X. Idioma y nombres
- Interfaz, mensajes, documentación y comentarios en español.
- Nombres del dominio en español y `snake_case` en la base (`compra_detalle`, `stock_actual`), y en español `camelCase` en TypeScript (`registrarCompra`, `stockActual`).
- Se mantienen en inglés los nombres que impone el framework (`page.tsx`, `layout.tsx`, `route.ts`).

### XI. Alcance cerrado
- Fecha de entrega fija: 21/09/2026.
- No se implementa nada que no esté en una especificación aprobada. Toda idea nueva va a `docs/trabajo-futuro.md`.
- Ante la duda entre completar una funcionalidad P1 o pulir una P3, gana la P1.

### Restricciones técnicas
- Node.js 22 LTS, Next.js (App Router), TypeScript en modo estricto, Prisma ORM, PostgreSQL 16, Zod, Vitest.
- Interfaz con componentes simples y accesibles; que funcione en Chrome y Edge de escritorio y se adapte a pantallas chicas.
- Un solo repositorio y un solo proyecto (sin monorepo ni microservicios).
- Debe poder levantarse en local con PostgreSQL en Docker y un comando de semilla.

### Gobierno
- La constitución prevalece sobre cualquier especificación, plan o tarea.
- Cambiarla requiere registrar el motivo en `docs/decisiones.md` y subir su versión.
