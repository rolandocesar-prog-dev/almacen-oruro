# Plan de implementación: F-007 · Inteligencia artificial

**Rama**: `007-inteligencia-artificial` (se trabaja en `main`) | **Fecha**: 2026-09-15 | **Especificación**: [spec.md](spec.md)

**Entrada**: especificación de `specs/007-inteligencia-artificial/spec.md`, con 4 aclaraciones del 13/09
(parámetros elegidos solo con entrenamiento, mes pronosticado = mes en curso, generador solo por comando de
instalación y resaltado de cifras como P3).

## Resumen

F-007 cierra el sistema con dos capas separadas (constitución, principio VIII):

- **Pronóstico (P1, sin internet):** el sistema arma la serie de consumo mensual de cada producto desde el
  kardex, pronostica el mes en curso con Holt-Winters aditivo (o métodos más simples si hay poca historia),
  sugiere cuánto reponer y **demuestra con números** que su método pronostica mejor que dos métodos de
  referencia, reservando los últimos 6 meses para validar.
- **Informes (P2, requiere internet solo para generar):** el sistema calcula los agregados del período y un
  modelo de lenguaje **solo redacta** el informe en español; el texto se muestra junto a la tabla de datos
  que lo originó, se guarda y se puede consultar e imprimir sin conexión.

Además incluye el **generador de 36 meses de histórico simulado** (P1), que ejecuta un comando de
instalación usando los servicios reales de F-003 a F-005 y marca la base como de demostración.

**Enfoque técnico:** todo el cálculo es propio y determinista (research A-01 a A-06), escrito como funciones
puras que se prueban sin base de datos; nada de eso se guarda, se recalcula al consultar. La única
dependencia nueva es el SDK oficial de Anthropic, detrás de un **puerto `Redactor`** que permite probar toda
la funcionalidad sin red ni clave (A-08). El generador usa `registrarCompra`, `registrarPedido`,
`registrarDistribucion` y las anulaciones, con un generador pseudoaleatorio sembrado (A-07). La consulta,
la ficha y la impresión de informes reutilizan el encabezado y el grupo de rutas `(impresion)` de F-005 y
F-006 (A-11).

## Contexto técnico

**Lenguaje/Versión**: TypeScript 5.9.3 estricto sobre Node.js 22 LTS (sin cambios)

**Dependencias principales**: las de F-001 más **`@anthropic-ai/sdk`** (única dependencia nueva, versión
exacta como el resto, T-01). El pronóstico, la evaluación y el gráfico no usan ninguna librería.

**Servicio externo**: Claude a través de la API de Anthropic, modelo **`claude-opus-5`**, con salida
estructurada validada con Zod; clave en `ANTHROPIC_API_KEY` (variable de entorno, nunca versionada)

**Almacenamiento**: PostgreSQL 16; tablas `informe_ia` y `configuracion` ya creadas; **sin migraciones
nuevas**

**Pruebas**: Vitest; unitarias para el método, las métricas y la reposición (sin base de datos) e
integración para la serie, el generador reducido y los informes con un redactor falso (research A-14)

**Plataforma**: la de F-001; la defensa puede ser **sin internet**, y solo generar un informe nuevo lo
necesita

**Tipo de proyecto**: aplicación web full-stack (un solo proyecto) más un script de instalación

**Metas de rendimiento**: pronóstico de todo el catálogo con la evaluación completa en menos de 10 s
(SC-005); un informe en menos de 60 s (SC-006), con `timeout` de 60 s en la llamada

**Restricciones**: el pronóstico y la evaluación son deterministas y no se guardan (FR-004); el modelo no
calcula ni inventa cifras (FR-012); no se le envían contraseñas, teléfonos, direcciones, correos ni CI; el
generador solo corre sobre una base sin documentos y solo desde el comando de instalación (FR-022, FR-024)

**Escala**: ~25 productos × 36 meses; 729 combinaciones de parámetros por producto; decenas de informes

## Verificación contra la constitución

*Puerta: debe pasar antes de la investigación y otra vez después del diseño.*

