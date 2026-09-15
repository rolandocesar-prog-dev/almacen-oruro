# Registro de decisiones técnicas

Toda decisión de diseño relevante se registra aquí con su fundamento (constitución, principio I).
Las decisiones de alcance y de negocio están en
[`especificacion/00-decisiones-y-alcance.md`](especificacion/00-decisiones-y-alcance.md) (D-01 a D-16).

**Formato de cada entrada:** fecha · decisión · fundamento · alternativas descartadas · enlace al
detalle.

---

## Arquitectura (plan de F-001, 13/09/2026)

Detalle completo en [`specs/001-acceso-personal/research.md`](../specs/001-acceso-personal/research.md).

| # | Fecha | Decisión | Fundamento | Alternativas descartadas |
|---|---|---|---|---|
| T-01 | 13/09 | Versiones exactas y estables: Next.js 16.3.5, React 19.3, TypeScript 5.9.3, Prisma 7.10, Zod 4.6, Vitest 4.1, Tailwind 4.3 | Sin margen para depurar versiones recién publicadas; instalación idéntica en otra computadora | Prisma 8 RC, TypeScript 7, Vitest 5 (R-01) |
| T-02 | 13/09 | Un solo proyecto Next.js; flujo página → Server Action → servicio → Prisma | Lo exige la constitución; se explica en una línea | Monorepo, repositorios genéricos (R-02) |
| T-03 | 13/09 | Sesiones en base de datos sin librería: token aleatorio en cookie, hash SHA-256 en la tabla `sesion` | Bitácora con motivo, cierre inmediato al desactivar y sesiones simultáneas; unas 80 líneas propias | Auth.js, iron-session, jose, Better Auth (R-03) |
| T-04 | 13/09 | `bcryptjs` con costo 12 | JavaScript puro, se instala en Windows sin compilar | `bcrypt` nativo, Argon2 (R-04) |
| T-05 | 13/09 | Prisma 7 con adaptador `pg`, nombres en español y `@map` a snake_case | Guía oficial de Prisma 7; mismo vocabulario en código y base | Drizzle, SQL a mano (R-05) |
| T-06 | 13/09 | Unicidad sin mayúsculas ni espacios con columnas `*_normalizado` únicas | Regla legible en TypeScript y garantizada por la base | `citext`, índices sobre expresiones (R-06) |
| T-07 | 13/09 | Índices únicos parciales en el esquema y restricciones CHECK en una migración SQL comentada | La base garantiza la integridad (principio II) | Validar solo en servicios, triggers (R-07) |
| T-08 | 13/09 | Tailwind CSS y componentes propios mínimos | Todo el código de interfaz es del proyecto | shadcn/ui, Material UI (R-08) |
| T-09 | 13/09 | Un esquema Zod por formulario, usado en cliente y servidor, con `useActionState` | Principio VI; patrón oficial de Next.js | React Hook Form (R-09) |
| T-10 | 13/09 | `ErrorDeNegocio` para errores esperables; mensaje genérico para el resto | Separa "no permitido" de "falló el sistema" | Códigos de error por módulo (R-10) |
| T-11 | 13/09 | Única función `registrarMovimiento()` con `SELECT … FOR UPDATE` | Principio III: stock nunca negativo, explicable en una frase | `SERIALIZABLE` con reintentos (R-11) |
| T-12 | 13/09 | Fechas de documento como `date`; "hoy" en `America/La_Paz` | Evita que un registro nocturno quede con la fecha siguiente | Todo en UTC (R-12) |
| T-13 | 13/09 | Pruebas de integración contra PostgreSQL real en `almacen_oruro_test` | Demuestran también restricciones, transacciones y bloqueos | Simular Prisma (R-13) |
| T-14 | 13/09 | Docker Compose, `.env.example` y semilla idempotente con `admin` | Levantar en local con un comando (constitución) | Instalación manual de PostgreSQL (R-14) |
| T-15 | 13/09 | Cookie `Secure` configurable, falsa por defecto; la cookie dura 24 h y la vigencia de 8 h la decide el servidor | Uso por http en red local; poder detectar y registrar la expiración | Cookie `Secure` fija, cookie de 8 h (R-03, R-15) |

