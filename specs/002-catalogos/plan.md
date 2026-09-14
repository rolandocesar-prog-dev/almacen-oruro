# Plan de implementación: F-002 · Catálogos

**Rama**: `002-catalogos` (se trabaja en `main`) | **Fecha**: 2026-09-14 | **Especificación**: [spec.md](spec.md)

**Entrada**: especificación de `specs/002-catalogos/spec.md`, con 4 aclaraciones del 13/09 y la de
F-004 sobre representantes.

## Resumen

F-002 permite mantener los siete catálogos que usan compras, pedidos y distribuciones: categorías,
unidades de medida, productos, proveedores, qué productos ofrece cada proveedor, centros de salud y
representantes. Cada uno se registra, modifica, lista con búsqueda y filtro de estado, desactiva y
reactiva, sin borrar nunca; se rechazan los duplicados normalizados y se aplican las reglas de baja y
reactivación (RN-13, RN-16, RN-17).

**Enfoque técnico:** reutiliza por completo la arquitectura de F-001: el esquema de 18 tablas **no
cambia**, y cada catálogo sigue el patrón ya implementado para personal (esquema Zod compartido →
Server Action → servicio → Prisma), escrito de forma explícita en un archivo por catálogo. Las dos
decisiones pendientes se resuelven así: la **búsqueda sin tildes se filtra en memoria** con una
función pura, porque los catálogos tienen decenas de registros, y los **listados de catálogos no se
paginan** ([research C-01 y C-02](research.md)).

## Contexto técnico

**Lenguaje/Versión**: TypeScript 5.9.3 estricto sobre Node.js 22 LTS (sin cambios)

**Dependencias principales**: las de F-001, **sin dependencias nuevas**

**Almacenamiento**: PostgreSQL 16; tablas `categoria`, `unidad_medida`, `producto`, `proveedor`,
`proveedor_producto`, `centro_salud` y `representante` ya creadas; **sin migraciones nuevas**