| # | Principio | Cómo lo cumple este plan | Antes | Después del diseño |
|---|---|---|---|---|
| I | Explicabilidad | Holt-Winters escrito en el proyecto en ~60 líneas con su inicialización y su desempate documentados; el generador y las métricas, funciones puras; decisiones A-01 a A-14 en `docs/decisiones.md`; la fórmula de reposición se muestra en pantalla | ✅ | ✅ |
| II | Lógica en la aplicación | Serie, pronóstico, evaluación y agregados en `src/servicios/ia/`; consultas de Prisma, sin SQL crudo | ✅ | ✅ |
| III | Kardex como única fuente | La serie sale de `movimiento_inventario`; el generador crea documentos con los servicios reales, así que cada movimiento pasa por `registrarMovimiento`; la consistencia se verifica al terminar (SC-004) | ✅ | ✅ |
| IV | Documentos inmutables | El generador anula documentos, no los edita; los informes guardados no se modifican ni se borran | ✅ | ✅ |
| V | Baja lógica | El pronóstico solo considera productos activos; los datos de productos inactivos siguen contando en los informes de los períodos en que estuvieron activos | ✅ | ✅ |
| VI | Validación en dos lugares | Un esquema Zod por formulario (filtros de pronóstico e informes, nuevo informe) en cliente y servidor; la respuesta del modelo se valida con Zod (salida estructurada) | ✅ | ✅ |
| VII | Seguridad básica | `requerirSesion()` en cada página, acción e impresión; la clave del modelo vive solo en `ANTHROPIC_API_KEY`; al modelo no se le envían datos de contacto ni credenciales, y una prueba lo verifica | ✅ | ✅ |
| VIII | IA transparente y verificable | Cálculo local y determinista, documentado paso a paso; el modelo solo redacta a partir de datos ya calculados; el informe guarda y muestra sus datos de entrada, el modelo y la fecha; los datos simulados se declaran en toda la interfaz | ✅ | ✅ |
| IX | Pruebas donde duele | Determinismo, comparación contra los métodos de referencia, métricas, reposición, generador reproducible con inventario consistente y las cuatro fallas del servicio de redacción ([quickstart §2](quickstart.md#2-pruebas-automatizadas)) | ✅ | ✅ |
| X | Idioma y nombres | `serieDeConsumo`, `pronosticarProducto`, `reposicionSugerida`, `evaluarCatalogo`, `generarInforme`, `/ia/pronostico` | ✅ | ✅ |
| XI | Alcance cerrado | Sin aprendizaje profundo, chat con los datos, pronóstico por representante ni envío por correo; el gráfico y el resaltado de cifras son P3 | ✅ | ✅ |

**Resultado:** sin violaciones.

## Estructura del proyecto

### Documentación (esta funcionalidad)

```text
specs/007-inteligencia-artificial/
├── plan.md                    # Este archivo
├── research.md                # Fase 0: 14 decisiones (A-01 a A-14)
├── data-model.md              # Fase 1: serie, pronóstico, evaluación, informes y datos simulados
├── quickstart.md              # Fase 1: pruebas mínimas y recorrido de 19 pasos
├── contracts/
│   └── acciones-f007.md       # Rutas, servicios, la única Server Action y el comando de instalación
├── checklists/
│   └── requirements.md
└── tasks.md                   # Fase 2 (/speckit-tasks)
```

### Código fuente (lo que agrega o cambia F-007)

```text
src/
├── esquemas/ia.ts                             # NUEVO: filtros, nuevo informe y secciones del informe
├── servicios/ia/
│   ├── serie.ts                               # NUEVO: serie de consumo desde el kardex
│   ├── holt-winters.ts                        # NUEVO: método principal, funciones puras
│   ├── pronostico.ts                          # NUEVO: método por serie, pronóstico y reposición
│   ├── evaluacion.ts                          # NUEVO: MAE, WAPE y comparación de métodos
│   ├── informes.ts                            # NUEVO: datos, generación, listado y ficha
│   └── redactor.ts                            # NUEVO: puerto Redactor + implementación con Claude
├── componentes/ia/tabla-datos-informe.tsx     # NUEVO: tabla de datos de entrada (ficha e impresión)
└── app/
    ├── (sistema)/
    │   ├── layout.tsx, page.tsx               # CAMBIAN: IA en el menú y el inicio
    │   └── ia/                                # índice, pronostico/ (+[productoId]), evaluacion/, informes/
    └── (impresion)/ia/informes/[id]/imprimir/ # NUEVO: informe para imprimir
scripts/
└── generar-historico.mts                      # NUEVO: comando de instalación (npm run datos:simulados)
tests/
├── unitarios/                                 # método, métricas, reposición, aleatoriedad sembrada
└── integracion/                               # serie, pronóstico, generador reducido, informes con redactor falso
```

**Decisión de estructura:** la de F-001 a F-006, con una carpeta `servicios/ia/` por la cantidad de piezas
del módulo y un `scripts/` nuevo para el comando de instalación.

## Fases de este comando

| Fase | Artefacto | Estado |
|---|---|---|
| 0 · Investigación | [research.md](research.md): serie, Holt-Winters, métodos, evaluación, reposición, cálculo al vuelo, generador, redactor, datos de informe, privacidad, consulta e impresión, gráfico, rutas y pruebas | ✅ Sin pendientes |
| 1 · Diseño | [data-model.md](data-model.md): sin cambios de esquema | ✅ |
| 1 · Contratos | [contracts/acciones-f007.md](contracts/acciones-f007.md) | ✅ |
| 1 · Validación | [quickstart.md](quickstart.md) | ✅ |
| 2 · Tareas | `tasks.md` | Pendiente: `/speckit-tasks` |

## Cambios que este plan introduce en otros documentos y código existente

- **Esquema de base de datos:** ninguno.
- **Dependencia nueva:** `@anthropic-ai/sdk` con versión exacta en `package.json`.
- `.env.example`: `ANTHROPIC_API_KEY` con su explicación (solo hace falta para generar informes nuevos).
- `package.json`: script `datos:simulados`.
- `specs/001-acceso-personal/contracts/rutas.md`: sumar `/ia`, `/ia/pronostico/[productoId]` y
  `/ia/informes/[id]/imprimir`.
- `docs/instalacion.md`: paso de instalación del histórico simulado y sección de uso del módulo de IA.
- `docs/trabajo-futuro.md`: sección F-007 con los fuera de alcance de la especificación.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El generador tarda o falla a mitad (36 meses de documentos con todas las reglas) | Correr por mes con avance en consola; si falla, la base queda sin marcar y se recrea; en las pruebas se usa una configuración reducida (3 productos, 6 meses) |
| La búsqueda en rejilla (729 combinaciones × 25 productos) pasa de 10 s | Son operaciones aritméticas sobre ~36 valores; se mide en el recorrido (SC-005) y, si hiciera falta, se comparte el ajuste entre pronóstico y evaluación |
| Sin clave de API (Q-02) no se puede probar la redacción | Todo lo demás es independiente: el puerto `Redactor` deja las pruebas sin red y el recorrido marca qué pasos necesitan internet |
| El modelo inventa una cifra | Salida estructurada, instrucciones explícitas y, sobre todo, el texto junto a su tabla de datos (SC-007); el resaltado automático es P3 (FR-025) |
| El pronóstico del método principal resulta peor que el ingenuo estacional en algún producto | La evaluación lo muestra tal cual, por producto y en general: es un resultado, no una falla; la prueba con serie construida a mano fija el piso (SC-003) |
| Es la última funcionalidad y el plazo es el 21/09 | Orden de corte: primero el resaltado de cifras (P3, FR-025), después el gráfico (P3, Historia 7), después los informes (P2); el pronóstico, la evaluación y el generador son P1 |

## Seguimiento de complejidad

Sin violaciones de la constitución que justificar. La dependencia nueva (`@anthropic-ai/sdk`) es el camino
oficial para hablar con el servicio del modelo y queda aislada detrás del puerto `Redactor`.
