# Investigación técnica · F-002 Catálogos

**Fecha**: 2026-09-14 · **Plan**: [plan.md](plan.md)

F-002 **reutiliza** todas las decisiones de arquitectura de F-001
([`specs/001-acceso-personal/research.md`](../001-acceso-personal/research.md), R-01 a R-15) y el
código ya implementado: esquema de 18 tablas, `src/lib/*`, `useValidacion`, `Filtros`, `Campo`,
`Tabla`, `Aviso`, `ResultadoAccion` y el orden fijo de las Server Actions. Aquí solo se registran las
decisiones **nuevas** de este plan, con el mismo formato: **Decisión / Fundamento / Alternativas
descartadas**.

---

## C-01 · Búsqueda sin distinguir mayúsculas ni tildes (pendiente R-16 de F-001)

**Decisión**: filtrar **en el servicio, en memoria**:

1. Prisma trae los registros del estado pedido (activos, inactivos o todos), con los filtros exactos
   que tenga el listado (por ejemplo, la categoría de un producto).
2. Una función pura `coincideBusqueda(texto, ...campos)` de `src/lib/texto.ts` compara el texto
   buscado con cada campo después de pasar ambos por `paraBuscar()`: minúsculas, espacios simples y
   **sin tildes** (`normalize("NFD")` y quitar las marcas diacríticas).
3. Se ordena por nombre con `localeCompare(…, "es")`.

**Fundamento**:
- El volumen de los catálogos es de decenas de registros (S-05: unos 25 productos, 5 representantes,
  6 categorías). Traerlos todos tarda milisegundos.
- La regla "sin tildes" queda en una función de TypeScript de tres líneas, probada con pruebas
  unitarias ("lavandína" encuentra "Lavandina"), en lugar de una extensión de PostgreSQL.
- No requiere cambios en la base ni SQL escrito a mano (constitución, principios I y VII).

**Alternativas descartadas**:
- *Extensión `unaccent` de PostgreSQL con `ILIKE`*: exige crear la extensión en una migración y
  consultas con SQL crudo, porque Prisma no la expone; más difícil de explicar para el mismo resultado.
- *Columna `busqueda_normalizada` por tabla*: agrega columnas y la obligación de mantenerlas en cada
  guardado, para un volumen que no lo necesita.
- *`mode: "insensitive"` de Prisma* (usado en F-001 para personal): distingue tildes; no cumple FR-007.

**Límite conocido**: si un catálogo superara unos pocos miles de registros, convendría pasar a
`unaccent`. Queda anotado en `docs/trabajo-futuro.md`.

---

## C-02 · Paginación de listados (pendiente R-16 de F-001)

**Decisión**: los listados de catálogos **no se paginan**. Muestran todos los registros que cumplen
los filtros, con el total ("25 productos").

**Fundamento**: con decenas de registros, una tabla completa se lee y se busca más rápido que una
paginada (SC-006: encontrar un registro en menos de 10 s), y el código queda más simple. El historial
de sesiones de F-001 sí se pagina porque crece sin límite; los catálogos no.

**Alternativas descartadas**: paginar de 50 en 50 como las sesiones (complejidad sin beneficio con
este volumen); desplazamiento infinito (más difícil de imprimir y de explicar).

---

## C-03 · Organización del código de siete catálogos

**Decisión**: **un archivo por catálogo** en cada capa, escrito de forma explícita, con un archivo de
utilidades comunes pequeño:

| Capa | Archivos |
|---|---|
| Esquemas | `src/esquemas/comunes.ts` (textos obligatorios y opcionales, teléfono, filtro de estado, ya usados por personal) · `src/esquemas/catalogos/{categoria,unidad-medida,producto,proveedor,centro-salud,representante,proveedor-producto}.ts` |
| Servicios | `src/servicios/catalogos/comun.ts` (mensajes de duplicado, detección de P2002, orden y búsqueda) · un archivo por catálogo con `registrar…`, `modificar…`, `desactivar…`, `reactivar…`, `obtener…`, `listar…` y `listar…ParaSelector` |
| Páginas | `src/app/(sistema)/{categorias,unidades,productos,proveedores,centros-salud,representantes}/` con `page.tsx`, `nuevo/`, `[id]/`, `[id]/editar/`, `acciones.ts`, `formulario-….tsx` y `filtros-….tsx` |
| Componentes compartidos | `src/componentes/catalogos/cambio-de-estado.tsx` (el de F-001 generalizado con el texto de confirmación) · `src/componentes/catalogos/insignia-estado.tsx` |

**Fundamento**: siete archivos parecidos pero explícitos se leen y se explican uno por uno; cada regla
especial (RN-13, RN-16, RN-17) queda en el archivo de su catálogo, donde se la busca.

**Alternativas descartadas**: un "CRUD genérico" parametrizado por catálogo (metaprogramación que la
constitución prohíbe en el principio I); una sola página con pestañas para todos los catálogos (mezcla
reglas distintas en un mismo archivo).

---

## C-04 · Duplicado de un registro inactivo: mensaje con enlace para reactivarlo

**Decisión**: agregar a `ErrorDeNegocio` y a `ResultadoAccion` un campo opcional
`enlace?: { texto: string; ruta: string }`. Cuando el valor repetido pertenece a un registro inactivo,
el servicio lanza, por ejemplo:

> "Ya existe un proveedor inactivo con el NIT '1020304050'." · enlace: "Ver y reactivar" →
> `/proveedores/7`

Los formularios muestran el enlace dentro del aviso de error. La reactivación se hace desde la ficha,
con la misma acción de siempre.

**Fundamento**: cumple el caso borde "¿Deseas reactivarlo?" sin reactivar nada por sorpresa y sin una
acción nueva: la ficha ya tiene el botón "Reactivar" y ahí se ven los datos antes de decidir.

**Alternativas descartadas**: botón "Reactivar" dentro del formulario de alta (reactivaría un registro
con datos viejos que el usuario no está viendo); solo texto sin enlace (obliga a buscarlo a mano).

---

## C-05 · Normalización de cada campo único

**Decisión** (sobre el esquema ya creado en F-001, sin cambios):

| Campo | Qué se guarda para mostrar | Qué lleva la restricción UNIQUE |
|---|---|---|
| Nombre de categoría, unidad, producto y centro de salud | `recortarEspacios(nombre)` | `nombre_normalizado = normalizarTexto(nombre)` |
| Código de producto | recortado y en mayúsculas | el mismo `codigo` |
| NIT | recortado (solo dígitos) | el mismo `nit` |
| CI | recortado y en mayúsculas | el mismo `ci` |
| Par proveedor–producto | — | `(proveedor_id, producto_id)` |

El servicio verifica primero (para dar el mensaje con el campo y avisar si el existente está
inactivo) y la restricción de la base decide en caso de guardados simultáneos (error P2002 convertido
al mismo mensaje).

**Fundamento**: aplica research R-06 de F-001 a cada catálogo.

---

## C-06 · Reglas que dependen de otras tablas (RN-13, RN-16, RN-17)

**Decisión**: se implementan ahora en los servicios de catálogo, con consultas de conteo sobre tablas
que ya existen aunque sus pantallas lleguen después:

| Regla | Consulta |
|---|---|
| RN-13 categoría / unidad | `producto.count({ where: { categoriaId, activo: true } })` |
| RN-13 centro de salud | `representante.count({ where: { centroSaludId, activo: true } })` |
| RN-13 representante | `pedido.count({ where: { representanteId, estado: { in: ["PENDIENTE", "PARCIAL"] } } })` |
| RN-13 producto | pedidos distintos con alguna línea del producto en pedido PENDIENTE o PARCIAL y `cantidad_entregada < cantidad_solicitada` |
| RN-16 unidad de producto | `movimientoInventario.count({ where: { productoId } }) > 0` al cambiar `unidadMedidaId` |
| RN-17 reactivación | leer categoría y unidad (producto) o centro (representante) y exigir que estén activos |

