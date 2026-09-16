# Contrato de rutas · Sistema completo

**Plan**: [../plan.md](../plan.md)

Mapa de las páginas del sistema. F-001 implementa las marcadas **F-001**; las demás se reservan para
que los planes siguientes usen los mismos nombres. Todas las rutas usan el App Router de Next.js.

## Reglas de acceso

| Grupo | Carpeta | Quién entra | Comprobación |
|---|---|---|---|
| Público | `src/app/ingreso/` | cualquiera sin sesión; con sesión vigente se redirige a `/` | `proxy.ts` (optimista) + la propia página |
| Sistema | `src/app/(sistema)/` | solo con sesión vigente | `requerirSesion()` al inicio de **cada** página y **cada** Server Action, salvo `salir()`, que debe funcionar con la sesión vencida o con cambio de contraseña pendiente |
| Cambio obligatorio | `src/app/(sistema)/cambiar-contrasena/` | con sesión vigente, aunque tenga el cambio de contraseña pendiente | `requerirSesion({ permitirCambioPendiente: true })` |

- `proxy.ts` solo mira si existe la cookie `sesion`: sin cookie, cualquier ruta del grupo Sistema
  redirige a `/ingreso`. No consulta la base.
- `requerirSesion()` (en `src/lib/sesion.ts`) es la comprobación que vale: sin sesión vigente redirige a
  `/ingreso` (con `?expirada=1` si expiró); con el cambio de contraseña pendiente redirige a
  `/cambiar-contrasena`.

## Páginas

| Ruta | Página | Funcionalidad |
|---|---|---|
| `/ingreso` | Inicio de sesión | **F-001** |
| `/` | Inicio (menú y datos del usuario) | **F-001** |
| `/cambiar-contrasena` | Cambiar mi contraseña (también el cambio obligatorio) | **F-001** |
| `/personal` | Listado de personal con búsqueda y filtro de estado | **F-001** |
| `/personal/nuevo` | Registrar personal | **F-001** |
| `/personal/[id]` | Ficha de una persona (desactivar, reactivar, restablecer contraseña) | **F-001** |
| `/personal/[id]/editar` | Modificar datos de una persona | **F-001** |
| `/sesiones` | Historial de sesiones | **F-001** |
| `/categorias`, `/unidades`, `/productos`, `/proveedores`, `/centros-salud`, `/representantes` | Catálogos (listado, `nuevo` o `nueva`, `[id]`, `[id]/editar`; detalle en `specs/002-catalogos/contracts/acciones-f002.md`) | F-002 |
| `/compras`, `/compras/nueva`, `/compras/[id]` | Compras (detalle en `specs/003-compras-inventario/contracts/acciones-f003.md`) | F-003 |
| `/existencias`, `/existencias/verificacion`, `/kardex/[productoId]` | Inventario | F-003 |
| `/pedidos`, `/pedidos/nuevo`, `/pedidos/[id]`, `/pedidos/[id]/editar` | Pedidos | F-004 |
| `/distribuciones`, `/distribuciones/nueva`, `/distribuciones/[id]`, `/distribuciones/[id]/vale` | Distribución | F-005 |
| `/reportes` (índice), `/reportes/compras`, `/reportes/distribuciones`, `/reportes/existencias`, `/reportes/kardex`, `/reportes/pedidos` y `/reportes/{reporte}/imprimir` | Reportes | F-006 |
| `/ia/pronostico`, `/ia/evaluacion`, `/ia/informes`, `/ia/informes/nuevo`, `/ia/informes/[id]` | Inteligencia artificial | F-007 |

## Parámetros de búsqueda de F-001

| Ruta | Parámetro | Valores | Por defecto |
|---|---|---|---|
| `/ingreso` | `expirada` | `1` muestra "Tu sesión expiró. Ingresa nuevamente" | — |
| `/personal` | `q` | texto a buscar en nombre, apellido o nombre de usuario | vacío |
| `/personal` | `estado` | `activos`, `inactivos`, `todos` | `activos` |
| `/sesiones` | `usuario` | id de usuario | todos |
| `/sesiones` | `desde`, `hasta` | fecha `AAAA-MM-DD` | primer día del mes en curso · hoy |
| `/sesiones` | `pagina` | entero ≥ 1 | 1 |