---

## Catálogos (plan de F-002, 14/09/2026)

Detalle completo en [`specs/002-catalogos/research.md`](../specs/002-catalogos/research.md).

| # | Fecha | Decisión | Fundamento | Alternativas descartadas |
|---|---|---|---|---|
| C-01 | 14/09 | Búsqueda sin mayúsculas ni tildes filtrando en memoria con `coincideBusqueda` (`src/lib/texto.ts`) | Los catálogos tienen decenas de registros; la regla queda en una función pura con pruebas unitarias | Extensión `unaccent` con SQL crudo, columna de búsqueda normalizada, `mode: "insensitive"` (distingue tildes) |
| C-02 | 14/09 | Listados de catálogos sin paginar, con el total de registros | Con decenas de filas una tabla completa se lee y se busca más rápido (SC-006) | Paginar de 50 en 50, desplazamiento infinito |
| C-03 | 14/09 | Un archivo explícito por catálogo en esquemas, servicios y páginas, más utilidades comunes pequeñas | Cada regla especial (RN-13, RN-16, RN-17) queda en el archivo de su catálogo | CRUD genérico parametrizado, una página con pestañas |
| C-04 | 14/09 | Duplicado de un registro inactivo: mensaje con enlace "Ver y reactivar" a su ficha (campo `enlace` en `ErrorDeNegocio`) | No reactiva nada por sorpresa y no requiere una acción nueva | Botón "Reactivar" en el formulario de alta, solo texto |
| C-05 | 14/09 | Nombres únicos con `nombre_normalizado`; código y CI en mayúsculas; el servicio verifica y la restricción UNIQUE decide en simultáneo (P2002 → mismo mensaje) | Aplica T-06 a cada catálogo | — |
| C-06 | 14/09 | RN-13, RN-16 y RN-17 en los servicios de catálogo, con conteos en transacción | Las reglas pertenecen a la baja del catálogo; se prueban insertando pedidos y movimientos de prueba | Esperar a F-003–F-005, bloquear filas |
| C-07 | 14/09 | `listar…ParaSelector(idActual?)`: solo activos, más el actual marcado si está inactivo | Una sola función decide qué se puede elegir (RN-14, FR-003) | Repetir el filtro en cada pantalla |
| C-08 | 14/09 | Precio referencial como texto con coma o punto, guardado con `Prisma.Decimal` y mostrado "Bs 12,50" | Sin redondeos de coma flotante; en Bolivia se escribe con coma | Campo numérico del navegador |
| C-09 | 14/09 | La ficha del producto advierte el stock al confirmar la baja | Desactivar con stock está permitido, pero conviene saberlo | Bloquear la baja con stock |
| C-10 | 14/09 | Menú con una segunda fila "Catálogos" que se ajusta en pantallas chicas | Sin JavaScript extra y sin desplazamiento horizontal | Menú desplegable, barra lateral |
| C-11 | 14/09 | Ayudantes de prueba `tests/ayudantes/catalogos.ts`, incluidos pedidos con saldo y movimientos mínimos | Las reglas que dependen de otras funcionalidades se prueban ya contra la base real | Depender de los servicios de F-003 y F-004 |

---

## Compras e inventario (plan de F-003, 14/09/2026)

Detalle completo en [`specs/003-compras-inventario/research.md`](../specs/003-compras-inventario/research.md).

