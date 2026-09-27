---
description: "Lista de tareas de implementación de F-009 · Observaciones de Raymond"
---

# Tareas: F-009 · Observaciones de Raymond

**Entrada**: documentos de diseño de `specs/009-observaciones-raymond/`

**Prerrequisitos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/acciones-f009.md](contracts/acciones-f009.md),
[quickstart.md](quickstart.md). F-001 a F-007 y la identidad visual 008 implementadas. Constitución
**1.1.0**.

**Pruebas**: se incluyen (constitución, principio IX; research O-14;
[quickstart §2](quickstart.md#2-pruebas-automatizadas)). Las de integración usan PostgreSQL real:
**Docker Desktop debe estar abierto**. Ninguna prueba llama al modelo de lenguaje.

**Una migración nueva** (`…_representante_por_centro`, research O-02). **Ninguna dependencia nueva.**
**La base de desarrollo se recrea** en la fase 2: la guardia de la migración rechaza la demostración
actual (un centro con cinco representantes activos) a propósito.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[US#]**: historia de usuario de [spec.md](spec.md)

| Etiqueta | Historia de spec.md | Prioridad |
|---|---|---|
| US1 | Historia 1 · Un solo representante activo por centro de salud | P1 |
| US2 | Historia 2 · Demostración con los centros de salud reales | P1 |
| US3 | Historia 3 · El representante siempre con su centro de salud | P2 |
| US4 | Historia 4 · Generar y descargar un respaldo de la base | P2 |
| US5 | Historia 5 · Ver la contraseña mientras se escribe | P3 |

**Patrón**: el de F-002 a F-007: `requerirSesion()` como primera instrucción de cada página y acción;
esquemas Zod compartidos por cliente y servidor; comentario con el FR, la RN o la decisión (D-xx, O-xx)
en cada regla. **Donde había `servicio`, ahora va `centroSalud`** (el nombre del centro, research O-04).

---

## Fase 1: Preparación

**Propósito**: confirmar que el punto de partida está sano antes de tocar el esquema.

- [X] T001 Verificar el entorno: `docker info` responde, el contenedor `almacen-oruro-postgres` está *healthy*, y `npm run lint`, `npm run typecheck` y `npm test` terminan sin errores con las **602** pruebas en verde; anotar el resultado para compararlo al final. Confirmar que la base de pruebas no tiene dos representantes activos en un mismo centro (`select centro_salud_id from representante where activo group by 1 having count(*) > 1` debe devolver 0 filas en `almacen_oruro_test`); si los tiene, vaciarla con `vaciarTablas()` antes de la fase 2

---

## Fase 2: Fundamentos · quitar el "servicio" (bloquea todas las historias)

**Propósito**: el esquema nuevo y el reemplazo mecánico de `servicio` por `centroSalud` en todo el
código. Quitar la columna rompe la compilación en unos 25 archivos: esta fase termina cuando **el
sistema vuelve a compilar y las pruebas existentes pasan**, sin reglas nuevas todavía.

**⚠️ CRÍTICO**: ninguna historia empieza antes de terminar esta fase.

- [X] T002 En `prisma/schema.prisma`, modelo `Representante`: quitar `servicio`; agregar `@@unique([centroSaludId], where: raw("activo = true"), map: "representante_centro_activo_unico")` con un comentario que cite RN-18 y research O-01. Generar la migración con `npx prisma migrate dev --create-only --name representante_por_centro` y **editar su `migration.sql`** para que empiece con la guardia de research O-02: un bloque `DO $$ … $$` que, si `SELECT centro_salud_id FROM representante WHERE activo GROUP BY centro_salud_id HAVING count(*) > 1` devuelve filas, haga `RAISE EXCEPTION 'Esta base tiene centros de salud con varios representantes activos (modelo anterior a F-009). Recréala y regenera la demostración: docs/instalacion.md, sección "Actualizar a F-009"'`; luego `DROP COLUMN "servicio"` y el `CREATE UNIQUE INDEX … WHERE activo = true`; cada paso con un comentario en español. Terminar con **`npx prisma generate`**: ni `migrate dev --create-only` ni `migrate deploy` regeneran el cliente, y `src/generado/` no está versionado; sin este paso, el código de T004 a T008 se compila contra el cliente viejo, que todavía exige `servicio`
- [X] T003 Recrear la base de desarrollo y aplicar: `docker compose down -v`, `docker compose up -d`, `npx prisma migrate deploy`, `npx prisma db seed` (el generador se ejecuta al final de la fase, T010). Verificar además, **antes** de recrear, que `npx prisma migrate deploy` sobre la base vieja se detiene con el mensaje de la guardia (quickstart §1) y anotar el resultado
- [X] T004 [P] En `src/esquemas/catalogos/representante.ts` quitar `servicio`; actualizar `tests/unitarios/esquemas-centro-representante.test.ts` (sin los casos de `servicio`) y agregar un caso: un objeto con `servicio` se acepta pero el resultado no lo trae
- [X] T005 [P] En `src/servicios/catalogos/representantes.ts`: quitar `servicio` de los datos de registro y modificación; agregar `etiquetaRepresentante({ apellido, nombre, centroSalud })` → `"Apellido, Nombre · Centro de salud"` (research O-04, D-23) junto a `nombreCompleto`, con comentario; en `listarRepresentantes` buscar con `q` también en el **nombre del centro** en lugar del servicio y devolver `centroSalud`; en `listarRepresentantesParaSelector` incluir el centro y armar la etiqueta con `etiquetaRepresentante`, más " (inactivo)" cuando corresponda. Crear `tests/unitarios/etiqueta-representante.test.ts` con el formato exacto, tildes y espacios
- [X] T006 [P] Reemplazar `servicio` por `centroSalud` (nombre del centro, vía `centroSalud: { select: { nombre: true } }`) en `src/servicios/pedidos.ts` (`obtenerPedido`, `listarPedidos`), `src/servicios/distribuciones.ts` (`obtenerPedidoParaDistribuir`, `listarDistribuciones`, `obtenerDistribucion`) y `src/servicios/reportes.ts` (`reporteDistribuciones`, `reportePedidos`); los tipos que exportan cambian de nombre de campo, no de forma
- [X] T007 [P] En `src/servicios/ia/informes.ts` (`datosInformeDistribuciones`): cada fila de `porRepresentante` lleva `centroSalud` en lugar de `servicio`; el comentario de A-10 pasa a "Solo nombre, apellido y centro del representante: nunca su CI". En `src/componentes/ia/tabla-datos-informe.tsx`, mostrar la columna "Centro de salud" con `fila.centroSalud` (la compatibilidad con informes viejos es T020)
- [X] T008 Actualizar las pantallas e impresos que leían `servicio` (research O-04, FR-013): encabezado de columna **"Servicio" → "Centro de salud"** y valor `centroSalud` en `src/app/(sistema)/pedidos/page.tsx`, `src/app/(sistema)/distribuciones/page.tsx`, `src/app/(sistema)/representantes/page.tsx`, `src/app/(sistema)/reportes/pedidos/page.tsx`, `src/app/(sistema)/reportes/distribuciones/page.tsx`, `src/app/(impresion)/reportes/pedidos/imprimir/page.tsx`, `src/app/(impresion)/reportes/distribuciones/imprimir/page.tsx`; en las pantallas que **ya muestran el centro aparte**, quitar el servicio sin repetir el centro (FR-012 permite el centro en su propio dato): en `src/app/(sistema)/pedidos/[id]/page.tsx` y `src/app/(sistema)/distribuciones/[id]/page.tsx`, el representante queda "Apellido, Nombre" con " (inactivo)" cuando corresponda, y se conserva el dato "Centro de salud" que ya existe; en `src/app/(impresion)/distribuciones/[id]/vale/page.tsx`, quitar el bloque "Servicio" (el encabezado ya muestra el centro); en `src/app/(sistema)/distribuciones/nueva/page.tsx`, quitar "· {servicio}" y conservar "· {centroSalud}"; dato "Servicio" → "Centro de salud" en `src/app/(sistema)/representantes/[id]/page.tsx`; quitar el campo `servicio` de `src/app/(sistema)/representantes/formulario-representante.tsx`. En los filtros de pedidos, distribuciones y reportes que arman la etiqueta en la página (`${r.nombreCompleto} · ${r.servicio}…`), usar `etiquetaRepresentante`
- [X] T009 En `src/servicios/ia/generador.ts` (research O-07): reemplazar `REPRESENTANTES` y `CENTRO_SALUD` por una constante `CENTROS` de cinco `{ centro, representante: { nombre, apellido, ci } }`, con los mismos cinco representantes y los nombres **provisorios** "Centro de salud provisorio 1" a "… 5" y un comentario `// Q-07: nombres provisorios hasta que Raymond envíe los centros reales`; crear cada centro con su único representante; cambiar los motivos "El vale correspondía a otro servicio" → "otro centro de salud" y "El servicio retiró el pedido" → "El centro de salud retiró el pedido", y los comentarios que hablen de "servicio" como área; **no** cambiar la asignación de productos, el consumo ni el orden de las llamadas al generador aleatorio (misma semilla, mismas cantidades)
- [X] T010 Ajustar las pruebas al esquema nuevo: en `tests/ayudantes/catalogos.ts`, `crearRepresentanteDePrueba` sin `servicio` (ya crea un centro nuevo por representante); quitar `servicio:` y cambiar las aserciones de `servicio` por `centroSalud` en `tests/integracion/catalogo-busqueda.test.ts`, `catalogo-centros-representantes.test.ts`, `distribuciones-detalle.test.ts`, `distribuciones-listado.test.ts`, `distribuciones-registro.test.ts`, `informe-distribuciones.test.ts`, `pedidos-listado.test.ts`, `pedidos-registro.test.ts` y `reporte-distribuciones.test.ts`; donde una prueba ponga dos representantes **activos** en el mismo `centroSaludId`, darle a cada uno su centro. Ejecutar `npm run datos:simulados -- --semilla 20260915` sobre la base de desarrollo recreada

**Punto de control**: `npm run typecheck`, `npm run lint` y `npm test` en verde (las 602 anteriores, ajustadas);
`grep -rnE "\.servicio\b|\bservicio\??:" src/ tests/ --include=*.ts --include=*.tsx` no devuelve nada
fuera de `src/generado/` (el patrón busca el **campo**; la palabra "servicio" sigue apareciendo, con
razón, en comentarios como "el servicio no escribe…" y en el "servicio de redacción" del modelo de
lenguaje); el sistema compila con `npm run build`. **Commit de la fase.**

---

## Fase 3: Historia 1 · Un solo representante activo por centro (Prioridad: P1) 🎯 MVP

**Objetivo**: la regla RN-18 se cumple por las tres vías y ante la concurrencia, y reemplazar a la
persona responsable funciona aunque tenga pedidos por atender.

**Prueba independiente**: quickstart §3, pasos 1 a 6.

- [X] T011 [P] [US1] En `tests/integracion/catalogo-centros-representantes.test.ts` (deben fallar antes de T013 a T015): registrar un representante en un centro que ya tiene otro activo → rechazo con "El centro de salud '{centro}' ya tiene como representante activo a '{Apellido, Nombre}': desactívalo antes de registrar a otra persona" y campo `centroSaludId`; reactivar uno inactivo con otro activo en su centro → "…desactívalo antes de reactivar a este representante"; cambiar un representante activo a un centro ocupado → "…desactívalo antes de cambiar a este representante de centro"; modificar el teléfono de un representante activo **sin** cambiar de centro → se acepta; registrar en un centro cuyo representante está **inactivo** → se acepta; **dos registros simultáneos** en el mismo centro con `Promise.allSettled` → uno cumplido y el otro rechazado con el mismo mensaje (SC-001); desactivar un representante con 2 pedidos PENDIENTE o PARCIAL → **se acepta** (RN-13 modificada, D-22), y después `registrarDistribucion` sobre uno de esos pedidos se registra y el pedido sigue a su nombre (FR-006, FR-008); `contarPedidosPorAtender` devuelve 2 antes de desactivar
- [X] T012 [P] [US1] Crear `tests/integracion/centros-representante.test.ts` (debe fallar antes de T016): `listarCentrosParaRepresentante()` devuelve solo centros activos sin representante activo; con `idActual` incluye además el centro de ese representante; un centro inactivo nunca aparece. `obtenerRepresentantesDelCentro(id)` devuelve `{ activo, anteriores }`, con `activo: null` si no hay y los inactivos ordenados por apellido en `anteriores`
- [X] T013 [US1] En `src/servicios/catalogos/representantes.ts`, función `verificarCentroLibre(tx, centroSaludId, idExcluido?, accion)` que busca un representante **activo** del centro distinto de `idExcluido` y lanza el `ErrorDeNegocio` de RN-18 con su `etiqueta` de nombre (`Apellido, Nombre`), el nombre del centro y el verbo según `accion` (`registrar` · `reactivar` · `cambiar`), con campo `centroSaludId`; comentario con RN-18, D-22 y research O-01
- [X] T014 [US1] Usar `verificarCentroLibre` dentro de la transacción de `registrarRepresentante` (siempre), `modificarRepresentante` (solo si el representante está activo **y** cambia el centro) y `reactivarRepresentante` (después de la verificación de RN-17); en los tres, ante `esErrorDeDuplicado(error)` volver a verificar CI y centro para lanzar el mismo mensaje que el caso normal (patrón `traducirDuplicado` de `categorias.ts`, research C-05)
- [X] T015 [US1] En `desactivarRepresentante` quitar el rechazo por pedidos por atender, con un comentario que explique el cambio de RN-13 (D-22, research O-03); agregar `contarPedidosPorAtender(representanteId)` (pedidos `PENDIENTE` o `PARCIAL`)
- [X] T016 [P] [US1] En `src/servicios/catalogos/centros-salud.ts`: `listarCentrosParaRepresentante(idActual?)` (research O-06) y `obtenerRepresentantesDelCentro(centroId)` (FR-007), con comentarios
- [X] T017 [US1] Pantallas: en `src/app/(sistema)/representantes/nuevo/page.tsx` y `[id]/editar/page.tsx`, cargar los centros con `listarCentrosParaRepresentante` (preseleccionar si queda uno solo; si no queda ninguno, mostrar "Todos los centros activos tienen representante. Registra un centro nuevo o desactiva al representante actual" con enlace a Centros de salud). En `src/app/(sistema)/representantes/[id]/page.tsx`, la confirmación de desactivar suma, si `contarPedidosPorAtender > 0`: "Tiene {n} pedido(s) por atender: seguirán a su nombre y se podrán distribuir". En `src/app/(sistema)/centros-salud/[id]/page.tsx`, reemplazar el dato "Representantes activos" por "Representante" (nombre con enlace a su ficha, o "Sin representante activo") y una lista "Representantes anteriores" con nombre y CI, ordenada por apellido y sin fechas (o "Ninguno"; FR-007)
- [X] T018 [US1] En `src/servicios/catalogos/centros-salud.ts`, cambiar el mensaje de RN-13 al desactivar un centro para que nombre a su representante activo (FR-027) ("No se puede desactivar: su representante activo es '{Apellido, Nombre}'") en lugar de contar representantes, y ajustar su prueba en `catalogo-centros-representantes.test.ts`

**Punto de control**: T011 y T012 en verde; quickstart pasos 1 a 6. **Commit de la fase.**

---

## Fase 4: Historia 2 · Demostración con los centros reales (Prioridad: P1)

**Objetivo**: la demostración cumple RN-18 y sus informes hablan de centros.

**Prueba independiente**: quickstart §3, pasos 7 y 8.

- [X] T019 [P] [US2] En `tests/integracion/generador-historico.test.ts`: con la configuración reducida, cada centro creado tiene **exactamente un** representante activo; hay pedidos de todos los representantes; la verificación de consistencia del inventario sigue en 0 diferencias; dos ejecuciones con la misma semilla siguen dando los mismos campos de negocio
- [X] T020 [US2] Compatibilidad de informes guardados (research O-05): en `src/componentes/ia/tabla-datos-informe.tsx`, si las filas de `porRepresentante` traen `servicio` (informe anterior a F-009), la columna se titula "Servicio" y muestra ese valor; si traen `centroSalud`, "Centro de salud"; la sección se titula "Por centro de salud". Tipar las filas viejas como `{ servicio?: string; centroSalud?: string }` solo en este componente, con un comentario que cite el principio IV. En `tests/integracion/informes-consulta.test.ts`, guardar un informe con filas en el formato viejo y verificar que `obtenerInforme` lo devuelve sin error
- [ ] T021 [US2] **Bloqueada por Q-07**: cuando Raymond envíe los nombres de los centros reales, reemplazarlos en `CENTROS` de `src/servicios/ia/generador.ts` (y la cantidad, si no son cinco), quitar el comentario de provisorios, recrear la base y regenerar la demostración con `npm run datos:simulados -- --semilla 20260915`; medir que el pronóstico y la evaluación se calculan para los mismos productos que antes (SC-006) y anotarlo en `quickstart.md` §4

**Punto de control**: T019 y T020 en verde; quickstart pasos 7 y 8 (con nombres provisorios mientras
Q-07 siga abierta). **Commit de la fase.**

---

## Fase 5: Historia 3 · El representante siempre con su centro (Prioridad: P2)

**Objetivo**: todos los lugares de FR-011 muestran el centro del representante: "Apellido, Nombre · Centro de salud", su columna o su propio dato.

**Prueba independiente**: quickstart §3, pasos 9 y 10.

- [X] T022 [P] [US3] Pruebas (deben fallar antes de T023 y T024): en `tests/integracion/inventario-kardex.test.ts`, el texto del movimiento de una distribución es "Vale {n} · {Apellido, Nombre · Centro}"; en `tests/integracion/reporte-distribuciones.test.ts` y `reporte-pedidos.test.ts`, cada fila trae `centroSalud`; en `tests/integracion/pedidos-registro.test.ts` (o su prueba de selector), `listarRepresentantesParaSelector` devuelve la etiqueta con el centro y " (inactivo)" para el actual inactivo
- [X] T023 [US3] En `src/servicios/inventario.ts`, el texto del movimiento de distribución usa `etiquetaRepresentante` (incluye el centro), con comentario de FR-011
- [X] T024 [US3] Encabezados de los reportes con el formato de D-23: en los reportes de pedidos y distribuciones, en pantalla (`src/app/(sistema)/reportes/pedidos/page.tsx`, `src/app/(sistema)/reportes/distribuciones/page.tsx`) e impresos (`src/app/(impresion)/reportes/pedidos/imprimir/page.tsx`, `src/app/(impresion)/reportes/distribuciones/imprimir/page.tsx`), el filtro "Representante" del encabezado usa `etiquetaRepresentante` en lugar de `nombreCompleto`. Las fichas de pedido y distribución, el formulario de distribución y el vale **no** usan la etiqueta: ya muestran el centro en su propio dato (T008), y repetirlo lo mostraría dos veces
- [X] T025 [US3] Verificación de SC-002: recorrer la lista de FR-011 con `grep` sobre `src/app` y `src/componentes` (cada lugar que muestra un representante usa `etiquetaRepresentante` o tiene la columna "Centro de salud") y confirmar que no queda el rótulo "Servicio" como dato de representante

**Punto de control**: T022 en verde; quickstart pasos 9 y 10. **Commit de la fase.**

---

## Fase 6: Historia 4 · Respaldo de la base (Prioridad: P2)

**Objetivo**: un archivo descargable con todos los datos, que se restaura con la guía.

**Prueba independiente**: quickstart §3, pasos 11 a 13.

- [X] T026 [P] [US4] Crear `tests/unitarios/respaldo.test.ts` (debe fallar antes de T028): `nombreArchivoRespaldo(new Date("2026-09-26T11:15:00Z"))` → `respaldo-almacen-oruro-2026-09-26-0715.sql` (hora de Oruro, UTC−4); un minuto y una hora de un dígito llevan cero adelante
- [X] T027 [P] [US4] Crear `tests/integracion/respaldo.test.ts` (debe fallar antes de T028): con un **ejecutor simulado** inyectado en `generarRespaldo`, los cuatro errores de research O-10 dan su mensaje exacto y ningún contenido (Docker no responde, contenedor detenido, demora, otra falla); una salida vacía con código 0 también es error (FR-020); con éxito, devuelve `{ nombreArchivo, contenido }`. Y una prueba **real** con `it.skipIf(!hayContenedor)` (donde `hayContenedor` sale de `docker inspect` del contenedor): `generarRespaldo` sobre la base de pruebas (usuario y base de `DATABASE_URL_TEST`) devuelve un SQL que contiene `COPY public.` para las 18 tablas del sistema y para `_prisma_migrations`
- [X] T028 [US4] Crear `src/servicios/respaldo.ts` (research O-08 a O-10) con comentarios del porqué de cada decisión: `nombreArchivoRespaldo(fecha)`; `datosDeConexion()` que lee usuario y base de `DATABASE_URL` con `new URL(…)`; `ejecutarPgDump(contenedor, usuario, base)` con `execFile("docker", ["exec", contenedor, "pg_dump", "-U", usuario, "-d", base, "--no-owner", "--no-privileges"], { maxBuffer: 200 * 1024 * 1024, timeout: 60_000 })` envuelto en una promesa que clasifica el error (ENOENT o "Cannot connect to the Docker daemon" → Docker; "No such container" o "is not running" → contenedor; `killed`/`ETIMEDOUT` → demora; resto → otra) y registra `stderr` con `console.error` sin mostrarlo; `generarRespaldo(ejecutar = ejecutarPgDump)` que usa `process.env.CONTENEDOR_BASE_DATOS ?? "almacen-oruro-postgres"` y lanza `ErrorDeNegocio` con los mensajes de O-10. **Sin** intérprete de comandos, **sin** contraseña, **sin** escribir en disco. El comentario de `ejecutarPgDump` cita FR-016: `pg_dump` lee toda la base dentro de una sola transacción con una instantánea, así que un documento que se guarda mientras tanto queda completo o no queda (no se agrega una prueba: es una garantía del motor, research O-08)
- [X] T029 [US4] Crear `src/app/(sistema)/respaldo/acciones.ts` con `generarRespaldoAccion()` (orden de F-001: `requerirSesion()` → `generarRespaldo()` → `ResultadoAccion`, con `aResultadoDeError` para los errores) y `src/app/(sistema)/respaldo/boton-respaldo.tsx` (cliente): con `useTransition`, el botón dice "Generar respaldo" o "Generando…" y queda deshabilitado mientras corre (FR-021); con éxito arma un `Blob` de tipo `application/sql;charset=utf-8`, lo descarga con un enlace temporal (`URL.createObjectURL`, `download = nombreArchivo`, `revokeObjectURL` al terminar) y muestra "Respaldo generado: {nombreArchivo}" con `Aviso` de éxito; con error, `Aviso` de error con el mensaje
- [X] T030 [US4] Crear `src/app/(sistema)/respaldo/page.tsx` con `requerirSesion()` y `metadata` "Respaldo · Almacén Regional Oruro": título "Respaldo de la base de datos"; qué incluye (catálogos, compras, pedidos, distribuciones, kardex, personal, sesiones, informes IA y configuración) y qué no (el código y el archivo de configuración con claves, FR-018); la advertencia de FR-019 con `Aviso` de tipo información ("El archivo contiene datos personales y las contraseñas cifradas del personal. Guárdalo en un lugar seguro, por ejemplo una memoria USB que no quede en el almacén"); el `BotonRespaldo`; y "Para restaurar un respaldo, sigue la guía de instalación, sección «Restaurar un respaldo»" (FR-022)
- [X] T031 [P] [US4] Navegación (research O-11): en `src/componentes/ui/icono.tsx` sumar el trazo `respaldo` (un cilindro de base de datos con una flecha hacia abajo, 24×24, trazo 1,8, como los demás); en `src/componentes/navegacion/opciones.ts` agregar al grupo "Administración" `{ ruta: "/respaldo", texto: "Respaldo", icono: "respaldo", descripcion: "Descargar una copia de todos los datos del sistema" }`
- [X] T032 [P] [US4] En `.env.example` agregar `CONTENEDOR_BASE_DATOS="almacen-oruro-postgres"` con el comentario "Contenedor de Docker de la base: el respaldo ejecuta ahí pg_dump. Cambiarlo solo si se cambió container_name en docker-compose.yml"

**Punto de control**: T026 y T027 en verde; quickstart pasos 11 y 12. **Commit de la fase.**

---

## Fase 7: Historia 5 · Ver la contraseña (Prioridad: P3)

**Objetivo**: los ocho campos de contraseña se pueden mostrar y ocultar sin cambiar lo que se envía.

**Prueba independiente**: quickstart §3, pasos 14 a 16.

- [X] T033 [US5] Crear `src/componentes/ui/campo-contrasena.tsx` (cliente, research O-13) con las mismas propiedades que `Campo` salvo `type` y el mismo marcado de etiqueta, ayuda y errores (`aria-describedby`, `aria-invalid`); el campo va dentro de un contenedor relativo con el botón a la derecha: `type="button"`, texto "Mostrar" / "Ocultar", `aria-pressed={visible}`, `aria-controls={id}`, foco visible; estado `visible` propio que empieza en `false` (FR-024); un `useEffect` que agrega un escuchador `submit` a `inputRef.current?.form` y pone `visible = false` al enviar, y lo quita al desmontar (FR-026); comentario de por qué no se modificó `Campo` (sigue siendo de servidor)
- [X] T034 [US5] En `src/app/globals.css`, dentro de `@layer base`, ocultar el botón nativo de Edge: `input::-ms-reveal, input::-ms-clear { display: none; }`, con un comentario ("para que no aparezcan dos botones de mostrar")
- [X] T035 [US5] Reemplazar `Campo` por `CampoContrasena` (sin `type="password"`) en los ocho campos: `src/app/ingreso/formulario-ingreso.tsx` (1), `src/app/(sistema)/cambiar-contrasena/formulario.tsx` (3), `src/app/(sistema)/personal/formulario-personal.tsx` (2) y `src/app/(sistema)/personal/[id]/restablecer-contrasena.tsx` (2); conservar `id`, `name`, `autoComplete`, `required`, `ayuda`, `errores` y `onBlur`

**Punto de control**: `npm run typecheck` y `npm run build` sin errores; quickstart pasos 14 a 16 en el
navegador. **Commit de la fase.**

---

## Fase 8: Cierre y aspectos transversales

- [X] T036 [P] Documentación de instalación (`docs/instalacion.md`): en la sección 2, variable `CONTENEDOR_BASE_DATOS`; nueva sección **"Actualizar a F-009"** (qué cambia, que la base se recrea y se pierde lo cargado a mano, los cinco comandos de quickstart §1 y el mensaje de la guardia si se intenta migrar sin recrear); nueva sección **"Restaurar un respaldo"** con los pasos de research O-12 (`down -v`, `up -d`, `docker cp`, `psql -f`, **sin** `migrate deploy` ni semilla) y cómo comprobar que salió bien (Existencias → Verificación, ingresar con la contraseña de siempre); en "Usar el sistema", un apartado corto de Respaldo; en "Problemas frecuentes", los mensajes de O-10 y qué hacer
- [X] T037 [P] `docs/especificacion/03-funcionalidades.md`: nota en F-002, F-004, F-006 (R-2 y R-5) y F-007 (informe de distribuciones) de que F-009 reemplazó "servicio" por "centro de salud" (D-21 a D-23); `specs/001-acceso-personal/contracts/rutas.md` sumando `/respaldo`; `docs/especificacion/README.md` sumando F-009 al cronograma
- [X] T038 [P] Revisar con `grep` que `src/app/(sistema)/respaldo/page.tsx` y `acciones.ts` llaman a `requerirSesion()` como primera instrucción y que `src/servicios/respaldo.ts` no usa `exec(`, `spawn(` con `shell: true`, `PGPASSWORD` ni escritura en disco (`writeFile`); agregarlo como prueba en `tests/integracion/respaldo.test.ts` leyendo el archivo con `readFileSync`, como las pruebas de invariantes de F-006 y F-007
- [X] T039 [P] Accesibilidad a 375 px: el botón de mostrar contraseña se alcanza con Tab y no tapa el texto; la pantalla de respaldo y la ficha del centro se leen sin desplazamiento horizontal; las columnas "Centro de salud" de las tablas caben o desplazan dentro de su tabla
- [X] T040 Ejecutar `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`; confirmar que las 602 pruebas anteriores (ajustadas) siguen en verde junto con las nuevas, y corregir errores y advertencias
- [X] T041 Ejecutar el recorrido de `quickstart.md` §3 completo con el método de `docs/decisiones.md` I-15 (sin escribir contraseñas reales en el navegador ni dejar datos en la base de desarrollo), incluida la **restauración real** de un respaldo en una base aparte (paso 13); medir SC-003 (tiempo del respaldo) y anotar en `quickstart.md` §4 qué se verificó y qué queda pendiente de Q-07
- [X] T042 [P] Registrar en `docs/decisiones.md`, sección "Observaciones de Raymond", las decisiones de implementación nuevas (I-62 en adelante) que aparezcan al programar
- [X] T043 Preparar para Raymond, en `docs/especificacion/00-decisiones-y-alcance.md` Q-06, la lista de cambios del Capítulo II que suma F-009: un representante por centro de salud, el centro junto al representante, respaldo de la base y contraseñas visibles

---

## Dependencias y orden de ejecución

### Entre fases

- **Preparación (1)** → **Fundamentos (2)** → historias → **Cierre (8)**.
- En la fase 2, T002 y T003 van primero y en ese orden (esquema y base); T004 a T007 tocan archivos
  distintos y van en paralelo; T008 depende de T005 a T007 (las pantallas leen lo que devuelven los
  servicios); T009 y T010 van al final (el generador y las pruebas necesitan todo lo anterior).

### Entre historias

| Historia | Depende de | Motivo |
|---|---|---|
| US1 Un representante activo | Fundamentos | Usa el índice parcial y el servicio sin `servicio` |
| US2 Demostración | Fundamentos (T009); US1 para verla con la regla aplicada | El generador ya se ajustó en T009; T021 espera a Q-07 |
| US3 Representante con su centro | Fundamentos (T005, `etiquetaRepresentante`) | Completa los lugares que el reemplazo mecánico no formateó |
| US4 Respaldo | Fundamentos (base recreada) | Independiente de las demás historias |
| US5 Contraseña | Ninguna más allá de la fase 1 | No toca el esquema ni los servicios |

US1 y US3 editan `src/servicios/catalogos/representantes.ts` y páginas de representantes: van en
secuencia. **US4 y US5 pueden hacerse en paralelo con cualquier otra historia.**

### Dentro de cada historia

Pruebas [P] primero (las de integración deben fallar antes del servicio) → servicio → páginas. Commit al
terminar cada fase.

---

## Ejemplos de trabajo en paralelo

```text
# Fase 2 (después de T002 y T003):
T004 esquema · T005 servicio de representantes · T006 pedidos, distribuciones y reportes · T007 informe IA

# Historias independientes entre sí:
US4 (T026 a T032) · US5 (T033 a T035)

# Cierre:
T036 instalación · T037 documentos de especificación · T038 invariantes del respaldo · T039 accesibilidad · T042 decisiones
```

---

## Estrategia de implementación

### MVP (Fundamentos + Historia 1)

Fases 1 a 3: el esquema nuevo, "servicio" reemplazado por el centro en todo el sistema y la regla de un
representante activo por centro. Es la observación que Raymond marcó como la más importante, y deja el
sistema coherente con la decisión D-22.

### Entrega incremental

| Paso | Fases | Resultado verificable |
|---|---|---|
| 1 | 1 y 2 | Sistema sin "servicio", compilando, con las pruebas anteriores en verde y la demostración provisoria regenerada |
| 2 | 3 (US1) | RN-18 por las tres vías y en concurrencia; reemplazo de representante con pedidos por atender |
| 3 | 4 (US2) | Demostración que cumple RN-18; informes guardados viejos y nuevos consultables |
| 4 | 5 (US3) | Todos los lugares de FR-011 con el centro (SC-002) |
| 5 | 6 (US4) | Respaldo descargable y restaurable (SC-003, SC-004) |
| 6 | 7 (US5) | Contraseñas visibles en las cuatro pantallas |
| 7 | 8 | Guía, documentos, invariantes, recorrido completo |
| — | T021 | Demostración final con los centros reales, en cuanto llegue Q-07 |

**Orden de corte**: si algo se atrasa, se posterga primero **US5** (P3), después **US4** (P2, respaldo) y
después **US3** (P2). Fundamentos, US1 y US2 son imprescindibles: sin ellos, la demostración contradice
la regla que se va a defender.

---

## Notas

- [P] = archivos distintos y sin dependencias pendientes.
- **T021 está bloqueada por Q-07** (nombres de los centros reales); no frena ninguna otra tarea.
- La base de desarrollo se recrea en T003: cualquier dato cargado a mano en ella se pierde (supuesto de
  la especificación).
- Cada regla de negocio lleva en el código un comentario con su FR, RN o decisión y el porqué
  (principio I).
- Si aparece algo que la especificación no cubre, se corrige primero `spec.md`; no se improvisa en el
  código.