Cada verificación y el cambio de estado van en una **transacción interactiva** de Prisma.

**Fundamento**: las reglas pertenecen al catálogo (la baja es del catálogo), y las pruebas de
integración pueden insertar pedidos y movimientos de prueba directamente, sin esperar a F-003–F-005.

**Riesgo aceptado**: dos operaciones simultáneas (desactivar una categoría mientras otra sesión crea un
producto en ella) podrían cruzarse. Con 1 a 3 usuarios es improbable y el efecto es menor (un producto
activo con categoría inactiva, que se corrige reactivando la categoría). Se documenta en lugar de
bloquear filas.

---

## C-07 · Selectores de registros activos (FR-003, FR-022)

**Decisión**: cada servicio exporta `listar…ParaSelector(idActual?)`, que devuelve `{ id, etiqueta }`
de los **activos**, ordenados, e incluye además el registro con `idActual` si está inactivo, marcado
"(inactivo)", para que un formulario de edición no pierda su valor actual. Los usarán también F-003
(proveedores, productos) y F-004 (representantes, productos).

El formulario de representante preselecciona el centro de salud cuando `listarCentrosSaludParaSelector()`
devuelve uno solo (FR-022); si no hay ninguno activo, muestra el aviso "No hay centros de salud
activos: registra o reactiva uno primero".

**Fundamento**: una sola función por catálogo decide qué se puede elegir; así la regla RN-14 no se
repite en cada pantalla.

---

## C-08 · Precio referencial

**Decisión**: el formulario lo recibe como texto; el esquema acepta vacío (sin precio) o un número con
hasta 2 decimales, admitiendo coma o punto (`12,50` o `12.50`), mayor que 0 y hasta 9 999 999 999,99.
El servicio lo guarda con `Prisma.Decimal` y la pantalla lo muestra con 2 decimales y coma
("Bs 12,50").

**Fundamento**: en Bolivia se escribe con coma; convertir en el esquema evita errores de redondeo de
los números de coma flotante (CHECK `proveedor_producto_precio_positivo` como respaldo).

---

## C-09 · Aviso de stock y confirmaciones

**Decisión**: la ficha del producto pasa al componente `CambioDeEstado` el texto de confirmación ya
armado con el stock actual ("Este producto tiene 15 unidades en stock. ¿Desactivarlo?"). Las demás
fichas usan un texto sin stock. La regla de baja (RN-13) se verifica siempre en el servidor.

---

## C-10 · Menú del sistema

**Decisión**: el menú del layout agrupa las opciones: **Inicio · Catálogos** (Productos, Categorías,
Unidades, Proveedores, Centros de salud, Representantes) **· Personal · Sesiones · Cambiar mi
contraseña**. En pantallas chicas los enlaces pasan a varias líneas. La página de inicio suma los
accesos a los catálogos.

**Alternativas descartadas**: menú desplegable con JavaScript (más código de cliente que explicar);
barra lateral (ocupa espacio en pantallas chicas).

---

## C-11 · Datos de prueba de catálogos

**Decisión**: `tests/ayudantes/catalogos.ts` con funciones que crean categoría, unidad, producto,
proveedor, centro de salud y representante válidos con valores por defecto, y dos funciones para las
reglas que dependen de otras funcionalidades: `crearPedidoConSaldo(representanteId, productoId)` y
`crearMovimientoDePrueba(productoId)` (inserta una compra mínima y su movimiento, respetando las CHECK).

**Fundamento**: las pruebas de RN-13 y RN-16 se escriben ahora, contra la base real, sin depender de
los servicios de F-003 y F-004.

---

No quedan marcas **NEEDS CLARIFICATION**.