| # | Fecha | Decisión | Fundamento | Alternativas descartadas |
|---|---|---|---|---|
| K-01 | 14/09 | `registrarMovimiento(tx, …)` en `src/servicios/inventario.ts` es la única escritura del stock: bloquea la fila del producto con `SELECT … FOR UPDATE`, verifica que no quede negativo y escribe movimiento y stock en la misma transacción; con varios productos, en orden de `id` y **antes** de insertar filas que los referencien | Principio III en una frase; el orden de `id` evita interbloqueos, y bloquear antes evita el choque con el `FOR KEY SHARE` de las claves foráneas | `UPDATE … WHERE stock >= x` sin bloqueo explícito, `SERIALIZABLE` con reintentos, triggers |
| K-02 | 14/09 | Anulación: primero el estado (solo si sigue REGISTRADA), después todos los productos a la vez con un único mensaje de faltantes, después los movimientos inversos con la fecha de la compra | Completa o nada; la anulación doble simultánea revierte una sola vez; el usuario ve todo lo que falta de una vez | Fallar en el primer producto sin stock, bloquear la compra aparte |
| K-03 | 14/09 | Formulario de compra con las líneas en estado de React; la acción recibe un objeto validado con el mismo esquema y los errores vuelven por ruta (`lineas.1.cantidad`) | Un `FormData` plano no representa bien una lista; lo escrito nunca se pierde | React Hook Form, un formulario por línea, campos indexados |
| K-04 | 14/09 | Montos como texto con coma o punto; vista previa en centavos enteros; guardado con `Prisma.Decimal` calculado por el servidor | Sin redondeos de coma flotante; el cliente nunca envía montos (X-14) | `number` de JavaScript, centavos en la base |
| K-05 | 14/09 | Aviso de factura duplicada al salir del campo con una Server Action de solo lectura; al guardar decide el índice único parcial | RN-21: avisar antes y verificar como autoridad | Verificar en cada tecla, ruta de API aparte |
| K-06 | 14/09 | Fecha del documento como texto `AAAA-MM-DD`, guardada a medianoche UTC; "no futura" contra hoy en La Paz | Una columna `date` no tiene hora: así no se corre un día | Convertir con la hora de Bolivia |
| K-07 | 14/09 | Existencias filtradas en memoria, bajo mínimo primero; por defecto activos e inactivos con stock | Decenas de productos; SC-007 sin interacción | Reutilizar el listado de productos, ordenar en SQL |
| K-08 | 14/09 | Kardex en orden de `id`, sin paginar, con saldo anterior y final por fecha del documento; verificación de consistencia con `groupBy` a pedido | Todo con consultas de Prisma; un kardex completo se explica mejor | Función de ventana en SQL, paginar el kardex |
| K-09 | 14/09 | Listado de compras filtrado en la base, factura "empieza con", 50 por página | Las compras crecen sin límite (36 meses simulados) | Filtrar en memoria como los catálogos |
| K-10 | 14/09 | Rutas `/compras`, `/existencias`, `/existencias/verificacion` y `/kardex/[productoId]`; ficha de compra sin editar ni borrar, solo anular | Nombres ya reservados en F-001; D-16 | — |
| K-11 | 14/09 | Registro: verificaciones fuera de la transacción, montos, y una transacción que bloquea productos, crea compra y líneas y registra las entradas | Mensajes claros antes; todo o nada después (RN-20) | Validar dentro de la transacción |
| K-12 | 14/09 | Pruebas de concurrencia reales con `Promise.all`; transacciones con `maxWait` y `timeout` de 10 s | Sin concurrencia real el `FOR UPDATE` no se prueba; los límites por defecto (2 s y 5 s) cortarían esperas legítimas | Simular la concurrencia |

---

## Pedidos (plan de F-004, 15/09/2026)

Detalle completo en [`specs/004-pedidos/research.md`](../specs/004-pedidos/research.md).

