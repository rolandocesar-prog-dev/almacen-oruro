# Contrato de Server Actions, servicios y rutas · F-003

**Plan**: [../plan.md](../plan.md) · **Especificación**: [../spec.md](../spec.md) · **Convenciones
comunes**: [F-001](../../001-acceso-personal/contracts/acciones-f001.md) y
[F-002](../../002-catalogos/contracts/acciones-f002.md) (`ResultadoAccion` con `enlace`, orden fijo
requerirSesion → Zod → servicio → errores → revalidar o redirigir).

## Cambios a las convenciones comunes

- `ResultadoAccion.errores` admite claves con **ruta** para datos anidados: `"lineas.1.cantidad"`.
  Las produce `erroresPorRuta(error: ZodError)` en `src/lib/errores.ts`. Los formularios de F-001 y
  F-002 no cambian: sus claves siguen siendo nombres de campo simples.
- `src/esquemas/comunes.ts` suma `montoPositivo(mensaje)` (precio obligatorio), `fechaNoFutura(mensaje)`
  y `esquemaRangoFechas` (desde, hasta, `desde ≤ hasta`). `esquemaPrecioReferencial` de F-002 pasa a
  construirse con `montoPositivo`, sin cambiar reglas ni mensajes.

---

## 1. Rutas

Todas bajo `src/app/(sistema)/`, protegidas con `requerirSesion()`.

| Ruta | Página | Parámetros (validados con Zod) |
|---|---|---|
| `/compras` | Listado de compras | `desde`, `hasta`, `proveedor`, `estado`, `factura`, `pagina` (data-model §5) |
| `/compras/nueva` | Registrar compra | — |
| `/compras/[id]` | Detalle de la compra y anulación | `aviso` = `registrada` |
| `/existencias` | Consulta de existencias | `q`, `categoria`, `estado`, `bajoMinimo` |
| `/existencias/verificacion` | Verificación de consistencia del inventario | — |
| `/kardex/[productoId]` | Kardex de un producto | `desde`, `hasta` |

Cambios en páginas existentes: menú (`layout.tsx`) con **Compras** y **Existencias**; inicio con sus
accesos; ficha del producto (`/productos/[id]`) con el enlace **"Ver kardex"**.

---

## 2. Server Actions

### Compras · `src/app/(sistema)/compras/acciones.ts`

| Acción | Entrada | Servicio (`src/servicios/compras.ts`) | Éxito | Errores de negocio |
|---|---|---|---|---|
| `registrarCompraAccion(datos: unknown)` | `esquemaCompra` (objeto, no `FormData`; research K-03) | `registrarCompra(datos, usuarioId)` | redirige a `/compras/[id]?aviso=registrada` | proveedor o producto inactivo; factura duplicada con enlace; total excedido |
| `verificarFacturaAccion(proveedorId: number, nroFactura: string)` | `esquemaVerificacionFactura` | `buscarFacturaVigente(proveedorId, nroFactura)` | `{ ok: true, datos: { duplicada: false } }` o `{ duplicada: true, compraId }` | — (datos inválidos devuelven `duplicada: false`: la validación completa ocurre al guardar) |
| `anularCompraAccion(compraId: number, estadoPrevio, formData)` | `esquemaAnulacion` | `anularCompra(compraId, motivo, usuarioId)` | `ok: true`, "Compra anulada. El stock de sus productos se revirtió."; revalida `/compras`, `/compras/[id]`, `/existencias` y `/kardex/[productoId]` de cada línea | inexistente; ya anulada; faltantes de stock (RN-25) |

No existe ninguna acción para editar ni borrar compras ni movimientos (FR-010).

---

## 3. Servicios

### `src/servicios/inventario.ts` (núcleo del stock, research K-01)

| Función | Parámetros | Devuelve | Notas |
|---|---|---|---|
| `bloquearProductos(tx, productoIds)` | transacción, ids | `Map<id, { codigo, nombre, stockActual }>` | `SELECT … ORDER BY id FOR UPDATE`; solo dentro de `$transaction` |
| `registrarMovimiento(tx, movimiento)` | `{ productoId, tipo, cantidad, fechaDocumento, compraId? , distribucionId?, usuarioId }` | `{ saldoResultante }` | **única** función que escribe `stockActual`; lanza "Stock insuficiente…" si el saldo quedaría negativo |
| `listarExistencias(filtro)` | `{ q?, categoriaId?, estado, soloBajoMinimo }` | `{ productos: [...], total, bajoMinimo }` | research K-07 |
| `obtenerKardex(productoId, rango)` | id, `{ desde?, hasta? }` | `{ producto, movimientos, saldoAnterior, saldoFinal } \| null` | research K-08 |
| `verificarConsistenciaInventario()` | — | `{ revisados, diferencias: [...] , verificadoEn }` | research K-08 |

### `src/servicios/compras.ts`

| Función | Parámetros | Devuelve |
|---|---|---|
| `registrarCompra(datos, usuarioId)` | `DatosCompra`, id del usuario de la sesión | `{ id }` |
| `anularCompra(compraId, motivo, usuarioId)` | id, texto, id | `{ productoIds }` (para revalidar sus kardex) |
| `buscarFacturaVigente(proveedorId, nroFactura)` | id, texto | `{ id } \| null` |
| `obtenerCompra(id)` | id | cabecera con proveedor, usuario que registró y anuló, líneas con producto y unidad, subtotales y total como texto con 2 decimales; o `null` |
| `listarCompras(filtro)` | data-model §5 | `{ compras: [...], total }` |
| `COMPRAS_POR_PAGINA` | — | `50` |

---

## 4. Componentes nuevos

| Componente | Tipo | Uso |
|---|---|---|
| `compras/formulario-compra.tsx` | cliente | cabecera, tabla de líneas con agregar y quitar, vista previa de subtotales y total, aviso de factura duplicada |
| `compras/[id]/anular-compra.tsx` | cliente | motivo, confirmación y resultado |
| `compras/filtros-compras.tsx` | cliente | filtros del listado con `esquemaFiltroCompras` |
| `existencias/filtros-existencias.tsx` | cliente | filtros con `esquemaFiltroExistencias` |
| `kardex/[productoId]/filtro-kardex.tsx` | cliente | rango de fechas con `esquemaFiltroKardex` |
| `src/componentes/ui/paginacion.tsx` | servidor | "Anterior · Página n de m · Siguiente", extraído del historial de sesiones de F-001 |