**Pruebas**: Vitest, unitarias e integración contra PostgreSQL real, con ayudantes de datos de
catálogo ([research C-11](research.md#c-11--datos-de-prueba-de-catálogos))

**Plataforma**: la de F-001 (servidor Node.js local, Chrome o Edge, pantallas chicas)

**Tipo de proyecto**: aplicación web full-stack (un solo proyecto)

**Metas de rendimiento**: cualquier listado de catálogo con el volumen de demostración en menos de
1 s; registro de un producto en menos de 1 minuto (SC-001)

**Restricciones**: nada se borra; el catálogo nunca modifica `stock_actual`; nombres en español;
nada genérico ni metaprogramado

**Escala**: decenas de registros por catálogo (S-05: ~25 productos, ~6 categorías, 5 representantes,
1 centro de salud, pocos proveedores)

## Verificación contra la constitución

*Puerta: debe pasar antes de la investigación y otra vez después del diseño.*

| # | Principio | Cómo lo cumple este plan | Antes | Después del diseño |
|---|---|---|---|---|
| I | Explicabilidad | Un archivo explícito por catálogo en cada capa; sin CRUD genérico; búsqueda en una función de tres líneas; decisiones en `docs/decisiones.md` | ✅ | ✅ |
| II | Lógica en la aplicación | RN-13, RN-16 y RN-17 en `src/servicios/catalogos/`; la base respalda con UNIQUE, FK y CHECK ya existentes; sin SQL de negocio | ✅ | ✅ |
| III | Kardex como única fuente del stock | El esquema de producto no acepta `stockActual`; ningún servicio de catálogo lo escribe; prueba de SC-005 | ✅ | ✅ |
| IV | Documentos inmutables | No aplica: F-002 no crea documentos; los documentos futuros muestran el valor vigente del catálogo (FR-027) | ✅ | ✅ |
| V | Baja lógica | `desactivar…`/`reactivar…` en los 7 catálogos; ninguna función de borrado (prueba de FR-002); selectores solo con activos | ✅ | ✅ |
| VI | Validación en dos lugares | Un esquema por catálogo y por filtro, compartido por formulario y acción; mensajes en español | ✅ | ✅ |
| VII | Seguridad básica | `requerirSesion()` en cada página y acción; acceso solo por Prisma | ✅ | ✅ |
| VIII | IA transparente | No aplica | ✅ | ✅ |
| IX | Pruebas donde duele | Duplicados, reglas de baja y reactivación, stock intocable, selectores y ausencia de borrado ([quickstart §2](quickstart.md#2-pruebas-automatizadas)) | ✅ | ✅ |
| X | Idioma y nombres | Rutas, servicios y esquemas en español | ✅ | ✅ |
| XI | Alcance cerrado | Solo lo especificado; importación masiva, imágenes y lotes siguen fuera; límite de la búsqueda en memoria anotado en `docs/trabajo-futuro.md` | ✅ | ✅ |

**Resultado:** sin violaciones.

## Estructura del proyecto

### Documentación (esta funcionalidad)

```text
specs/002-catalogos/
├── plan.md              # Este archivo
├── research.md          # Fase 0: 11 decisiones (C-01 a C-11)
├── data-model.md        # Fase 1: validaciones por catálogo, duplicados, ciclo de vida y selectores
├── quickstart.md        # Fase 1: pruebas mínimas y recorrido de 18 pasos
├── contracts/
│   └── acciones-f002.md # Rutas, Server Actions, servicios y consultas
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Código fuente (lo que agrega o cambia F-002)

```text
src/
├── lib/
│   ├── errores.ts                     # CAMBIA: campo opcional `enlace` (research C-04)
│   └── texto.ts                       # CAMBIA: paraBuscar() y coincideBusqueda() (research C-01)
├── esquemas/
│   ├── comunes.ts                     # NUEVO: textoObligatorio, textoOpcional, telefono, filtro de estado
│   ├── personal.ts                    # CAMBIA: usa comunes.ts (sin cambiar sus reglas)
│   └── catalogos/
│       ├── categoria.ts
│       ├── unidad-medida.ts
│       ├── producto.ts
│       ├── proveedor.ts
│       ├── proveedor-producto.ts
│       ├── centro-salud.ts
│       └── representante.ts
├── servicios/catalogos/
│   ├── comun.ts                       # mensajes de duplicado, P2002, orden en español
│   ├── categorias.ts
│   ├── unidades-medida.ts
│   ├── productos.ts
│   ├── proveedores.ts
│   ├── proveedor-producto.ts
│   ├── centros-salud.ts
│   └── representantes.ts
├── componentes/
│   ├── ui/aviso.tsx                   # CAMBIA: muestra el enlace opcional
│   └── catalogos/
│       ├── cambio-de-estado.tsx       # generalización del componente de personal
│       └── insignia-estado.tsx        # "Activo" / "Inactivo" / "Bajo mínimo"
└── app/(sistema)/
    ├── layout.tsx                     # CAMBIA: menú con Catálogos (research C-10)
    ├── page.tsx                       # CAMBIA: accesos a catálogos
    ├── personal/[id]/                 # CAMBIA: usa componentes/catalogos/cambio-de-estado.tsx
    ├── categorias/                    # page, nueva/, [id]/, [id]/editar/, acciones.ts, formulario, filtros
    ├── unidades/                      # ídem
    ├── productos/                     # ídem + filtro por categoría
    ├── proveedores/                   # ídem + [id]/acciones-productos.ts y sección de productos
    ├── centros-salud/                 # ídem
    └── representantes/                # ídem
tests/
├── ayudantes/catalogos.ts             # NUEVO (research C-11)
├── unitarios/                         # texto (búsqueda) y esquemas de catálogos
└── integracion/                       # un archivo por catálogo + proveedor-producto
```

**Decisión de estructura:** la misma de F-001 ([plan F-001](../001-acceso-personal/plan.md#estructura-del-proyecto)),
con subcarpetas `catalogos/` en esquemas y servicios para no mezclar siete catálogos con acceso y
personal.

## Fases de este comando

| Fase | Artefacto | Estado |
|---|---|---|
| 0 · Investigación | [research.md](research.md): búsqueda sin tildes, paginación, organización, duplicado inactivo con enlace, normalización, reglas con otras tablas, selectores, precio, confirmaciones, menú, datos de prueba | ✅ Sin pendientes |
| 1 · Diseño | [data-model.md](data-model.md): sin cambios de esquema; validaciones, mensajes y ciclo de vida | ✅ |
| 1 · Contratos | [contracts/acciones-f002.md](contracts/acciones-f002.md) | ✅ |
| 1 · Validación | [quickstart.md](quickstart.md) | ✅ |
| 2 · Tareas | `tasks.md` | Pendiente: `/speckit-tasks` |

## Cambios que este plan introduce en otros documentos y código existente

- **Esquema de base de datos:** ninguno.
- `src/lib/errores.ts` y `src/componentes/ui/aviso.tsx`: campo opcional `enlace`, compatible con F-001.
- `src/esquemas/personal.ts`: los ayudantes de texto pasan a `src/esquemas/comunes.ts`; las reglas y
  mensajes de personal no cambian (sus pruebas deben seguir en verde).
- `src/app/(sistema)/personal/[id]/cambio-de-estado.tsx` pasa a `src/componentes/catalogos/` y se
  generaliza con el texto de confirmación.
- `specs/001-acceso-personal/contracts/rutas.md`: altas `nueva` para categorías y unidades.
- `docs/trabajo-futuro.md`: límite de la búsqueda en memoria (research C-01).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Siete catálogos son mucho código para un día (15/09) | Orden de corte por historia: H1 a H4 (P1) primero; H5 (P2) ya viene casi incluida; H6 proveedor–producto (P3) es lo primero que se posterga |
| Carreras entre bajas y altas simultáneas (research C-06) | Aceptado y documentado; efecto menor y reversible |
| Cambiar `personal.ts` al extraer ayudantes rompe F-001 | Las 77 pruebas de F-001 deben seguir en verde antes de avanzar |

## Seguimiento de complejidad

Sin violaciones de la constitución que justificar.