| # | Fecha | Decisión | Fundamento | Alternativas descartadas |
|---|---|---|---|---|
| P-01 | 15/09 | El Nº de pedido es el `id` que asigna la secuencia de PostgreSQL; puede saltar, nunca se repite ni cambia | El esquema ya tiene un entero único; no hay talonario físico de pedidos | Columna `numero` con `MAX + 1`, tabla de contadores |
| P-02 | 15/09 | Estado en una función pura `calcularEstadoPedido` (PENDIENTE, PARCIAL, ATENDIDO) y `recalcularEstadoPedido`, que no toca un ANULADO y usará F-005 | La tabla de estados de la especificación en pocas líneas, probada sin base de datos; SC-007 | Calcular al consultar, trigger |
| P-03 | 15/09 | `bloquearPedido` (`SELECT … FOR UPDATE`) como primera operación de editar, anular y distribuir; orden del sistema: primero el pedido, después los productos | Una sola regla resuelve los casos simultáneos: quien llega segundo ve el estado que dejó el primero | Actualización condicional, control optimista por versión |
| P-04 | 15/09 | Editar sincroniza las líneas por producto y no quita una línea con distribuciones anuladas | Borrar y recrear rompería las referencias de `distribucion_detalle` en pedidos que volvieron a PENDIENTE | Borrar y recrear, líneas inactivas |
| P-05 | 15/09 | Registro: verificaciones antes y un `create` anidado atómico, sin bloquear productos; se acepta la baja simultánea de un representante o producto | Registrar un pedido no mueve stock; un solo tipo de usuario y decenas de pedidos por mes | Transacción con bloqueo de productos |
| P-06 | 15/09 | Anular cambia solo la cabecera; lo entregado se conserva y el saldo anulado se calcula al mostrar | Sin columnas nuevas; la CHECK `pedido_anulacion_coherente` ya respalda los datos | Guardar el saldo anulado |
| P-07 | 15/09 | Listado por defecto "por atender", del más antiguo al más reciente, 50 por página, % atendido redondeado hacia abajo | Vista diaria de lo que falta; 199 de 200 nunca muestra 100 % | Filtrar en memoria, redondeo normal |
| P-08 | 15/09 | Acciones según el estado en `accionesSegunEstado`; "Pendiente" pasa a "Saldo anulado" en un ANULADO | Una tabla en un solo lugar; el servidor vuelve a verificar cada acción | Decidir en cada página |
| P-09 | 15/09 | Formulario con el patrón de compras y stock actual informativo; `cantidadEntera`, `marcarProductosRepetidos` y `mensajesPorLinea` pasan a módulos compartidos | Las reglas de cantidad y de producto repetido se escriben una sola vez | Componente genérico de documento con líneas |
| P-10 | 15/09 | Fecha del pedido como la de compras: `fechaNoFutura` y `aFechaDocumento` | Mismo criterio de K-06 | — |
| P-11 | 15/09 | Rutas `/pedidos`, `/pedidos/nuevo`, `/pedidos/[id]` y `/pedidos/[id]/editar`; "Ver sus pedidos" en la ficha del representante | Nombres reservados en F-001 | — |
| P-12 | 15/09 | Pruebas con entregas simuladas que bloquean el pedido y recalculan como lo hará F-005, y concurrencia real con `Promise.allSettled` | Principio IX: las transiciones de estado del pedido son reglas críticas y F-005 todavía no existe | Esperar a F-005 para probar los estados |

---

## Distribución (plan de F-005, 15/09/2026)

Detalle completo en [`specs/005-distribucion/research.md`](../specs/005-distribucion/research.md).

