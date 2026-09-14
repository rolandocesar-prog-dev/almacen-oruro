# Plan de implementación: F-001 · Acceso y personal

**Rama**: `001-acceso-personal` (se trabaja en `main`) | **Fecha**: 2026-09-13 | **Especificación**: [spec.md](spec.md)

**Entrada**: especificación de `specs/001-acceso-personal/spec.md`, con 5 aclaraciones del 13/09.

**Alcance especial de este plan:** además de F-001, fija la **arquitectura de todo el sistema** y el
**esquema completo de datos (18 tablas)**. Los planes de F-002 a F-007 lo reutilizan y solo agregan lo
propio de cada funcionalidad.

## Resumen

F-001 permite ingresar al sistema con usuario y contraseña, cerrar sesión, expirar sesiones a las 8
horas, registrar y mantener al personal con baja lógica, cambiar la propia contraseña, restablecer la
de otra persona con cambio obligatorio y consultar la bitácora de sesiones.

**Enfoque técnico:** aplicación única Next.js 16 (App Router) con TypeScript estricto. Las páginas
llaman a Server Actions, que validan con esquemas Zod compartidos con el formulario y llaman a
servicios de `src/servicios/`. Los servicios usan Prisma 7 sobre PostgreSQL 16 en Docker. Las
sesiones se guardan en la base con el hash de un token aleatorio, **sin librería de autenticación**,
porque la especificación exige bitácora, cierre inmediato al desactivar o restablecer y sesiones
simultáneas, y porque son unas 80 líneas propias que se explican completas
([research R-03](research.md#r-03--manejo-de-sesión)). Contraseñas con bcrypt (costo 12).

## Contexto técnico

**Lenguaje/Versión**: TypeScript 5.9.3 en modo estricto sobre Node.js 22 LTS

**Dependencias principales**: Next.js 16.3.5, React 19.3, Prisma 7.10 (`@prisma/client`,
`@prisma/adapter-pg`, `pg`), Zod 4.6, bcryptjs 3.0, Tailwind CSS 4.3; de desarrollo: Vitest 4.1, tsx,
ESLint con `eslint-config-next` ([research R-01](research.md#r-01--versiones-del-stack))

**Almacenamiento**: PostgreSQL 16 (`postgres:16-alpine` en Docker Compose); base de desarrollo
`almacen_oruro` y de pruebas `almacen_oruro_test`

**Pruebas**: Vitest; unitarias para funciones puras y de integración contra PostgreSQL real, sin
simular la base ([research R-13](research.md#r-13--pruebas-principio-ix))

**Plataforma**: servidor Node.js local (`next start`), usado desde Chrome o Edge de escritorio en la
misma computadora o en la red local; interfaz adaptable a pantallas chicas

**Tipo de proyecto**: aplicación web full-stack (un solo proyecto)

**Metas de rendimiento**: ingreso en menos de 1 s en el servidor (bcrypt costo 12 ≈ 0,5 s); páginas de
F-001 en menos de 1 s con decenas de usuarios y miles de sesiones

**Restricciones**: funcionamiento sin internet (salvo informes IA de F-007); zona horaria
`America/La_Paz`; secretos solo en `.env`; nombres en español; sin librerías cuyo funcionamiento no se
pueda explicar

**Escala**: 1 almacén, menos de 10 usuarios, uso simultáneo de 1 a 3 personas

## Verificación contra la constitución

*Puerta: debe pasar antes de la investigación y otra vez después del diseño.*

| # | Principio | Cómo lo cumple este plan | Antes | Después del diseño |
|---|---|---|---|---|
| I | Explicabilidad por encima de la elegancia | Convenciones oficiales de Next.js y Prisma; sin librería de autenticación, repositorios genéricos ni inyección de dependencias; flujo página → acción → servicio → Prisma; `docs/decisiones.md` se crea en la primera tarea con las decisiones de research.md | ✅ | ✅ |
| II | Lógica de negocio en la aplicación | Reglas en `src/servicios/acceso.ts` y `personal.ts`; la base aporta FK, UNIQUE, índices parciales y CHECK; sin procedimientos ni triggers; las páginas no contienen reglas | ✅ | ✅ |
| III | Kardex como única fuente del stock | Fijado para F-003/F-005: única función `registrarMovimiento()` con `SELECT … FOR UPDATE`; CHECK de stock y saldo no negativos ([R-11](research.md#r-11--transacciones-y-bloqueo-de-stock-arquitectura-para-f-003-y-f-005)) | ✅ | ✅ |
| IV | Documentos inmutables | Esquema sin `onDelete: Cascade`; CHECK de coherencia de anulación; documentos completos en transacción (F-003 a F-005) | ✅ | ✅ |
| V | Baja lógica | `activo` en todos los catálogos, incluido `usuario`; ninguna acción de borrado en los contratos | ✅ | ✅ |
| VI | Validación en dos lugares con un solo esquema | Esquemas en `src/esquemas/` importados por el formulario y la Server Action; mensajes en español; nada calculado se acepta del cliente | ✅ | ✅ |
| VII | Seguridad básica | bcrypt costo 12; `requerirSesion()` en cada página y acción; token de sesión guardado como hash; cookie HttpOnly y SameSite=Lax; acceso solo por Prisma; `.env` fuera del repositorio | ✅ | ✅ |
| VIII | IA transparente | Sin impacto en F-001; tablas `informe_ia` y `configuracion` ya previstas | ✅ | ✅ |
| IX | Pruebas donde duele | Pruebas de integración de duplicados, mensajes de ingreso, expiración, cierre de sesiones, autodesactivación y cambio obligatorio ([quickstart §3](quickstart.md#3-pruebas-automatizadas)) | ✅ | ✅ |
| X | Idioma y nombres | Modelos, servicios, esquemas y rutas en español; `snake_case` en la base con `@map`; solo los archivos del framework en inglés (`page.tsx`, `layout.tsx`, `proxy.ts`) | ✅ | ✅ |
| XI | Alcance cerrado | Solo lo especificado en F-001; lo demás queda como rutas reservadas; `docs/trabajo-futuro.md` se crea en la primera tarea | ✅ | ✅ |

**Resultado:** sin violaciones. No hay nada que justificar en "Seguimiento de complejidad".

## Estructura del proyecto

### Documentación (esta funcionalidad)

```text
specs/001-acceso-personal/
├── plan.md              # Este archivo
├── research.md          # Fase 0: 16 decisiones técnicas del sistema
├── data-model.md        # Fase 1: esquema completo de las 18 tablas y restricciones
├── quickstart.md        # Fase 1: guía de instalación y validación de F-001
├── contracts/
│   ├── rutas.md         # Mapa de páginas de todo el sistema y reglas de acceso
│   └── acciones-f001.md # Server Actions, servicios, consultas y semilla de F-001
├── checklists/
│   └── requirements.md  # Calidad de la especificación
└── tasks.md             # Fase 2 (/speckit-tasks; no lo crea este comando)
```

### Código fuente (raíz del repositorio)

Estructura de **todo el sistema**. Lo marcado con `(F-00x)` se agrega en esa funcionalidad; lo demás se
crea en F-001.

```text
almacen-oruro/
├── docker-compose.yml             # PostgreSQL 16 + creación de la base de pruebas
├── .env.example                   # Variables necesarias, sin secretos reales
├── package.json                   # Versiones exactas; scripts dev, build, start, test, semilla
├── next.config.ts
├── prisma.config.ts               # URL de la base y comando de semilla
├── tsconfig.json                  # strict: true; alias @/ → src/
├── vitest.config.ts
├── eslint.config.mjs
├── prisma/
│   ├── schema.prisma              # Las 18 tablas (data-model.md §3)
│   ├── migrations/                # Esquema inicial + restricciones_de_negocio (CHECK)
│   └── semilla.ts                 # configuracion + usuario admin
├── scripts/
│   └── generar-demo.ts            # (F-007) generador de histórico simulado
├── src/
│   ├── proxy.ts                   # Comprobación optimista: ¿hay cookie de sesión?
│   ├── app/
│   │   ├── layout.tsx             # HTML base, fuentes, estilos
│   │   ├── globals.css            # Tailwind
│   │   ├── ingreso/
│   │   │   ├── page.tsx
│   │   │   ├── formulario-ingreso.tsx
│   │   │   └── acciones.ts        # ingresar
│   │   └── (sistema)/
│   │       ├── layout.tsx         # Menú, nombre del usuario, botón salir, leyenda de demostración
│   │       ├── acciones-sesion.ts # salir
│   │       ├── page.tsx           # Inicio
│   │       ├── cambiar-contrasena/
│   │       ├── personal/          # listado, nuevo, [id], [id]/editar, acciones.ts
│   │       ├── sesiones/          # historial
│   │       ├── categorias/ …      # (F-002) un directorio por catálogo
│   │       ├── compras/, existencias/, kardex/     # (F-003)
│   │       ├── pedidos/                            # (F-004)
│   │       ├── distribuciones/                     # (F-005)
│   │       ├── reportes/                           # (F-006)
│   │       └── ia/                                 # (F-007)
│   ├── servicios/                 # Reglas de negocio: un archivo por módulo
│   │   ├── acceso.ts              # iniciarSesion, validarSesion, cerrarSesion, listarSesiones
│   │   ├── personal.ts            # registrar, modificar, desactivar, reactivar, contraseñas, listar
│   │   ├── catalogos/             # (F-002)
│   │   ├── inventario.ts          # (F-003) registrarMovimiento: único punto que cambia el stock
│   │   ├── compras.ts             # (F-003)
│   │   ├── pedidos.ts             # (F-004)
│   │   ├── distribuciones.ts      # (F-005)
│   │   ├── reportes.ts            # (F-006)
│   │   └── ia/                    # (F-007) pronóstico, evaluación, informes
│   ├── esquemas/                  # Zod compartido por formulario y Server Action
│   │   ├── acceso.ts
│   │   └── personal.ts
│   ├── lib/
│   │   ├── prisma.ts              # Cliente único con @prisma/adapter-pg
│   │   ├── sesion.ts              # Cookie y requerirSesion() (server-only, cache)
│   │   ├── errores.ts             # ErrorDeNegocio y ResultadoAccion
│   │   ├── texto.ts               # normalizarTexto()
│   │   └── fechas.ts              # hoy y mes en curso en America/La_Paz
│   ├── componentes/
│   │   └── ui/                    # Boton, Campo, Tabla, Aviso, Filtros
│   └── generado/prisma/           # Cliente generado por Prisma (no se versiona)
├── tests/
│   ├── ayudantes/base-de-datos.ts # Migrar y vaciar la base de pruebas
│   ├── unitarios/
│   └── integracion/
└── docs/
    ├── especificacion/            # Ya existe
    ├── decisiones.md              # Se crea en F-001 (constitución, principio I)
    ├── trabajo-futuro.md          # Se crea en F-001 (constitución, principio XI)
    └── instalacion.md             # Guía para Raymond; se completa al final (20/09)
```

**Decisión de estructura:** un solo proyecto Next.js en la raíz, como exige la constitución. La
separación de responsabilidades se hace por carpetas, no por capas de abstracción: `app/` (qué ve y
envía el usuario), `esquemas/` (qué datos son válidos), `servicios/` (qué reglas se aplican), `lib/`
(utilidades técnicas) y `prisma/` (cómo se guardan).

## Fases de este comando

| Fase | Artefacto | Estado |
|---|---|---|
| 0 · Investigación | [research.md](research.md): versiones, estructura, sesión, bcrypt, Prisma 7, unicidad normalizada, restricciones, interfaz, formularios, errores, transacciones, fechas, pruebas, entorno, cookie | ✅ Sin pendientes |
| 1 · Diseño | [data-model.md](data-model.md): 18 tablas, 27 CHECK, estados de usuario y sesión | ✅ |
| 1 · Contratos | [contracts/rutas.md](contracts/rutas.md), [contracts/acciones-f001.md](contracts/acciones-f001.md) | ✅ |
| 1 · Validación | [quickstart.md](quickstart.md): instalación, pruebas mínimas y recorrido de 17 pasos | ✅ |
| 2 · Tareas | `tasks.md` | Pendiente: `/speckit-tasks` |

## Cambios que este plan introduce en otros documentos

- `docs/especificacion/02-modelo-de-dominio.md`: `sesion.token_hash`, columnas `nombre_normalizado`,
  `distribucion_detalle.pedido_detalle_id` en lugar de `producto_id`, `proveedor_producto.activo`
  explícito y orden del kardex por `id` ([data-model §6](data-model.md#6-cambios-respecto-del-modelo-lógico)).
- `.gitignore`: agregar `src/generado/`.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| La función `partialIndexes` de Prisma está en vista previa | Si falla al migrar, los dos índices parciales se mueven a la migración SQL de restricciones (mismo resultado en la base) |
| Docker Desktop no está en ejecución en la computadora de Raymond | La guía de instalación empieza verificando `docker info`; alternativa documentada: PostgreSQL 16 instalado localmente con la misma `DATABASE_URL` |
| Diferencias de fin de línea (CRLF) en Windows | Agregar `.gitattributes` con `* text=auto eol=lf` en la primera tarea |
| bcrypt costo 12 hace lentas las pruebas de integración | Las pruebas usan costo 4 mediante una variable de entorno de prueba; producción siempre 12 |

## Seguimiento de complejidad

Sin violaciones de la constitución que justificar.
