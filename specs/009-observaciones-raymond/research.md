# Investigación técnica · F-009 Observaciones de Raymond

**Fecha**: 2026-09-26 · **Plan**: [plan.md](plan.md)

F-009 no agrega módulos: corrige una regla de F-002, ajusta cómo muestran al representante F-004 a
F-007, cambia el generador de F-007, suma una pantalla de administración y un componente de
formulario. Aquí solo se registran las decisiones **nuevas**, con el formato **Decisión / Fundamento /
Alternativas descartadas**. El prefijo es **O** (observaciones).

Dos decisiones se tomaron **probando antes de escribirlas** (26/09, contra la base de desarrollo, sin
modificarla): el respaldo con `pg_dump` dentro del contenedor (O-08) y su restauración en una base
vacía (O-12).

---

## O-01 · Un representante activo por centro: la base decide

**Decisión**: índice único **parcial** `representante_centro_activo_unico` sobre `centro_salud_id`,
solo para las filas con `activo = true`, declarado en `schema.prisma` con
`@@unique([centroSaludId], where: raw("activo = true"), map: "representante_centro_activo_unico")`,
igual que `compra_factura_vigente_unica` y `distribucion_vale_vigente_unico`. Los servicios de
representantes (`registrar`, `modificar`, `reactivar`) verifican antes, dentro de la transacción, si el
centro ya tiene otro representante activo, y lanzan un `ErrorDeNegocio` que lo nombra:
"El centro de salud 'Policlínico A' ya tiene como representante activo a 'Quispe, María': desactívalo
antes de registrar a otra persona". Si dos operaciones simultáneas pasan la verificación, el índice
rechaza la segunda (P2002) y el servicio la traduce al mismo mensaje.

**Fundamento**: es el patrón de C-05 (el servicio da el mensaje, la restricción de la base decide ante
la concurrencia y P2002 se traduce al mismo mensaje, principio II). El índice parcial expresa la regla en una línea: "un centro no
puede repetirse entre los representantes activos"; los inactivos quedan fuera y conservan el
historial (D-22).

**Alternativas descartadas**: solo la verificación del servicio (dos pedidos simultáneos la
esquivarían, SC-001); bloquear la fila del centro con `SELECT … FOR UPDATE` (más SQL crudo para lo
que un índice ya resuelve); un trigger (prohibido, principio II); guardar en el centro un
`representante_activo_id` (dos lugares que mantener sincronizados).

---

## O-02 · Migración con guardia y sin conversión de datos

**Decisión**: una migración nueva, `…_representante_por_centro`, en tres pasos:

1. **Guardia**: un bloque `DO` que, si algún centro tiene más de un representante activo, aborta con
   `RAISE EXCEPTION` y un mensaje en español que remite a la guía ("Esta base tiene centros con varios
   representantes activos: recréala y regenera la demostración, docs/instalacion.md §…").
2. `ALTER TABLE representante DROP COLUMN servicio`.
3. `CREATE UNIQUE INDEX representante_centro_activo_unico … WHERE activo = true`.

La guía de instalación suma una sección "Actualizar a F-009" que recrea la base y regenera la
demostración.

**Fundamento**: no hay datos reales en operación (supuesto de la especificación); las únicas bases
existentes son de demostración y se regeneran. La guardia convierte el error críptico del índice
("could not create unique index") en una instrucción clara, y evita que la migración quede aplicada
a medias.

**Alternativas descartadas**: desactivar en la migración a todos los representantes menos uno por
centro (cambia datos en silencio y deja una demostración que igual contradice D-21); convertir cada
"servicio" en un centro de salud (inventaría centros que no existen, contra la aclaración de
Raymond); conservar la columna `servicio` como opcional (dato muerto que habría que explicar).

---

## O-03 · Desactivar al representante saliente con pedidos por atender

**Decisión**: `desactivarRepresentante` deja de rechazar cuando hay pedidos PENDIENTE o PARCIAL
(RN-13 modificada, D-22). La ficha del representante calcula `contarPedidosPorAtender(id)` y lo
incluye en el texto de confirmación que ya muestra `CambioDeEstado`: "¿Desactivar a María Quispe?
Tiene 2 pedidos por atender: seguirán a su nombre y se podrán distribuir. Ya no podrá elegirse en
pedidos nuevos". Distribuir, anular y editar esos pedidos no cambia.

**Fundamento**: el aviso sale del mismo componente de confirmación de F-002, así que no hay pantalla
nueva. Verificado en el código (26/09): `registrarDistribucion` y `anularPedido` no validan el estado
del representante, y `editarPedido` acepta conservar el representante que el pedido ya tenía aunque
esté inactivo; solo rechaza elegir un representante inactivo distinto (F-004). `registrarPedido`
exige representante activo (RN-40), y el selector de pedidos nuevos ya no lo ofrece.

**Alternativas descartadas**: un paso de "reemplazo" que desactiva y registra en una sola operación
(más formulario y más estados posibles para un caso poco frecuente); pasar los pedidos al nuevo
representante (el usuario lo descartó: se pierde quién pidió).

---

## O-04 · Una sola etiqueta para el representante

**Decisión**: `etiquetaRepresentante({ apellido, nombre, centroSalud })` en
`src/servicios/catalogos/representantes.ts`, junto a `nombreCompleto`, devuelve
"Apellido, Nombre · Centro de salud". Los servicios que hoy devuelven `servicio` (pedidos,
distribuciones, reportes, inventario, informes y el selector) pasan a devolver `centroSalud` (el nombre
del centro) y usan esa función donde arman texto. En las tablas, el centro va en su propia columna
"Centro de salud", en lugar de "Servicio" (FR-012, FR-013).

**Fundamento**: el formato se escribe una sola vez; si Raymond pide otro orden, cambia un lugar. Es el
mismo criterio que `nombreCompleto` (F-002) y `formatearFecha` (I-17).

**Alternativas descartadas**: armar el texto en cada pantalla (todos los lugares de FR-011, que podrían divergir);
un componente de React (el kardex y el informe IA arman el texto en el servidor, no en una vista).

---

## O-05 · Informe IA de distribuciones por centro

**Decisión**: `datosInformeDistribuciones` agrupa lo entregado por representante, como hoy, pero cada
fila lleva `centroSalud` en lugar de `servicio`, y la tabla se titula "Por centro de salud". Al modelo
se le envían el nombre del centro y del representante, nunca el CI (A-10 sin cambios). La tabla de
datos de un informe guardado **detecta el formato**: si sus filas traen `servicio` (informe anterior a
F-009), muestra la columna "Servicio"; si traen `centroSalud`, "Centro de salud".

**Fundamento**: agrupar por representante conserva la verdad cuando un centro cambió de persona en el
período (aparecen dos filas del mismo centro, cada una con su responsable). Los informes guardados no
se modifican nunca (principio IV); detectar el formato es una condición de una línea y cumple el caso
borde de la especificación.

**Alternativas descartadas**: agrupar solo por centro (oculta quién pidió); migrar el JSON de los
informes guardados (modifica documentos que deben quedar como se generaron).

---

## O-06 · Selectores de representante y de centro

**Decisión**:

- `listarRepresentantesParaSelector(idActual?)` devuelve `etiqueta` con el centro y la marca
  "(inactivo)" cuando corresponde. Lo usan el formulario de pedido y los cuatro filtros.
- `listarCentrosParaRepresentante(idActual?)`, nueva, devuelve los centros activos **sin
  representante activo** más el centro actual del representante que se modifica (FR-005). Reemplaza
  la preselección de FR-022 de F-002: si queda un solo centro disponible, se preselecciona.

**Fundamento**: que el selector no ofrezca centros ocupados evita el error antes de que ocurra; la
regla sigue verificándose en el servicio y en la base (O-01).

**Alternativas descartadas**: ofrecer todos los centros y dejar que falle al guardar (peor
experiencia); ocultar el campo de centro al modificar (impediría corregir un centro mal elegido).

---

## O-07 · Generador con un centro por representante

**Decisión**: la constante `REPRESENTANTES` del generador se reemplaza por `CENTROS`, una lista de
`{ centro, representante }`. Se crea cada centro y su único representante; la asignación de productos a
representantes, el consumo, las compras y las anulaciones no cambian, así que con la misma semilla las
cantidades generadas son las mismas (SC-006). Los motivos de anulación que dicen "servicio" pasan a
"centro de salud". Mientras Raymond no envíe los nombres (Q-07), la lista usa **nombres provisorios
evidentes** ("Centro de salud provisorio 1…5"), y la demostración que se entrega se regenera recién con
los nombres reales.

**Fundamento**: cambiar solo el catálogo y no la lógica de consumo mantiene válidas las mediciones ya
documentadas de F-006 y F-007 (SC-005 de F-006, evaluación del pronóstico). Los nombres provisorios no
pueden confundirse con datos reales, y quedan en una sola constante.

**Alternativas descartadas**: repartir cada producto entre varios centros (cambia la serie de consumo y
obliga a volver a medir todo); esperar a Q-07 para programar (bloquea el resto de la funcionalidad).

---

## O-08 · Respaldo con `pg_dump` dentro del contenedor

**Decisión**: el servicio `generarRespaldo()` (`src/servicios/respaldo.ts`) ejecuta, con `execFile`
(sin intérprete de comandos) y argumentos fijos:

```text
docker exec <contenedor> pg_dump -U <usuario> -d <base> --no-owner --no-privileges
```

- **Formato SQL plano**: se abre con el Bloc de notas y se restaura con `psql` (O-12).
- `--no-owner --no-privileges`: el archivo se restaura aunque el usuario de la base sea otro.
- **Usuario y base** se leen de `DATABASE_URL`; el **contenedor**, de la variable nueva
  `CONTENEDOR_BASE_DATOS` (por defecto `almacen-oruro-postgres`, el nombre de `docker-compose.yml`).
- **Sin contraseña**: dentro del contenedor, las conexiones locales son de confianza (`pg_hba.conf`
  de la imagen oficial, verificado el 26/09).
- `maxBuffer` explícito de 200 MB y `timeout` de 60 s: el valor por defecto de `execFile` (1 MB) se
  quedaría corto en cuanto crezcan los datos.
- **Instante coherente (FR-016)**: `pg_dump` lee toda la base dentro de una sola transacción con una
  instantánea; un documento que se guarda mientras tanto queda completo o no queda.

**Medición (26/09)**: con la demostración de 36 meses (113 compras, 188 pedidos, 187 distribuciones y
1 864 movimientos), 0,4 s y 536 KB. SC-003 pide menos de 30 s.

**Fundamento**: es la herramienta oficial de PostgreSQL, que se explica en una frase ante el tribunal
("uso la herramienta oficial del motor"), y ya viene en el contenedor que exige la instalación (D-17).
Leer las 19 tablas a mano obligaría a programar también el orden de restauración, las secuencias y la
tabla de migraciones.

**Alternativas descartadas**: exportación propia con Prisma a JSON (más código y un comando de
restauración propio que probar); instalar `pg_dump` en Windows (otro programa en la guía y un posible
choque de versiones con el servidor 16); formato `custom` de `pg_dump` (binario, no se puede leer y
exige `pg_restore`); pasar la contraseña con `PGPASSWORD` (no hace falta y quedaría en los argumentos
del proceso).

---

## O-09 · Entrega del archivo con una Server Action

**Decisión**: `generarRespaldoAccion()` sigue el orden fijo de F-001 (`requerirSesion` → servicio →
errores) y devuelve `ResultadoAccion<{ nombreArchivo, contenido }>`. El componente cliente
`BotonRespaldo` la llama, arma un `Blob` con el contenido y dispara la descarga con un enlace
temporal. El servicio espera a que `pg_dump` termine y **solo entrega el archivo si terminó bien**
(código de salida 0 y salida no vacía); si falla, devuelve un error sin contenido (FR-020). Mientras
la acción está en curso, el botón dice "Generando…" y queda deshabilitado (FR-021).

**Fundamento**: el proyecto no tiene ningún manejador de ruta: todo sigue el flujo página → Server
Action → servicio (T-02). Mantenerlo evita un patrón nuevo que Raymond tendría que explicar, y reutiliza
`ResultadoAccion` y `Aviso` para los errores. El límite de tamaño de las Server Actions (1 MB) aplica a
lo que se **envía** al servidor, no a la respuesta.

**Alternativas descartadas**: un manejador de ruta `GET` con la descarga directa (patrón nuevo en el
proyecto y, si transmite mientras `pg_dump` escribe, un error a mitad deja un archivo cortado que
parece bueno); guardar el archivo en una carpeta del servidor (FR-017 lo prohíbe: acumularía copias
con datos personales).

---

## O-10 · Nombre, tipo y errores del respaldo

**Decisión**:

- **Nombre**: `respaldo-almacen-oruro-AAAA-MM-DD-HHMM.sql`, en hora de Oruro (`TZ=America/La_Paz`,
  con las funciones de `src/lib/fechas.ts`).
- **Tipo**: `application/sql`, texto UTF-8.
- **Errores** (el detalle técnico de `stderr` va al registro del servidor, nunca a la pantalla):

| Situación | Mensaje |
|---|---|
| Docker no responde o no está instalado | "No se pudo generar el respaldo: Docker Desktop no está en funcionamiento. Ábrelo, espera a que diga que está listo e intenta nuevamente" |
| El contenedor no existe o está detenido | "No se pudo generar el respaldo: la base de datos no está en funcionamiento. Ejecuta `docker compose up -d` e intenta nuevamente" |
| Tarda más de 60 s | "El respaldo tardó demasiado y no se generó. Intenta nuevamente" |
| Cualquier otra falla | "No se pudo generar el respaldo. Intenta nuevamente; si se repite, revisa la guía de instalación" |

**Fundamento**: los mensajes dicen qué pasó y qué hacer (principio VI), y distinguen los dos casos
que el encargado puede resolver solo.

**Alternativas descartadas**: mostrar el error de `pg_dump` tal cual (en inglés y técnico).

---

## O-11 · Pantalla de respaldo en Administración

**Decisión**: ruta `/respaldo` en `src/app/(sistema)/respaldo/`, agregada al grupo "Administración"
de `componentes/navegacion/opciones.ts` con un ícono nuevo `respaldo`. Al estar en esa lista única,
aparece a la vez en el menú lateral y en la pantalla de inicio (I-59). La pantalla explica qué incluye
el respaldo y qué no (FR-015, FR-018), advierte sobre los datos personales y las contraseñas cifradas
(FR-019), muestra el botón y remite a la sección de restauración de la guía (FR-022).

**Fundamento**: Administración ya agrupa Personal y Sesiones, las otras tareas del sistema que no son
de almacén.

**Alternativas descartadas**: un botón en la pantalla de inicio (mezcla una tarea de mantenimiento con
las de operación); dentro de Personal (no tiene relación).

---

## O-12 · Restauración documentada y verificada

**Decisión**: la guía de instalación suma "Restaurar un respaldo", para hacer con el sistema detenido:

1. `docker compose down -v` y `docker compose up -d` (base vacía, recién creada).
2. `docker cp respaldo-….sql almacen-oruro-postgres:/tmp/respaldo.sql`
3. `docker exec almacen-oruro-postgres psql -U almacen -d almacen_oruro -v ON_ERROR_STOP=1 -f /tmp/respaldo.sql`
4. **No** ejecutar `prisma migrate deploy` ni la semilla: el respaldo ya trae el esquema y la tabla de
   migraciones.

**Verificación (26/09)**: se restauró un respaldo de la demostración en una base vacía temporal: las
cantidades de `usuario`, `compra`, `pedido`, `distribucion`, `movimiento_inventario`, `sesion` y
`_prisma_migrations` coincidieron, ningún producto quedó con el kardex descuadrado, el hash de la
contraseña de `admin` fue idéntico y las secuencias continuaron desde el último `id`. La base temporal
se borró.

**Fundamento**: `docker cp` + `psql -f` funciona igual en PowerShell 5.1, que no admite `<` y, al
pasar texto por tubería, puede cambiar la codificación y romper las tildes.

**Alternativas descartadas**: `psql < respaldo.sql` (no funciona en PowerShell 5.1);
`Get-Content … | docker exec -i …` (riesgo de codificación); `pg_dump --clean` para restaurar sobre una
base con datos (destructivo y fácil de ejecutar por error).

---

## O-13 · Mostrar u ocultar la contraseña

**Decisión**: componente cliente `CampoContrasena` en `src/componentes/ui/campo-contrasena.tsx`, con
las mismas propiedades que `Campo` salvo `type`. Muestra un botón `type="button"` a la derecha del
campo con el texto "Mostrar" u "Ocultar", `aria-pressed` y `aria-controls`; cada campo tiene su propio
estado y empieza oculto (FR-024, FR-025). Escucha el evento `submit` de su formulario (`input.form`) y
vuelve a ocultarse al enviar, con éxito o con error (FR-026). Oculta el botón nativo de Edge
(`::-ms-reveal`) para que no aparezcan dos. Reemplaza a `Campo` en los ocho campos de contraseña.

**Fundamento**: `Campo` se usa en todos los formularios y hoy es un componente de servidor; volverlo
de cliente sumaría JavaScript a pantallas que no lo necesitan. Un botón con texto se entiende sin
conocer el ícono del ojo y lo anuncia bien un lector de pantalla. Cambiar solo el `type` del campo no
toca `name` ni el valor, así que lo enviado y la validación no cambian.

**Alternativas descartadas**: agregar una propiedad a `Campo` (lo convierte en componente de cliente);
un botón solo con ícono (ambiguo para quien no conoce el símbolo); mantener la contraseña visible
después de enviar (quedaría a la vista si el formulario vuelve con errores).

---

## O-14 · Pruebas

**Decisión**:

- **Integración (regla crítica, principio IX)**: registrar, reactivar y cambiar de centro con otro
  representante activo (rechazo con el nombre); dos registros simultáneos en el mismo centro (uno solo
  aceptado); desactivar con pedidos por atender y distribuir después uno de esos pedidos; selector de
  centros disponibles; etiqueta con el centro en pedidos, distribuciones, reportes, kardex e informe
  IA; generador reducido con un representante activo por centro.
- **Respaldo**: `generarRespaldo` con un ejecutor inyectado (como el `Redactor` de A-08) para probar
  los cuatro errores de O-10 sin Docker; y una prueba real, que se salta si no hay contenedor, que
  genera el respaldo de la base de pruebas y verifica que contiene todas las tablas.
- **Unitarias**: `etiquetaRepresentante`, nombre del archivo de respaldo, esquema del representante
  sin `servicio`.
- **Ajuste de pruebas existentes**: el ayudante `crearRepresentanteDePrueba` ya crea un centro nuevo
  por representante, así que la mayoría no cambia; se quitan los `servicio:` de diez archivos y se
  corrigen las que ponen dos representantes activos en el mismo centro.
- `CampoContrasena` se verifica en el recorrido manual (quickstart): el proyecto no tiene pruebas de
  componentes y no se agrega esa infraestructura por un botón.

**Fundamento**: la regla nueva y el respaldo son donde un error rompe datos o la defensa; el botón de
contraseña no cambia lo que se envía.

**Alternativas descartadas**: probar el respaldo solo contra Docker real (las pruebas fallarían en un
equipo sin el contenedor levantado); agregar Testing Library para un componente.