| # | Fecha | Decisión | Fundamento | Alternativas descartadas |
|---|---|---|---|---|
| V-01 | 15/09 | Registro en una transacción: vale verificado antes; después bloquear el pedido, verificar estado, fecha y pertenencia, bloquear los productos, verificar todas las cantidades contra pendiente y stock, crear la distribución, un `SALIDA_DISTRIBUCION` por línea, sumar lo entregado y recalcular el estado | Una sola regla de concurrencia en todo el sistema (primero el pedido, después los productos); corrige el stock negativo de 2022 (X-03) | Verificar fuera de la transacción, `SERIALIZABLE` con reintentos, bloquear las líneas del pedido |
| V-02 | 15/09 | Formulario con una fila por línea del pedido ("Completa", "Sin stock" o "Máximo n") que envía una entrada por fila aunque esté vacía | El encargado ve qué falta y qué puede entregar; los errores caen en su fila | Agregar líneas eligiendo productos, enviar solo las filas con cantidad |
| V-03 | 15/09 | Esquema común para vale, fecha, cantidades, al menos una línea y líneas no repetidas; el servicio verifica fecha del pedido, pertenencia y máximo con datos bloqueados, con un único mensaje por todas las líneas excedidas | El esquema no conoce el pedido ni el stock; corregir todo de una vez | Pendiente y stock del cliente como autoridad, fallar en la primera línea |
| V-04 | 15/09 | Vale único: aviso al salir del campo con una Server Action de solo lectura; decide el índice único parcial y el P2002 se traduce al mismo mensaje | Mismo patrón que la factura (K-05) | Verificar en cada tecla, tabla de vales bloqueada |
| V-05 | 15/09 | `/distribuciones/nueva` lista los pedidos por atender con `listarPedidos` de F-004; con `?pedido` muestra el formulario | Una sola definición de "por atender"; los ATENDIDOS y ANULADOS nunca aparecen | Selector desplegable de pedidos |
| V-06 | 15/09 | Anulación: bloquear el pedido, `updateMany` solo si sigue REGISTRADA, bloquear productos, `ANULACION_DISTRIBUCION` positivo con la fecha de la distribución, restar lo entregado y recalcular | Mismo orden que el registro; la anulación doble revierte una sola vez | Bloquear la distribución antes que el pedido, borrarla |
| V-07 | 15/09 | Listado filtrado en la base (mes en curso, representante del pedido, producto, estado, vale que empieza con), 50 por página, unidades con `groupBy` | Mismo patrón que compras (K-09) | Filtrar en memoria, SQL crudo |
| V-08 | 15/09 | Ficha sin editar ni borrar: solo "Imprimir vale" y la anulación con motivo si está REGISTRADA | D-16 en pantalla | — |
| V-09 | 15/09 | Vale para imprimir en el grupo de rutas `(impresion)`, sin menú, con controles `print:hidden` | Vista limpia en la URL reservada, sin dependencias nuevas | PDF en el servidor, ocultar el menú solo al imprimir |
| V-10 | 15/09 | Rutas `/distribuciones`, `/distribuciones/nueva`, `/distribuciones/[id]` y `/distribuciones/[id]/vale`; Distribuciones en el menú después de Pedidos | Nombres reservados en F-001; los enlaces del kardex y del pedido empiezan a funcionar | — |
| V-11 | 15/09 | `crearSalidaDePrueba` registra una distribución real; `simularEntregaDePrueba` de F-004 se conserva | Ninguna prueba escribe el stock por fuera de la función central | Mantener salidas sin distribución real |
| V-12 | 15/09 | Pruebas de registro, rechazos, entregas sucesivas, anulación, concurrencia real e invariantes SC-005 y SC-006 | Principio IX: stock, duplicados y anulaciones son reglas críticas | Simular la concurrencia |

---

## Implementación

Decisiones tomadas durante la implementación que no estaban en el plan.

