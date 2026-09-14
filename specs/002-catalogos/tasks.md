---
description: "Lista de tareas de implementación de F-002 · Catálogos"
---

# Tareas: F-002 · Catálogos

**Entrada**: documentos de diseño de `specs/002-catalogos/`

**Prerrequisitos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/acciones-f002.md](contracts/acciones-f002.md),
[quickstart.md](quickstart.md). F-001 implementada (arquitectura, esquema de 18 tablas, componentes).

**Pruebas**: se incluyen (constitución, principio IX; [quickstart §2](quickstart.md#2-pruebas-automatizadas)).
Las de integración usan PostgreSQL real: **Docker Desktop debe estar abierto**.

**Sin migraciones ni dependencias nuevas** (plan, "Contexto técnico").

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[US#]**: historia de usuario de [spec.md](spec.md)

| Etiqueta | Historia de spec.md | Prioridad |
|---|---|---|
| US1 | Historia 1 · Mantener categorías y unidades de medida | P1 |
| US2 | Historia 2 · Mantener productos | P1 |
| US3 | Historia 3 · Mantener proveedores | P1 |
| US4 | Historia 4 · Mantener el centro de salud y sus representantes | P1 |
| US5 | Historia 5 · Buscar y filtrar en los listados | P2 |
| US6 | Historia 6 · Indicar qué productos ofrece cada proveedor | P3 |

**Patrón de cada catálogo** (lo siguen US1 a US4; se describe una vez para no repetirlo):

- **Listado** `page.tsx`: `requerirSesion()`; valida `searchParams` con el esquema de filtro (valor
  inválido → valores por defecto); tabla con las columnas de la tarea, total de registros e insignia de
  estado; botón de alta.
- **Alta** `nuevo/page.tsx` o `nueva/page.tsx` y **edición** `[id]/editar/page.tsx` con un único
  `formulario-….tsx` de cliente (`useValidacion` + `useActionState`, conserva lo escrito si el servidor
  rechaza, muestra el enlace del aviso si viene).
- **Ficha** `[id]/page.tsx`: datos, `?aviso=registrado|modificado`, botón "Editar" y
  `CambioDeEstado` con su texto de confirmación; `notFound()` si no existe.
- **Acciones** `acciones.ts`: `registrar…Accion`, `modificar…Accion(id, …)`, `desactivar…Accion(id)`,
  `reactivar…Accion(id)`, en el orden fijo requerirSesion → Zod → servicio → `aResultadoDeError` →
  `revalidatePath` → redirigir o devolver resultado ([contrato §2](contracts/acciones-f002.md#2-server-actions-por-catálogo)).
- **Filtros** `filtros-….tsx` de cliente con `Filtros` y el esquema de filtro del catálogo.

---

## Fase 1: Preparación

**Propósito**: confirmar que el punto de partida está sano antes de tocar código compartido.

- [X] T001 Verificar el entorno: `docker info` responde, el contenedor `almacen-oruro-postgres` está *healthy*, y `npm run lint`, `npm run typecheck` y `npm test` terminan sin errores con las 77 pruebas de F-001 en verde; anotar el resultado para compararlo al final

---

## Fase 2: Fundamentos (bloquea todas las historias)

**Propósito**: utilidades y componentes que usan los siete catálogos.

**⚠️ CRÍTICO**: ninguna historia empieza antes de terminar esta fase.

- [X] T002 [P] Agregar a `src/lib/errores.ts` el campo opcional `enlace?: { texto: string; ruta: string }` en `ErrorDeNegocio` (tercer parámetro del constructor), en la variante `ok: false` de `ResultadoAccion` y en lo que devuelve `aResultadoDeError`; y hacer que `src/componentes/ui/aviso.tsx` acepte `enlace` y lo muestre como `<a>` subrayado al final del mensaje (research C-04). Sin cambios de comportamiento para F-001
- [X] T003 [P] Agregar a `src/lib/texto.ts` `paraBuscar(valor: string): string` (minúsculas, espacios simples, sin tildes con `normalize("NFD").replace(/\p{Diacritic}/gu, "")`) y `coincideBusqueda(texto: string | undefined, ...campos: (string | null | undefined)[]): boolean` (verdadero si `texto` está vacío o si `paraBuscar(texto)` está contenido en `paraBuscar` de algún campo), y `compararEnEspanol(a: string, b: string)` con `localeCompare(b, "es", { sensitivity: "base" })`, cada una con comentario del porqué (research C-01); agregar casos a `tests/unitarios/texto.test.ts`: "lavandína" y "LAVA" encuentran "Lavandina 1 L", texto vacío coincide con todo, campo `null` no rompe, "Álvarez" se ordena antes que "Beltrán"
- [X] T004 [P] Agregar a `src/lib/prisma.ts` la función `esErrorDeDuplicado(error: unknown): boolean` (error de Prisma con código `P2002`) y usarla en `src/servicios/personal.ts` en lugar de la función local `esDuplicado`
- [X] T005 Crear `src/esquemas/comunes.ts` moviendo desde `src/esquemas/personal.ts` los ayudantes `textoObligatorio(queFalta, campo, maximo)` y `textoOpcional(campo, maximo)` (exportados), y agregando `telefonoOpcional()` (opcional, hasta 20, `^[0-9 +-]*$`, mensajes "El teléfono admite hasta 20 caracteres" y "El teléfono solo admite dígitos, espacios, + y -"), `idObligatorio(mensaje)` (`z.coerce.number().int().positive()` con el mensaje dado, vacío incluido) y `esquemaFiltroCatalogo` (`q`: texto opcional recortado de hasta 60 con "La búsqueda admite hasta 60 caracteres"; `estado`: `activos` | `inactivos` | `todos` con `.catch("activos")`); hacer que `src/esquemas/personal.ts` importe estos ayudantes y derive `esquemaFiltroPersonal` de `esquemaFiltroCatalogo`, sin cambiar ninguna regla ni mensaje; ejecutar `npm test` y confirmar que las pruebas de F-001 siguen en verde
- [X] T006 [P] Crear `src/servicios/catalogos/comun.ts` con `mensajeDuplicado({ articulo, catalogo, inactivo, campo, valor })` que arma "Ya existe {una categoría|un producto…}[ inactivo/a] con el {campo} '{valor}'" según data-model §2, y `errorDuplicado(opciones & { ruta, campoFormulario })` que devuelve el `ErrorDeNegocio` con `enlace: { texto: "Ver y reactivar", ruta }` solo si el existente está inactivo; y `pluralizar(n, singular, plural)` para los mensajes de RN-13 ("1 producto activo usa", "4 productos activos usan")
- [X] T007 [P] Crear `src/componentes/catalogos/cambio-de-estado.tsx` generalizando `src/app/(sistema)/personal/[id]/cambio-de-estado.tsx`: props `activo`, `ocultarDesactivar?: boolean`, `confirmacionDesactivar: string`, `desactivar`, `reactivar`; mover el uso de la ficha de personal a este componente (con `ocultarDesactivar` para la ficha propia) y borrar el archivo viejo; y crear `src/componentes/catalogos/insignia-estado.tsx` con las variantes "Activo", "Inactivo" y "Bajo mínimo" (colores con contraste accesible)
- [X] T008 Modificar el menú de `src/app/(sistema)/layout.tsx` para agrupar: Inicio · Catálogos (Productos, Categorías, Unidades, Proveedores, Centros de salud, Representantes) · Personal · Sesiones · Cambiar mi contraseña, con los enlaces de catálogos en una segunda fila que se ajusta en pantallas chicas (research C-10); y agregar esos accesos en `src/app/(sistema)/page.tsx`
- [X] T009 [P] Crear `tests/ayudantes/catalogos.ts` (research C-11) con `crearCategoriaDePrueba`, `crearUnidadDePrueba`, `crearProductoDePrueba` (crea categoría y unidad si no se pasan), `crearProveedorDePrueba`, `crearCentroSaludDePrueba`, `crearRepresentanteDePrueba` (crea centro si no se pasa), todas con valores válidos únicos y opción de `activo: false`; `crearPedidoConSaldo({ representanteId, productoId, estado = "PENDIENTE", solicitada = 10, entregada = 0 })` que inserta un pedido con un usuario de prueba y su línea; y `crearMovimientoDePrueba(productoId)` que inserta una compra REGISTRADA mínima (proveedor de prueba, total 10, una línea 1 × 10) y un movimiento `ENTRADA_COMPRA` de +1 con saldo 1, actualizando `stockActual` a 1, respetando las CHECK de data-model §4 de F-001

**Punto de control**: `npm test` en verde (F-001 intacta más los casos nuevos de texto); `npm run typecheck` sin errores.

---

## Fase 3: Historia 1 · Categorías y unidades de medida (Prioridad: P1) 🎯 MVP

**Objetivo**: registrar, modificar, desactivar y reactivar categorías y unidades, con duplicados
normalizados y bajas rechazadas si tienen productos activos.

**Prueba independiente**: quickstart §3, pasos 1, 2 y 6.

### Pruebas de la Historia 1

- [X] T010 [P] [US1] Crear `tests/unitarios/esquemas-categoria-unidad.test.ts`: `esquemaCategoria` exige nombre ("Escribe el nombre"), máximo 60 ("El nombre admite hasta 60 caracteres") y descripción opcional hasta 200; `esquemaUnidadMedida` exige nombre hasta 40 y abreviatura obligatoria hasta 10
- [X] T011 [P] [US1] Crear `tests/integracion/catalogo-categorias.test.ts`: registrar guarda `nombre` recortado y `nombreNormalizado`; " desinfectantes " contra "Desinfectantes" lanza "Ya existe una categoría con el nombre 'Desinfectantes'" sin enlace; si la existente está inactiva, el mensaje dice "inactiva" y trae `enlace.ruta` `/categorias/{id}`; modificar al nombre de otra lanza el duplicado y al propio no; desactivar con 1 y 4 productos activos lanza "No se puede desactivar: 1 producto activo usa esta categoría" y "…: 4 productos activos usan esta categoría"; con productos solo inactivos se permite; reactivar funciona; `listarCategoriasParaSelector()` excluye inactivas e incluye la de `idActual` marcada inactiva; `listarCategorias({ estado })` filtra y trae `productosActivos`
- [X] T012 [P] [US1] Crear `tests/integracion/catalogo-unidades.test.ts` con los mismos casos que T011 para unidades de medida (mensajes con "unidad de medida", RN-13 "…usan esta unidad de medida") y que la abreviatura puede repetirse

### Implementación de la Historia 1

- [X] T013 [P] [US1] Crear `src/esquemas/catalogos/categoria.ts` (`esquemaCategoria`: `nombre` = `textoObligatorio("el nombre", "El nombre", 60)`, `descripcion` = `textoOpcional("La descripción", 200)`) y `src/esquemas/catalogos/unidad-medida.ts` (`esquemaUnidadMedida`: `nombre` hasta 40, `abreviatura` = `textoObligatorio("la abreviatura", "La abreviatura", 10)`), con sus tipos inferidos
- [X] T014 [US1] Crear `src/servicios/catalogos/categorias.ts` con `registrarCategoria`, `modificarCategoria`, `desactivarCategoria` (en `prisma.$transaction` interactiva: contar productos activos y rechazar con `pluralizar` si hay, RN-13), `reactivarCategoria`, `obtenerCategoria` (con `productosActivos`), `listarCategorias({ estado })` (ordenado con `compararEnEspanol`) y `listarCategoriasParaSelector(idActual?)` → `{ id, etiqueta, activo }[]`; verificación de duplicado por `nombreNormalizado` antes de guardar y conversión de `esErrorDeDuplicado` al mismo mensaje (research C-05, C-06, C-07)
- [X] T015 [US1] Crear `src/servicios/catalogos/unidades-medida.ts` con las mismas funciones que T014 para unidades (`listarUnidadesMedida`, `listarUnidadesParaSelector` con etiqueta "Bidón 5 L (BID5)")
- [X] T016 [P] [US1] Crear las páginas de categorías según el patrón: `src/app/(sistema)/categorias/page.tsx` (columnas Nombre, Descripción, Productos activos, Estado), `nueva/page.tsx`, `[id]/page.tsx` (confirmación "¿Desactivar la categoría '{nombre}'?"), `[id]/editar/page.tsx`, `acciones.ts`, `formulario-categoria.tsx` y `filtros-categorias.tsx` (solo estado en esta historia)
- [X] T017 [P] [US1] Crear las páginas de unidades según el patrón en `src/app/(sistema)/unidades/` (columnas Nombre, Abreviatura, Productos activos, Estado; `nueva/`, `[id]/`, `[id]/editar/`, `acciones.ts`, `formulario-unidad.tsx`, `filtros-unidades.tsx`)

**Punto de control**: T010–T012 en verde; quickstart pasos 1, 2 y 6 (este último con un producto de prueba insertado).

---

## Fase 4: Historia 2 · Productos (Prioridad: P1)

**Objetivo**: productos con código y nombre únicos, categoría y unidad activas, stock actual de solo
lectura, bloqueo de unidad con movimientos, bajas y reactivaciones con sus reglas e indicador "Bajo
mínimo".

**Prueba independiente**: quickstart §3, pasos 3 a 5; E6, E8 y E9 con pruebas de integración.

### Pruebas de la Historia 2

- [X] T018 [P] [US2] Crear `tests/unitarios/esquema-producto.test.ts`: `codigo` " lim-001 " → "LIM-001"; rechaza `LIM_001`, `LIM 001`, `BAÑ-001` y 21 caracteres con "Usa hasta 20 caracteres: letras sin Ñ ni tildes, dígitos y guion"; `nombre` hasta 80; `stockMinimo` "-1", "2.5" y "" con "El stock mínimo debe ser un número entero mayor o igual a 0"; `categoriaId` y `unidadMedidaId` vacíos con "Elige una categoría" y "Elige una unidad de medida"; un campo `stockActual` enviado no aparece en el resultado
- [X] T019 [P] [US2] Crear `tests/integracion/catalogo-productos.test.ts`: registrar empieza con `stockActual` 0 aunque los datos traigan `stockActual: 50`; duplicado de código (`lim-001` contra `LIM-001`) y de nombre (" lavandina  1 l " contra "Lavandina 1 L") con los mensajes de data-model §2; categoría o unidad inactivas se rechazan al registrar; modificar no cambia `stockActual`; cambiar la unidad con un movimiento (`crearMovimientoDePrueba`) lanza "La unidad de medida no puede cambiar: el stock y el historial de este producto están expresados en '{unidad}'" y sin movimientos se permite (RN-16); desactivar con stock 1 se permite; desactivar con 2 pedidos con saldo (`crearPedidoConSaldo`) lanza "No se puede desactivar: 2 pedidos tienen saldo pendiente de este producto" y con un pedido ATENDIDO o con `entregada = solicitada` no cuenta (RN-13); reactivar con categoría inactiva lanza "Primero reactiva la categoría '{nombre}'…" (RN-17); `listarProductos` marca `bajoMinimo` solo en activos con stock ≤ mínimo (RN-52); `obtenerProducto` informa `tieneMovimientos`; `listarProductosParaSelector` solo activos; modificar el código o el nombre al de otro producto lanza su duplicado y guardar con los propios no

### Implementación de la Historia 2

- [X] T020 [P] [US2] Crear `src/esquemas/catalogos/producto.ts` con `esquemaProducto`: `codigo` (recortado, `toUpperCase()`, `^[A-Z0-9-]{1,20}$`), `nombre` (`textoObligatorio`, 80), `descripcion` (`textoOpcional`, 200), `categoriaId` y `unidadMedidaId` con `idObligatorio`, `stockMinimo` (`z.coerce.number().int().min(0)` con el mensaje de data-model §1 y vacío rechazado); sin campo `stockActual` (Zod descarta claves desconocidas, RN-15)
- [X] T021 [US2] Crear `src/servicios/catalogos/productos.ts` con `registrarProducto` (verifica categoría y unidad activas, duplicado de código y de nombre normalizado, `stockActual` nunca en `data`), `modificarProducto` (RN-16: si cambia `unidadMedidaId` y hay movimientos, rechaza; categoría y unidad nuevas deben estar activas; nunca toca `stockActual`), `desactivarProducto` (RN-13 contando pedidos distintos PENDIENTE o PARCIAL con línea del producto y `cantidadEntregada < cantidadSolicitada`), `reactivarProducto` (RN-17), `obtenerProducto` (con categoría, unidad, `tieneMovimientos`), `listarProductos({ estado })` (ordenado por nombre con `compararEnEspanol`, FR-007, con `bajoMinimo`) y `listarProductosParaSelector(idActual?)` con etiqueta "LIM-001 · Lavandina 1 L (Bidón 5 L)"; comentario en cada regla con su RN
- [X] T022 [US2] Crear las páginas de productos según el patrón en `src/app/(sistema)/productos/`: listado con columnas Código, Nombre, Categoría, Unidad, Stock actual, Stock mínimo, Estado e insignia "Bajo mínimo"; `formulario-producto.tsx` con selectores de categoría y unidad (desde `listar…ParaSelector`), stock mínimo y, en edición, el stock actual como texto de solo lectura (sin `<input>` con nombre) y la unidad deshabilitada con la nota "No se puede cambiar: el producto tiene movimientos" cuando `tieneMovimientos`; ficha con categoría, unidad, stock actual, mínimo e insignias, y confirmación de baja con el stock: "Este producto tiene {n} unidades en stock. ¿Desactivarlo?" (research C-09); `nuevo/`, `[id]/editar/`, `acciones.ts`, `filtros-productos.tsx`

**Punto de control**: T018–T019 en verde; quickstart pasos 3 a 5.

---

## Fase 5: Historia 3 · Proveedores (Prioridad: P1)

**Objetivo**: proveedores con NIT único y datos de contacto validados.

**Prueba independiente**: quickstart §3, pasos 7 a 10.

### Pruebas de la Historia 3

- [X] T023 [P] [US3] Crear `tests/unitarios/esquema-proveedor.test.ts`: `razonSocial` obligatoria hasta 100; `nit` " 1020304050 " aceptado y `10203-04`, `1.020`, `ABC` rechazados con "El NIT solo admite dígitos"; más de 20 dígitos rechazado; `correo` `ventas@` rechazado con "Escribe un correo con el formato nombre@dominio.com" y `Ventas@Andina.BO` convertido a minúsculas; contacto hasta 80, teléfono y dirección opcionales
- [X] T024 [P] [US3] Crear `tests/integracion/catalogo-proveedores.test.ts`: duplicado de NIT con otra razón social lanza "Ya existe un proveedor con el NIT '1020304050'"; con el existente inactivo, mensaje "inactivo" y enlace `/proveedores/{id}`; dos proveedores con la misma razón social y distinto NIT se aceptan (FR-019); desactivar siempre se permite y reactivar también; `listarProveedoresParaSelector` solo activos con etiqueta "Razón social (NIT)"; modificar el NIT al de otro proveedor lanza el duplicado y guardar con el propio no

### Implementación de la Historia 3

- [X] T025 [P] [US3] Crear `src/esquemas/catalogos/proveedor.ts` con `esquemaProveedor`: `razonSocial` (100), `nit` (recortado, `^[0-9]{1,20}$`), `contactoNombre` (`textoOpcional`, 80), `telefono` (`telefonoOpcional`), `correo` (opcional, hasta 100, `z.email` con el mensaje de data-model §1, en minúsculas), `direccion` (`textoOpcional`, 150)
- [X] T026 [US3] Crear `src/servicios/catalogos/proveedores.ts` con `registrarProveedor`, `modificarProveedor`, `desactivarProveedor`, `reactivarProveedor`, `obtenerProveedor`, `listarProveedores({ estado })` y `listarProveedoresParaSelector(idActual?)`, con verificación de NIT duplicado incluidos inactivos
- [X] T027 [US3] Crear las páginas de proveedores según el patrón en `src/app/(sistema)/proveedores/` (listado con Razón social, NIT, Contacto, Teléfono, Estado; ficha con todos los datos; confirmación "¿Desactivar el proveedor '{razón social}'? Sus compras anteriores lo seguirán mostrando."; `nuevo/`, `[id]/editar/`, `acciones.ts`, `formulario-proveedor.tsx`, `filtros-proveedores.tsx`)

**Punto de control**: T023–T024 en verde; quickstart pasos 7 a 10.

---

## Fase 6: Historia 4 · Centro de salud y representantes (Prioridad: P1)

**Objetivo**: centros de salud y representantes con CI único, preselección del único centro activo y
reglas de baja y reactivación.

**Prueba independiente**: quickstart §3, pasos 11 a 13; E7 y E8 con pruebas de integración.

### Pruebas de la Historia 4

- [X] T028 [P] [US4] Crear `tests/unitarios/esquemas-centro-representante.test.ts`: `esquemaCentroSalud` (nombre obligatorio hasta 100, teléfono y dirección opcionales); `esquemaRepresentante`: `ci` " 4567890-1b " → "4567890-1B", rechaza `ABC123`, `4567890 1B` y 16 caracteres con "Usa dígitos y, si tiene complemento, un guion: 4567890-1B"; nombre y apellido hasta 60; servicio obligatorio hasta 60; `centroSaludId` vacío con "Elige un centro de salud"
- [X] T029 [P] [US4] Crear `tests/integracion/catalogo-centros-representantes.test.ts`: duplicado de nombre de centro normalizado y de CI (`4567890` repetido) con sus mensajes y enlace si está inactivo; registrar representante con centro inactivo se rechaza; desactivar centro con 1 representante activo lanza "No se puede desactivar: 1 representante activo pertenece a este centro"; desactivar representante con 3 pedidos PENDIENTE o PARCIAL lanza "No se puede desactivar: tiene 3 pedidos por atender" y con pedidos ATENDIDO o ANULADO se permite (RN-13); reactivar representante con centro inactivo lanza "Primero reactiva el centro de salud '{nombre}'" (RN-17); `listarCentrosSaludParaSelector` y `listarRepresentantesParaSelector` solo activos (etiqueta "Apellido, Nombre · Servicio"); modificar el CI al de otro representante o el nombre al de otro centro lanza el duplicado y guardar con los propios no

### Implementación de la Historia 4

- [X] T030 [P] [US4] Crear `src/esquemas/catalogos/centro-salud.ts` (`esquemaCentroSalud`: `nombre` 100, `telefono` `telefonoOpcional`, `direccion` 150) y `src/esquemas/catalogos/representante.ts` (`esquemaRepresentante`: `nombre` y `apellido` 60, `ci` recortado en mayúsculas con `max(15)` y `^[0-9]+(-[0-9A-Z]+)?$`, `servicio` 60, `telefono`, `centroSaludId` con `idObligatorio`)
- [X] T031 [US4] Crear `src/servicios/catalogos/centros-salud.ts` (registrar, modificar, desactivar con RN-13 de representantes activos, reactivar, obtener con `representantesActivos`, listar, `listarCentrosSaludParaSelector`) y `src/servicios/catalogos/representantes.ts` (registrar y modificar exigiendo centro activo y CI único; desactivar con RN-13 de pedidos por atender; reactivar con RN-17; obtener con el centro; listar con `nombreCompleto` y centro; `listarRepresentantesParaSelector`)
- [X] T032 [P] [US4] Crear las páginas de centros de salud según el patrón en `src/app/(sistema)/centros-salud/` (listado con Nombre, Teléfono, Representantes activos, Estado; `nuevo/`, `[id]/`, `[id]/editar/`, `acciones.ts`, `formulario-centro-salud.tsx`, `filtros-centros-salud.tsx`)
- [X] T033 [P] [US4] Crear las páginas de representantes según el patrón en `src/app/(sistema)/representantes/` (listado con Nombre completo, CI, Servicio, Centro de salud, Estado); `formulario-representante.tsx` con selector de centro que queda **preseleccionado** cuando `listarCentrosSaludParaSelector()` devuelve uno solo (FR-022) y, si no hay ninguno activo, muestra "No hay centros de salud activos: registra o reactiva uno primero" con enlace a `/centros-salud/nuevo` y el botón de guardar deshabilitado; `nuevo/`, `[id]/`, `[id]/editar/`, `acciones.ts`, `filtros-representantes.tsx`

**Punto de control**: T028–T029 en verde; quickstart pasos 11 a 13.

---

## Fase 7: Historia 5 · Buscar y filtrar en los listados (Prioridad: P2)

**Objetivo**: búsqueda por texto parcial sin mayúsculas ni tildes en los seis listados, filtro por
categoría en productos y mensaje de "sin resultados".

**Prueba independiente**: quickstart §3, pasos 14 y 15.

### Pruebas de la Historia 5

- [ ] T034 [P] [US5] Crear `tests/integracion/catalogo-busqueda.test.ts`: con datos de los seis catálogos, `q` busca en los campos de [contrato §1](contracts/acciones-f002.md#1-rutas) ("lava" y "LAVANDÍNA" encuentran "Lavandina 1 L" por nombre y "LIM" por código; "andina" encuentra un proveedor por razón social y "1020" por NIT; "enferm" encuentra un representante por servicio); combina con `estado`; `listarProductos({ categoriaId })` filtra por categoría; los resultados siguen ordenados

### Implementación de la Historia 5

- [ ] T035 [US5] Agregar el parámetro `q` a `listarCategorias`, `listarUnidadesMedida`, `listarProductos` (más `categoriaId`), `listarProveedores`, `listarCentrosSalud` y `listarRepresentantes` en `src/servicios/catalogos/`, filtrando después de la consulta con `coincideBusqueda(q, ...campos)` sobre los campos del contrato §1 y con un comentario que remita a research C-01
- [ ] T036 [US5] Crear `esquemaFiltroProductos` en `src/esquemas/catalogos/producto.ts` (`esquemaFiltroCatalogo` + `categoria` opcional con `z.coerce.number().int().positive()`, vacío como ausente) y agregar a los seis `filtros-….tsx` el campo "Buscar" (`q`, máximo 60) y, en `filtros-productos.tsx`, el selector de categoría con todas las categorías (activas e inactivas, marcadas); en los seis `page.tsx`, pasar `q` al servicio y, si hay `q` y no hay filas, mostrar "No hay resultados para '{q}'" con el enlace "Limpiar búsqueda" que conserva el estado (Historia 5 · E3)

**Punto de control**: T034 en verde; quickstart pasos 14 y 15.

---

## Fase 8: Historia 6 · Productos que ofrece cada proveedor (Prioridad: P3)

**Objetivo**: asociar productos a un proveedor con precio referencial, sin repetir el par, y ver los
proveedores en la ficha del producto.

**Prueba independiente**: quickstart §3, pasos 16 y 17.

### Pruebas de la Historia 6

- [ ] T037 [P] [US6] Crear `tests/unitarios/esquema-proveedor-producto.test.ts`: `precioReferencial` vacío → `undefined`; "12,50" y "12.50" → "12.50"; "12,505", "0", "-3" y "abc" rechazados con "Escribe un precio mayor que 0 con hasta 2 decimales"; más de 9 999 999 999,99 rechazado; `productoId` vacío con "Elige un producto"
- [ ] T038 [P] [US6] Crear `tests/integracion/catalogo-proveedor-producto.test.ts`: asociar con precio 12,50 guarda `Decimal` 12.50; repetir el par lanza "Este proveedor ya ofrece '{producto}'" y, si la asociación estaba inactiva, el mensaje de data-model §2; proveedor o producto inactivos se rechazan; cambiar el precio a vacío lo deja en `null`; desactivar y reactivar la asociación; reactivar con producto inactivo lanza "No se puede reactivar: el producto '{nombre}' está inactivo"; `obtenerProveedor(id, { asociaciones: "activas" })` lista las activas y con `"inactivas"` las inactivas; `obtenerProducto` devuelve solo proveedores activos con asociación activa y su precio (FR-026)

### Implementación de la Historia 6

- [ ] T039 [P] [US6] Crear `src/esquemas/catalogos/proveedor-producto.ts` con `esquemaPrecioReferencial` (texto opcional: vacío → sin precio; reemplaza coma por punto; `^\d{1,10}(\.\d{1,2})?$`; mayor que 0; mensaje "Escribe un precio mayor que 0 con hasta 2 decimales") y `esquemaProveedorProducto` (`productoId` con `idObligatorio("Elige un producto")` + `precioReferencial`) (research C-08), y `esquemaFiltroAsociaciones` (`asociaciones`: `activas` | `inactivas`, con `.catch("activas")`)
- [ ] T040 [US6] Crear `src/servicios/catalogos/proveedor-producto.ts` con `asociarProducto(proveedorId, datos)`, `cambiarPrecioReferencial(asociacionId, precio)`, `desactivarAsociacion(id)` y `reactivarAsociacion(id)` según [contrato §2](contracts/acciones-f002.md#proveedorproducto-p3--srcappsistemaproveedoresidacciones-productosts), guardando el precio con `new Prisma.Decimal(...)`; ampliar `obtenerProveedor` en `proveedores.ts` con `productos` filtrados por `asociaciones` y `obtenerProducto` en `productos.ts` con `proveedores` activos (proveedor y asociación activos) y su precio
- [ ] T041 [US6] Crear `src/app/(sistema)/proveedores/[id]/acciones-productos.ts` con las cuatro acciones del contrato, y en `src/app/(sistema)/proveedores/[id]/page.tsx` la sección "Productos que ofrece": tabla con Código, Producto, Precio referencial ("Bs 12,50" o "—"), Estado y acciones (cambiar precio en línea, desactivar o reactivar), filtro de asociaciones `activas`/`inactivas` en el parámetro `asociaciones`, validado con `esquemaFiltroAsociaciones` en el formulario y en la página (principio VI), y formulario `asociar-producto.tsx` (selector con `listarProductosParaSelector` y precio) visible solo si el proveedor está activo; en `src/app/(sistema)/productos/[id]/page.tsx`, la sección "Proveedores que lo ofrecen" con razón social, NIT y precio

**Punto de control**: T037–T038 en verde; quickstart pasos 16 y 17.

---

## Fase 9: Cierre y aspectos transversales

- [ ] T042 [P] Crear `tests/integracion/catalogo-sin-borrado.test.ts` que importa todos los módulos de `src/servicios/catalogos/` y verifica que ningún nombre exportado contiene `borrar`, `eliminar` ni `delete` (FR-002), y, leyendo los archivos con `readFileSync`, que ningún archivo de `src/servicios/catalogos/` escribe `stockActual` en un `data:` de Prisma: el valor inicial 0 lo pone la base por defecto (SC-005, RN-15)
- [ ] T043 [P] Revisar con `grep` que todas las páginas nuevas bajo `src/app/(sistema)/{categorias,unidades,productos,proveedores,centros-salud,representantes}/` y todas sus funciones de `acciones*.ts` llaman a `requerirSesion` como primera instrucción, y que todo `searchParams` se valida con un esquema Zod; corregir lo que falte
- [ ] T044 [P] Revisar accesibilidad y pantallas chicas de los seis catálogos y el menú a 375 px: etiquetas en todos los campos, selectores con `<label>`, tablas con desplazamiento propio, menú sin desplazamiento horizontal
- [ ] T045 Ejecutar `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`; confirmar que las pruebas de F-001 siguen en verde junto con las de F-002 y corregir errores y advertencias
- [ ] T046 Ejecutar el recorrido de `specs/002-catalogos/quickstart.md` §3 (sin escribir contraseñas en el navegador: con una sesión de prueba, como en F-001), anotar en una sección "Estado de la validación" qué se verificó y qué queda pendiente, y medir SC-001 (registrar un producto en menos de 1 minuto) y SC-006 (encontrar un registro con la búsqueda en menos de 10 segundos)
- [ ] T047 [P] Actualizar `docs/decisiones.md` con una sección "Catálogos (plan de F-002, 14/09/2026)" que resuma C-01 a C-11 de `specs/002-catalogos/research.md` en el mismo formato de tabla que T-01 a T-15 (decisión, fundamento, alternativas descartadas, enlace), y con las decisiones de implementación que no estén en research.md (constitución, principio I); `docs/instalacion.md` con una sección breve "Cargar los catálogos" (orden sugerido: categorías, unidades, productos, proveedores, centro de salud, representantes) y `docs/especificacion/README.md` marcando F-002 como implementada

---

## Dependencias y orden de ejecución

### Entre fases

- **Preparación (fase 1)** → **Fundamentos (fase 2)** → historias → **Cierre (fase 9)**.
- En la fase 2, T002, T003, T004, T006, T007 y T009 tocan archivos distintos y van en paralelo; T005
  (esquemas comunes) va antes de las historias porque todos los esquemas de catálogo lo importan; T008
  (menú) no bloquea a nadie.

### Entre historias

| Historia | Depende de | Motivo |
|---|---|---|
| US1 Categorías y unidades | Fundamentos | — |
| US2 Productos | US1 | El producto exige categoría y unidad activas y sus selectores |
| US3 Proveedores | Fundamentos | Independiente de US1 y US2 |
| US4 Centros y representantes | Fundamentos | Independiente |
| US5 Búsqueda | US1 a US4 | Agrega `q` a los seis listados |
| US6 Proveedor–producto | US2 y US3 | Relaciona productos y proveedores |

US3 y US4 pueden hacerse en paralelo con US1–US2.

### Dentro de cada historia

Pruebas y esquemas [P] primero (las de integración deben fallar antes del servicio) → servicio →
acciones y páginas. Commit al terminar cada fase, sin líneas de autoría.

---

## Ejemplos de trabajo en paralelo

```text
# Fase 2:
T002 src/lib/errores.ts + aviso.tsx
T003 src/lib/texto.ts + pruebas
T004 src/lib/prisma.ts
T006 src/servicios/catalogos/comun.ts
T009 tests/ayudantes/catalogos.ts

# Historia 1, al empezar:
T010 tests/unitarios/esquemas-categoria-unidad.test.ts
T011 tests/integracion/catalogo-categorias.test.ts
T012 tests/integracion/catalogo-unidades.test.ts
T013 src/esquemas/catalogos/{categoria,unidad-medida}.ts

# Con US1 terminada, en paralelo:
US2 (productos) · US3 (proveedores) · US4 (centros y representantes)
```

---

## Estrategia de implementación

### MVP (Historia 1)

Fases 1, 2 y 3: categorías y unidades funcionando con duplicados y reglas de baja.

### Entrega incremental (martes 15/09)

| Paso | Fases | Resultado verificable |
|---|---|---|
| 1 | 1 y 2 | Utilidades comunes; F-001 intacta |
| 2 | 3 y 4 (US1, US2) | Catálogo de productos completo con sus reglas |
| 3 | 5 y 6 (US3, US4) | Proveedores y representantes listos para compras y pedidos |
| 4 | 7 (US5) | Búsqueda sin tildes en todos los listados |
| 5 | 8 (US6) | Precios referenciales por proveedor |
| 6 | 9 | Calidad, validación y documentación |

**Orden de corte** (`00-decisiones-y-alcance.md` §5): si el día se atrasa, se posterga primero **US6**
(P3) y después **US5** (P2). US1 a US4 son imprescindibles para F-003 y F-004.

---

## Notas

- [P] = archivos distintos y sin dependencias pendientes.
- Cada regla de negocio lleva en el código un comentario con su RN o FR y el porqué (principio I).
- Si aparece algo que la especificación no cubre, se corrige primero `spec.md` o
  `02-modelo-de-dominio.md`; no se improvisa en el código.
