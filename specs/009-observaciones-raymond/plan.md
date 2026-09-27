# Plan de implementación: F-009 · Observaciones de Raymond

**Rama**: `009-observaciones-raymond` | **Fecha**: 2026-09-26 | **Especificación**: [spec.md](spec.md)

**Entrada**: especificación de `specs/009-observaciones-raymond/spec.md`, con 9 aclaraciones del 26/09
(varios centros reales, un representante activo a la vez, desactivar con pedidos por atender, el
centro en todos los lugares, centros reales para la demostración, respaldo solo descargable y solo con
los datos de la base; y, en el clarify, filtros solo por representante y representantes anteriores
sin fechas).

## Resumen

F-009 recoge las cuatro observaciones de Raymond tras recibir el sistema, después de la entrega del
21/09 (constitución 1.1.0, principio XI):

- **Un representante activo por centro de salud (P1):** revierte D-11 y D-18. El representante pierde
  el dato "servicio" y la base garantiza que un centro no tenga dos representantes activos. Para
  reemplazar a la persona se desactiva la anterior, aunque tenga pedidos por atender, y se registra la
  nueva.
- **Demostración con los centros reales (P1):** el generador crea un centro por representante, con el
  mismo volumen y la misma semilla.
- **El representante con su centro (P2):** "Apellido, Nombre · Centro de salud", o el centro en su propio dato, en todos los lugares de FR-011
  donde aparece un representante; "Servicio" desaparece de pantallas e impresos.
- **Respaldo (P2):** una pantalla en Administración genera y descarga todos los datos de la base; la
  restauración queda documentada y probada en la guía.
- **Ver la contraseña (P3):** botón "Mostrar / Ocultar" en los ocho campos de contraseña.

**Enfoque técnico:** la regla nueva es un **índice único parcial** declarado en el esquema, como los de
factura y vale, con el mensaje en el servicio (research O-01). Una migración con guardia elimina
`servicio` y crea el índice sin convertir datos: las bases de demostración se recrean (O-02). El
formato del representante se escribe en una sola función (O-04). El respaldo usa **`pg_dump` dentro del
contenedor** —medido: 0,4 s y 536 KB con 36 meses— y se entrega con una **Server Action**, el mismo
flujo que el resto del sistema (O-08, O-09); su restauración se verificó en una base vacía (O-12). La
contraseña visible es un componente cliente nuevo que no toca lo que se envía (O-13).

## Contexto técnico

**Lenguaje/Versión**: TypeScript 5.9.3 estricto sobre Node.js 22 LTS (sin cambios)

**Dependencias principales**: las de F-001 a F-007; **ninguna dependencia nueva**. El respaldo usa
`node:child_process` (`execFile`) y el `pg_dump` 16 que ya trae el contenedor de PostgreSQL.

**Almacenamiento**: PostgreSQL 16. **Una migración nueva** (`…_representante_por_centro`): guardia,
`DROP COLUMN representante.servicio` e índice parcial `representante_centro_activo_unico`. Sin tablas
nuevas.

**Pruebas**: Vitest; integración para RN-18 (tres vías y concurrencia), RN-13 modificada, el centro en
cada módulo, el generador reducido y el respaldo (con ejecutor simulado y uno real que se salta sin
contenedor); unitarias para la etiqueta, el nombre del archivo y el esquema (research O-14)

**Plataforma**: la de D-17: local, con PostgreSQL en Docker. El respaldo **requiere Docker en
funcionamiento** en el mismo equipo que el sistema, que es como se instala hoy

**Tipo de proyecto**: aplicación web full-stack (un solo proyecto)

**Metas de rendimiento**: respaldo de la demostración en menos de 30 s (SC-003; medido 0,4 s)

**Restricciones**: la regla de un representante activo debe resistir operaciones simultáneas (FR-001);
el respaldo nunca entrega un archivo incompleto (FR-020) ni se guarda en el servidor (FR-017), y no
incluye `.env` (FR-018); los informes IA guardados no se modifican (principio IV); mostrar la contraseña
no cambia lo enviado (FR-026)

**Escala**: 5 centros y 5 representantes simulados; las pantallas e impresos de FR-011 (unos 19 lugares si se cuentan por separado pantalla e impreso);
8 campos de contraseña en 4 pantallas

## Verificación contra la constitución

*Puerta: debe pasar antes de la investigación y otra vez después del diseño.* Se verifica contra la
**versión 1.1.0** (enmienda del 26/09 al principio XI).