| # | Fecha | Decisión | Fundamento |
|---|---|---|---|
| I-01 | 13/09 | `.npmrc` con `legacy-peer-deps=true` | npm 10.9 se detiene con "Cannot read properties of null (reading 'edgesOut')" al resolver las dependencias opcionales de Vite que trae Vitest. Las dependencias de pares necesarias (React, TypeScript, ESLint) ya están declaradas en `package.json` |
| I-02 | 13/09 | Los índices únicos parciales quedan en `schema.prisma` | La vista previa `partialIndexes` de Prisma 7.10 los generó correctamente en la migración inicial; no hizo falta moverlos a SQL |
| I-04 | 13/09 | Un único hook `useValidacion` para todos los formularios, que llama a la Server Action desde `onSubmit` | React 19 vacía el formulario después de cada envío por `<form action>`: si el servidor rechazaba los datos, había que volver a escribirlos. Además, al salir de un campo solo se muestra el error de ese campo |
| I-05 | 13/09 | La conexión de Prisma fuerza `TimeZone=UTC` (`src/lib/prisma.ts`) | El adaptador `pg` envía las fechas en UTC sin indicar la zona y PostgreSQL las interpretaba en la zona del servidor (America/La_Paz): quedaban 4 horas corridas y la expiración calculada en SQL fallaba. Lo detectó una prueba de integración; hay una prueba de regresión en `tests/integracion/zona-horaria.test.ts` |
| I-06 | 14/09 | Contraseñas de hasta 72 caracteres | bcrypt ignora lo que pasa de 72 bytes: dos contraseñas largas que solo difieran al final valdrían lo mismo. El límite lo avisa el formulario |
| I-07 | 14/09 | Cada listado tiene su propio componente de filtros de cliente (`filtros-personal.tsx`, `filtros-sesiones.tsx`) | Un esquema Zod no se puede pasar desde una página del servidor a un componente de cliente; el componente importa su esquema y usa el genérico `Filtros` |
| I-08 | 14/09 | La verificación visual de páginas internas se hizo con una sesión de prueba creada en la base, sin escribir contraseñas en el navegador | Los pasos del recorrido manual que requieren contraseñas quedan para la revisión con Raymond; sus reglas están cubiertas por pruebas de integración |
| I-03 | 13/09 | Vulnerabilidades de `npm audit` aceptadas | Las 4 alertas están en dependencias de desarrollo de la CLI de Prisma (`deepmerge-ts`, `mysql2`); las dependencias de producción tienen 0 vulnerabilidades |
| I-09 | 14/09 | Esquemas comunes en `src/esquemas/comunes.ts` (textos, teléfono, enteros, ids, filtro de estado, aviso de ficha) usados también por personal | Mismas reglas y mensajes en todos los formularios; las 77 pruebas de F-001 siguieron en verde tras la extracción |
| I-10 | 14/09 | Un campo vacío de número o selector se convierte en "sin valor" antes de `z.coerce.number` (`vacioComoAusente`) | `Number("")` es 0: sin esto, un stock mínimo o un selector vacíos pasaban como válidos |
| I-11 | 14/09 | Al editar un producto con movimientos, el selector de unidad va deshabilitado y el valor viaja en un campo oculto | Un `<select>` deshabilitado no se envía; el servidor vuelve a verificar RN-16 |
| I-12 | 14/09 | Etiqueta "(inactiva)" o "(inactivo)" según el género del catálogo en selectores y fichas | Se lee natural ("Desinfectantes (inactiva)"); la regla FR-003 no cambia |
| I-13 | 14/09 | Componentes compartidos de catálogos: `CambioDeEstado` (generalizado desde personal), `InsigniaEstado`, `Selector`, `Dato`, `MensajeVacio`, `EncabezadoListado` | Evita repetir el mismo marcado en seis catálogos sin esconder la lógica de cada uno |
| I-14 | 14/09 | La búsqueda y el filtro por categoría se implementaron junto con cada catálogo (fases 3 a 6) y la fase de la Historia 5 agregó su prueba | Escribir cada listado una sola vez; el resultado es el mismo que el orden de tareas previsto |
| I-15 | 14/09 | El recorrido de F-002 se verificó con un servidor de desarrollo contra la base de pruebas, datos cargados por esquemas y servicios, y una sesión de prueba creada en la base | Mismo criterio que I-08: sin escribir contraseñas en el navegador y sin dejar datos en la base de desarrollo |
| I-16 | 15/09 | Dos funciones para fechas de filtros: `fechaDeFiltro(porDefecto)` y `fechaOpcionalDeFiltro()` | Con un solo parámetro opcional, TypeScript perdía que la fecha con valor por defecto siempre existe y el historial de sesiones dejaba de compilar |
| I-17 | 15/09 | `aFechaDocumento`, `textoDeFechaDocumento` y `formatearFecha` viven en `src/lib/fechas.ts` | Los usan compras e inventario; en el servicio de compras obligaban a inventario a importarlo, y compras ya importa inventario |
| I-18 | 15/09 | `verificarConsistenciaInventario` lee productos y sumas en una transacción `REPEATABLE READ` | Las dos lecturas ven el mismo instante: una compra registrada entre ambas no produce una diferencia falsa |
| I-19 | 15/09 | El precio referencial de F-002 comparte con `montoPositivo` la regla `esMontoPositivo`, pero conserva su esquema propio | Envolver `montoPositivo` como opcional volvía obligatoria la clave en el tipo y rompía llamadas sin precio; reglas y mensajes no cambian |
| I-20 | 15/09 | Cada línea del formulario de compra es un `<fieldset>` con leyenda "Línea n" y etiquetas visibles (Producto, Cantidad, Precio unitario) | Da el mismo contexto que etiquetas ocultas "Producto de la línea n", se lee mejor en pantallas chicas y el aviso general repite los errores con su número de línea |
| I-21 | 15/09 | `crearMovimientoDePrueba` de F-002 registra una compra real con `registrarCompra` | Ninguna prueba escribe el stock por fuera de la función central; las pruebas de catálogos siguieron en verde |
| I-22 | 15/09 | El recorrido de F-003 usó el mismo método que I-15 | Mismo criterio: sin contraseñas en el navegador y sin datos en la base de desarrollo |
| I-23 | 15/09 | Antes de implementar F-004, el análisis corrigió la especificación: un pedido por atender puede tener un representante o producto inactivo (desactivado mientras estaba ATENDIDO o con esa línea completa); al editarlo se conserva ese valor, pero no se elige otro inactivo (FR-006) | La especificación afirmaba lo contrario y el plan ya permitía conservarlo; se corrigió primero `spec.md`, como manda la constitución |
| I-24 | 15/09 | La entrega simulada de las pruebas rechaza una cantidad positiva en un pedido ANULADO o ATENDIDO y acepta descontar en cualquier estado | Imita lo que hará F-005 (FR-012, RN-35); sin eso, la prueba de anulación simultánea habría aceptado entregar a un pedido anulado |
| I-25 | 15/09 | `listarProductosParaPedido(idsActuales)` suma a los activos los productos que el pedido ya tiene, marcados "(inactivo)" | La edición debe poder mostrar y conservar esos productos (FR-006), igual que `listarRepresentantesParaSelector(idActual)` |
| I-26 | 15/09 | `bloquearPedido` lee el estado con `estado::text` | El tipo enumerado de PostgreSQL llega siempre como texto, sin depender de cómo lo convierta el adaptador |
| I-27 | 15/09 | La prueba de invariantes de pedidos busca escrituras (`producto.update`, `movimientoInventario`, `registrarMovimiento`, `$executeRaw`), no la palabra `stockActual` | El servicio de pedidos lee el stock para mostrarlo en el formulario (FR-005) |
| I-28 | 15/09 | Las distribuciones del detalle del pedido usan la insignia de compras (Registrada / Anulada) | Compras y distribuciones comparten el mismo estado de documento |
| I-29 | 15/09 | El recorrido de F-004 usó el mismo método que I-15, con las entregas simuladas en el script de carga | Mismo criterio: sin contraseñas en el navegador y sin datos en la base de desarrollo; PARCIAL, ATENDIDO y ANULADO con entregas se vieron en pantalla antes de F-005 |
| I-30 | 15/09 | Antes de implementar F-005, el análisis corrigió la especificación: la fecha futura tiene su propio mensaje, una línea del pedido no se repite en la distribución y la ficha del pedido muestra las unidades de cada distribución (SC-008); también el caso borde del pedido por atender con valores inactivos, para coincidir con I-23 | Sin la regla de línea repetida, la base rechazaba el envío con un error genérico; se corrigió primero `spec.md`, como manda la constitución |
| I-31 | 15/09 | La insignia Registrada / Anulada pasó a `src/componentes/ui/insignia-documento.tsx` y la usan compras, la ficha del pedido y distribuciones | La ficha del pedido la importaba desde la carpeta de compras (I-28); un componente compartido se explica mejor |
| I-32 | 15/09 | El formulario de distribución deriva su tipo de datos con `import type` de `obtenerPedidoParaDistribuir` | Un solo lugar define la forma del pedido para distribuir; la importación de solo tipos no lleva código del servidor al navegador |
| I-33 | 15/09 | El grupo de rutas `(impresion)` convive con `(sistema)/distribuciones/[id]` sin cambios: `npm run build` lista `/distribuciones/[id]/vale` | No hizo falta el plan B de V-09 |
| I-34 | 15/09 | Las pruebas de concurrencia de F-005 se ejecutaron tres veces seguidas antes de cerrar | Un resultado de concurrencia puede depender del orden; repetirlas descarta un verde por azar |
| I-35 | 15/09 | El recorrido de F-005 usó el mismo método que I-15 e I-29, con la distribución anulada y la registrada de nuevo cargadas por el script con los servicios reales | Mismo criterio: sin contraseñas en el navegador y sin datos en la base de desarrollo |
