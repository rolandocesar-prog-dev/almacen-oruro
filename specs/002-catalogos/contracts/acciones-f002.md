# Contrato de Server Actions, servicios y rutas · F-002

**Plan**: [../plan.md](../plan.md) · **Especificación**: [../spec.md](../spec.md) · **Convenciones
comunes**: [F-001 `contracts/acciones-f001.md`](../../001-acceso-personal/contracts/acciones-f001.md)
(`ResultadoAccion`, orden fijo requerirSesion → Zod → servicio → errores → revalidar/redirigir).

## Cambio a las convenciones comunes

`ErrorDeNegocio` y `ResultadoAccion` suman un campo opcional (research C-04):

```ts
enlace?: { texto: string; ruta: string }
```

Solo lo usan los duplicados de un registro inactivo. Los formularios lo muestran dentro del aviso de
error. No cambia nada de F-001.

---

## 1. Rutas

Todas bajo `src/app/(sistema)/`, protegidas con `requerirSesion()`.

| Catálogo | Listado | Alta | Ficha | Edición |
|---|---|---|---|---|
| Categorías | `/categorias` | `/categorias/nueva` | `/categorias/[id]` | `/categorias/[id]/editar` |
| Unidades de medida | `/unidades` | `/unidades/nueva` | `/unidades/[id]` | `/unidades/[id]/editar` |
| Productos | `/productos` | `/productos/nuevo` | `/productos/[id]` | `/productos/[id]/editar` |
| Proveedores | `/proveedores` | `/proveedores/nuevo` | `/proveedores/[id]` (incluye productos que ofrece) | `/proveedores/[id]/editar` |
| Centros de salud | `/centros-salud` | `/centros-salud/nuevo` | `/centros-salud/[id]` | `/centros-salud/[id]/editar` |
| Representantes | `/representantes` | `/representantes/nuevo` | `/representantes/[id]` | `/representantes/[id]/editar` |

**Parámetros de los listados** (validados con Zod; un valor inválido usa el valor por defecto):

| Parámetro | Listados | Valores | Por defecto |
|---|---|---|---|
| `q` | todos | texto de hasta 60 caracteres | vacío |
| `estado` | todos | `activos`, `inactivos`, `todos` | `activos` |
| `categoria` | productos | id de categoría | todas |
| `estado` (asociaciones) | ficha de proveedor, sección productos | `activas`, `inactivas` | `activas` |

**Campos en los que busca `q`** (sin mayúsculas ni tildes, research C-01):

| Listado | Campos |
|---|---|
| Categorías | nombre, descripción |
| Unidades | nombre, abreviatura |
| Productos | código, nombre |
| Proveedores | razón social, NIT, nombre de contacto |
| Centros de salud | nombre |
| Representantes | nombre, apellido, CI, servicio |

Sin resultados con búsqueda: "No hay resultados para '{q}'" y enlace "Limpiar búsqueda" (Historia 5, E3).

---

## 2. Server Actions por catálogo

Cada catálogo tiene su `acciones.ts` con las mismas cinco acciones. Se muestra el patrón con
categorías; las demás cambian el esquema, el servicio y las rutas.

| Acción | Entrada | Servicio | Éxito | Errores de negocio |
|---|---|---|---|---|
| `registrarCategoriaAccion(estadoPrevio, formData)` | `esquemaCategoria` | `registrarCategoria(datos)` | redirige a `/categorias/[id]?aviso=registrado` | duplicado (con enlace si está inactiva) |
| `modificarCategoriaAccion(id, estadoPrevio, formData)` | `esquemaCategoria` | `modificarCategoria(id, datos)` | redirige a `/categorias/[id]?aviso=modificado` | inexistente, duplicado |
| `desactivarCategoriaAccion(id)` | — | `desactivarCategoria(id)` | `ok: true` con mensaje | ya inactiva; RN-13 con conteo |
| `reactivarCategoriaAccion(id)` | — | `reactivarCategoria(id)` | `ok: true` con mensaje | ya activa |

| Catálogo | Esquema | Servicio (`src/servicios/catalogos/…`) | Reglas especiales en el servicio |
|---|---|---|---|
| Categorías | `esquemaCategoria` | `categorias.ts` | RN-13 (productos activos) |
| Unidades | `esquemaUnidadMedida` | `unidades-medida.ts` | RN-13 (productos activos) |
| Productos | `esquemaProducto` | `productos.ts` | categoría y unidad activas; RN-15 (sin `stockActual`); RN-16; RN-13 (pedidos con saldo); RN-17 |
| Proveedores | `esquemaProveedor` | `proveedores.ts` | — |
| Centros de salud | `esquemaCentroSalud` | `centros-salud.ts` | RN-13 (representantes activos) |
| Representantes | `esquemaRepresentante` | `representantes.ts` | centro activo; RN-13 (pedidos por atender); RN-17 |

### Proveedor–producto (P3) · `src/app/(sistema)/proveedores/[id]/acciones-productos.ts`

| Acción | Entrada | Servicio (`proveedor-producto.ts`) | Éxito | Errores |
|---|---|---|---|---|
| `asociarProductoAccion(proveedorId, estadoPrevio, formData)` | `esquemaProveedorProducto` | `asociarProducto(proveedorId, datos)` | `ok: true`, revalida la ficha | proveedor o producto inactivo; par repetido |
| `cambiarPrecioReferencialAccion(asociacionId, estadoPrevio, formData)` | `esquemaPrecioReferencial` | `cambiarPrecioReferencial(id, precio)` | `ok: true` | inexistente |
| `desactivarAsociacionAccion(asociacionId)` | — | `desactivarAsociacion(id)` | `ok: true` | ya inactiva |
| `reactivarAsociacionAccion(asociacionId)` | — | `reactivarAsociacion(id)` | `ok: true` | ya activa; proveedor o producto inactivo |

---

## 3. Consultas (Server Components)

| Función | Parámetros | Devuelve |
|---|---|---|
| `listarCategorias` | `{ q?, estado }` | `{ id, nombre, descripcion, activo, productosActivos }[]` |
| `listarUnidadesMedida` | `{ q?, estado }` | `{ id, nombre, abreviatura, activo, productosActivos }[]` |
| `listarProductos` | `{ q?, estado, categoriaId? }` | `{ id, codigo, nombre, categoria, unidad, stockActual, stockMinimo, activo, bajoMinimo }[]` |
| `listarProveedores` | `{ q?, estado }` | `{ id, razonSocial, nit, contactoNombre, telefono, activo }[]` |
| `listarCentrosSalud` | `{ q?, estado }` | `{ id, nombre, telefono, activo, representantesActivos }[]` |
| `listarRepresentantes` | `{ q?, estado }` | `{ id, nombreCompleto, ci, servicio, centroSalud, activo }[]` |
| `obtener…(id)` | id | ficha completa o `null` |
| `obtenerProducto(id)` | id | además `tieneMovimientos` (para bloquear la unidad en la edición) y `proveedores` activos que lo ofrecen con precio (FR-026) |
| `obtenerProveedor(id, { estadoAsociaciones })` | id | además la lista de productos que ofrece |
| `listar…ParaSelector(idActual?)` | id opcional | `{ id, etiqueta, activo }[]` (data-model §4) |

Todas ordenan por nombre en español (`localeCompare("es")`), salvo productos, que ordenan por código.