| # | Principio | Cómo lo cumple este plan | Antes | Después del diseño |
|---|---|---|---|---|
| I | Explicabilidad | La regla nueva se lee en una línea del esquema; el respaldo usa la herramienta oficial del motor y sigue el mismo flujo página → acción → servicio; decisiones O-01 a O-14 en `docs/decisiones.md` | ✅ | ✅ |
| II | Lógica en la aplicación | RN-18 y RN-13 en `servicios/catalogos/representantes.ts`; la base garantiza con un índice parcial, sin triggers; el respaldo vive en `servicios/respaldo.ts` | ✅ | ✅ |
| III | Kardex como única fuente | Ningún cambio toca el stock; el generador sigue usando los servicios reales y la verificación de consistencia | ✅ | ✅ |
| IV | Documentos inmutables | Los pedidos y distribuciones conservan su representante; los informes guardados no se reescriben (la tabla detecta su formato, O-05) | ✅ | ✅ |
| V | Baja lógica | Reemplazar a un representante es desactivarlo; los centros guardan el historial de sus representantes | ✅ | ✅ |
| VI | Validación en dos lugares | `esquemaRepresentante` sin `servicio`, en cliente y servidor; el respaldo no tiene campos; los mensajes dicen qué pasó y qué hacer (O-10) | ✅ | ✅ |
| VII | Seguridad básica | `requerirSesion()` en la pantalla y la acción de respaldo; `execFile` con argumentos fijos, sin intérprete; sin contraseña de la base en el proceso; el archivo excluye `.env` y la pantalla advierte que trae contraseñas cifradas; mostrar la contraseña es solo local | ✅ | ✅ |
| VIII | IA transparente | Al modelo se le envían el centro y el nombre del representante, nunca el CI; los centros provisorios no se confunden con reales; la marca de datos simulados sigue | ✅ | ✅ |
| IX | Pruebas donde duele | RN-18 por las tres vías y en concurrencia; RN-13 modificada con distribución posterior; respaldo con sus errores y contra la base real ([quickstart §2](quickstart.md#2-pruebas-automatizadas)) | ✅ | ✅ |
| X | Idioma y nombres | `etiquetaRepresentante`, `listarCentrosParaRepresentante`, `generarRespaldo`, `CampoContrasena`, `/respaldo`, `representante_centro_activo_unico` | ✅ | ✅ |
| XI | Alcance cerrado (1.1.0) | Observaciones de quien defiende, aprobadas por el asesor, con especificación propia; D-11 y D-18 marcadas como revertidas y reemplazadas por D-21 y D-22. Quedan fuera: restaurar desde el sistema, respaldos automáticos y registro de respaldos (van a trabajo futuro) | ✅ | ✅ |

**Restricciones técnicas**: el stack no cambia; "solo generar informes necesita internet" se mantiene
(el respaldo es local); ejecutar el sistema sigue necesitando Docker (D-17), y ahora el respaldo
también.

**Resultado:** sin violaciones.

## Estructura del proyecto

### Documentación (esta funcionalidad)

```text
specs/009-observaciones-raymond/
├── spec.md                  # Especificación, con aclaraciones del 26/09
├── plan.md                  # Este archivo
├── research.md              # Decisiones O-01 a O-14
├── data-model.md            # Cambios a representante, reglas y datos simulados
├── quickstart.md            # Pruebas y recorrido de validación
├── contracts/
│   └── acciones-f009.md     # Rutas, acciones, servicios, componentes y variables
├── checklists/
│   └── requirements.md      # Calidad de la especificación (16/16)
└── tasks.md                 # Lo genera /speckit-tasks
```

### Código fuente (lo que agrega o cambia F-009)

```text
prisma/
├── schema.prisma                                  # representante: sin servicio; índice parcial
└── migrations/…_representante_por_centro/         # guardia + DROP COLUMN + índice (O-02)

src/
├── servicios/
│   ├── respaldo.ts                                # NUEVO: generarRespaldo, nombreArchivoRespaldo (O-08 a O-10)
│   ├── catalogos/representantes.ts                # RN-18, RN-13, etiquetaRepresentante, contarPedidosPorAtender
│   ├── catalogos/centros-salud.ts                 # listarCentrosParaRepresentante, obtenerRepresentantesDelCentro
│   ├── pedidos.ts · distribuciones.ts · reportes.ts · inventario.ts   # servicio → centroSalud
│   └── ia/informes.ts · ia/generador.ts           # por centro (O-05); CENTROS (O-07)
├── esquemas/catalogos/representante.ts            # sin servicio
├── componentes/
│   ├── ui/campo-contrasena.tsx                    # NUEVO (O-13)
│   ├── ui/icono.tsx                               # trazo "respaldo"
│   ├── navegacion/opciones.ts                     # Respaldo en Administración (O-11)
│   └── ia/tabla-datos-informe.tsx                 # columna según el formato (O-05)
└── app/
    ├── (sistema)/respaldo/                        # NUEVO: page.tsx, acciones.ts, boton-respaldo.tsx
    ├── (sistema)/representantes/ · centros-salud/[id]/          # formulario, listado, fichas
    ├── (sistema)/pedidos/ · distribuciones/ · reportes/ · kardex/   # centro en lugar de servicio
    ├── (impresion)/distribuciones/[id]/vale/ · reportes/…/imprimir/
    ├── ingreso/ · (sistema)/cambiar-contrasena/ · (sistema)/personal/   # CampoContrasena
    └── globals.css                                # ocultar ::-ms-reveal de Edge

tests/
├── ayudantes/catalogos.ts                         # crearRepresentanteDePrueba sin servicio
├── integracion/                                   # RN-18, RN-13, respaldo, centro por módulo; 10 archivos sin servicio
└── unitarios/                                     # etiqueta, nombre de archivo, esquema

.env.example                                       # CONTENEDOR_BASE_DATOS
docs/instalacion.md                                # "Actualizar a F-009" y "Restaurar un respaldo" (O-02, O-12)
```

**Decisión de estructura:** la de F-001 a F-007. El respaldo es un servicio de un solo archivo porque
no pertenece a ningún módulo de negocio; su pantalla vive en `(sistema)` como las demás.

## Fases de este comando

| Fase | Resultado | Estado |
|---|---|---|
| Enmienda previa | Constitución 1.1.0 (principio XI); D-11 y D-18 revertidas; D-21 a D-25; S-01, S-05 y Q-07 en `00-decisiones-y-alcance.md`; RN-13 y RN-18 en `02-modelo-de-dominio.md` | ✅ |
| 0 · Investigación | [research.md](research.md), O-01 a O-14, con el respaldo y la restauración probados | ✅ |
| 1 · Diseño | [data-model.md](data-model.md), [contracts/acciones-f009.md](contracts/acciones-f009.md), [quickstart.md](quickstart.md) | ✅ |
| Verificación posterior | Constitución sin violaciones | ✅ |

## Cambios que este plan introduce en otros documentos y código existente

- **`docs/decisiones.md`** ✅ (hecho en este plan): sección "Observaciones de Raymond" con O-01 a O-14, y
  registro de la enmienda de la constitución 1.0.0 → 1.1.0 (lo exige su sección de gobierno).
- **`docs/especificacion/03-funcionalidades.md`**: nota en F-002, F-004, F-006 (R-2 y R-5) y F-007
  (informe de distribuciones) de que F-009 reemplaza "servicio" por "centro de salud".
- **Especificaciones `specs/002` a `specs/007`**: no se reescriben, porque documentan lo entregado el
  21/09; la 009 las reemplaza donde se contradicen, y así lo dice su encabezado de referencias.
- **`docs/instalacion.md`**: "Actualizar a F-009" (recrear la base) y "Restaurar un respaldo" (O-12).
- **`docs/trabajo-futuro.md`** ✅ (hecho en este plan): restaurar desde el sistema, respaldos automáticos programados y
  registro de respaldos generados.
- **Capítulo II del Word (Q-06)**: suma a la lista de cambios para Raymond la regla de un
  representante por centro y el respaldo.

## Riesgos

| Riesgo | Efecto | Mitigación |
|---|---|---|
| Raymond no envía los nombres de los centros (Q-07) | La demostración se entregaría con nombres provisorios | Los nombres viven en una constante; la tarea de regenerar la demo queda bloqueada hasta Q-07 y no frena las demás |
| Recrear la base en el equipo de Raymond borra lo que haya cargado a mano | Pérdida de datos de práctica | Confirmar con él antes de actualizar. No hay conversión automática (O-02): lo que quiera conservar tendrá que volver a cargarlo. La versión anterior no tiene respaldo, y una copia del esquema viejo tampoco se podría restaurar sobre el nuevo |
| El sistema corre donde no hay acceso a Docker | El respaldo falla | Mensaje claro (O-10); en la instalación actual (D-17) siempre hay Docker |
| El archivo de respaldo circula con datos personales | Exposición de datos del personal y representantes | Advertencia en la pantalla (FR-019); las contraseñas van cifradas con bcrypt |
| Tocar todos los lugares de FR-011 deja algún "Servicio" olvidado | SC-002 falla | Búsqueda del campo `servicio` (patrón de la fase 2 de tasks.md) en `src/` y `tests/` como verificación de cierre, más el recorrido del quickstart paso 9 y 10 |

## Seguimiento de complejidad

Sin violaciones de la constitución que justificar.
