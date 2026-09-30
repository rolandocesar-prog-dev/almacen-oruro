# 03 · Funcionalidades (insumo para `/speckit-specify`)

> **Uso:** cada sección `F-00x` corresponde a **una ejecución** de `/speckit-specify`. Se copia el bloque "Texto para `/speckit-specify`" y se le agrega al final: *"Respeta las reglas de negocio y entidades de `docs/especificacion/02-modelo-de-dominio.md`"*.
>
> Spec Kit genera `specs/00x-nombre/spec.md` con historias de usuario, escenarios de aceptación y requerimientos numerados. Después se corre `/speckit-clarify` sobre esa especificación antes de pasar a `/speckit-plan`.
>
> Una especificación dice **qué** y **por qué**, nunca **cómo**: aquí no se nombran frameworks ni tablas de Prisma.

## Trazabilidad con el Capítulo II

| Word | Funcionalidad |
|---|---|
| Requerimientos 1, 11, 13 · RF 1, RF 7 | F-001 |
| Requerimientos 2, 3, 5, 6, 9, 10, 12 · RF 2 | F-002 |
| Requerimiento 8 · RF 4 | F-003 |
| Requerimiento 4 · RF 5 | F-004 |
| Requerimiento 7 · RF 3 | F-005 |
| RF 6 | F-006 |
| Requerimientos 14, 15 · RF 6 | F-007 |

**Actor único:** Encargado de almacén (D-10).

---

## F-001 · Acceso y personal

### Texto para `/speckit-specify`

> Acceso al sistema y gestión del personal. El sistema lo usa un único tipo de usuario, el Encargado de almacén, que tiene acceso a todas las funciones. El personal que opera el sistema es a la vez el usuario: al registrar a una persona se guardan sus datos personales (nombre, apellido, cargo, dirección, teléfono), su nombre de usuario y su contraseña. Solo el personal activo puede ingresar, con usuario y contraseña; toda sesión queda registrada con su hora de inicio y de fin. El encargado puede registrar, modificar, desactivar y reactivar personal, y restablecer la contraseña de otra persona. Motivo: en el sistema de 2022 las contraseñas se guardaban en texto plano y el personal se borraba físicamente; ahora las contraseñas se protegen y nada se borra.

### Historias de usuario

| # | Prioridad | Historia |
|---|---|---|
| HU-001-1 | P1 | Como encargado, quiero ingresar con mi usuario y contraseña para usar el sistema |
| HU-001-2 | P1 | Como encargado, quiero cerrar sesión para que nadie use mi cuenta en la computadora del almacén |
| HU-001-3 | P1 | Como encargado, quiero registrar personal con su usuario para que otros puedan operar el sistema |
| HU-001-4 | P1 | Como encargado, quiero modificar y desactivar personal para mantener el acceso al día |
| HU-001-5 | P2 | Como encargado, quiero cambiar mi contraseña y restablecer la de otro usuario |
| HU-001-6 | P3 | Como encargado, quiero ver el historial de sesiones para saber quién ingresó y cuándo |

### Criterios de aceptación clave
- Dado un usuario **inactivo** con credenciales correctas, cuando intenta ingresar, entonces se le niega el acceso con el mensaje genérico (RN-01).
- Dada una contraseña incorrecta, el mensaje no revela si lo que falló fue el usuario o la contraseña.
- Dado un nombre de usuario que ya existe (sin importar mayúsculas), cuando se registra otra persona con él, entonces no se guarda y se indica el duplicado.
- Dada una sesión con más de 8 horas, cualquier acción redirige al inicio de sesión y la sesión queda cerrada en la bitácora.
- Quien intenta acceder a cualquier página sin sesión es redirigido al inicio de sesión.
- Un usuario no puede desactivarse a sí mismo (RN-04).

### Fuera de alcance
Roles y permisos diferenciados, recuperación de contraseña por correo, bloqueo por intentos fallidos.

---

## F-002 · Catálogos

> **Cambio posterior a la entrega (F-009, 26/09):** se opera con **varios centros de salud, cada uno con un solo representante activo**, y el representante ya no tiene "servicio" (D-21, D-22, RN-18). El texto de abajo es el que se especificó para la entrega. Detalle en `specs/009-observaciones-raymond/`.

### Texto para `/speckit-specify`

> Gestión de los catálogos que usan las compras, pedidos y distribuciones: categorías de productos, unidades de medida, productos de limpieza, proveedores, qué productos ofrece cada proveedor, centros de salud y representantes de los centros de salud. Para cada catálogo el encargado puede registrar, modificar, listar con búsqueda, desactivar y reactivar. Eliminar significa desactivar: el registro deja de aparecer para elegir en documentos nuevos, pero se conserva en el histórico. El sistema impide duplicados: nombre de categoría, nombre de unidad, código y nombre de producto, NIT de proveedor, nombre de centro de salud y CI de representante. El producto muestra su stock actual, pero no se puede modificar desde aquí: solo cambia con compras y distribuciones. Cada producto tiene un stock mínimo. Se opera con un único centro de salud, al que pertenecen los representantes (responsables de un servicio o área). Motivo: en 2022 los borrados rompían el histórico de compras y no había validación consistente de duplicados.

### Historias de usuario

| # | Prioridad | Historia |
|---|---|---|
| HU-002-1 | P1 | Como encargado, quiero registrar y mantener productos con categoría, unidad y stock mínimo |
| HU-002-2 | P1 | Como encargado, quiero registrar y mantener proveedores para asociarlos a las compras |
| HU-002-3 | P1 | Como encargado, quiero registrar y mantener el centro de salud y sus representantes para registrar pedidos |
| HU-002-4 | P1 | Como encargado, quiero registrar y mantener categorías y unidades de medida |
| HU-002-5 | P2 | Como encargado, quiero buscar en cada listado por nombre o código y filtrar activos e inactivos |
| HU-002-6 | P3 | Como encargado, quiero indicar qué productos ofrece cada proveedor, con precio referencial |

### Criterios de aceptación clave
- Dado un producto "Lavandina 1 L", cuando se registra " lavandina  1 l ", entonces se rechaza como duplicado (RN-10).
- Dada una categoría con productos activos, cuando se intenta desactivarla, entonces se rechaza y se indica cuántos productos la usan (RN-13).
- Dado un proveedor inactivo, no aparece en el selector de proveedores de una compra nueva, pero sus compras anteriores lo siguen mostrando.
- El formulario de producto no permite editar el stock actual.
- El NIT acepta solo dígitos.

### Fuera de alcance
Importación masiva de catálogos, imágenes de productos, lotes y vencimientos.

---

## F-003 · Compras e inventario

### Texto para `/speckit-specify`

> Registro de las compras de productos de limpieza a los proveedores, y control del inventario. Una compra tiene una cabecera (proveedor, número de factura, fecha, observación) y un detalle con uno o más productos, cada uno con cantidad y precio unitario; el sistema calcula subtotales y total. Al guardar, cada producto aumenta su stock y queda registrado un movimiento de entrada en el kardex. El número de factura no puede repetirse para el mismo proveedor entre compras vigentes. Una compra no se edita: si tiene errores se anula indicando el motivo, lo que revierte el stock mediante un movimiento de anulación; no se puede anular si el producto ya se distribuyó y el stock no alcanza. El encargado consulta las existencias (stock actual frente al mínimo, con los productos bajo mínimo resaltados) y el kardex de cada producto (movimientos con fecha, tipo, documento de origen, cantidad y saldo). Motivo: en 2022, una factura duplicada hacía que el detalle se guardara en la compra anterior y el stock subiera igual; ahora la compra se guarda completa o no se guarda.

### Historias de usuario

| # | Prioridad | Historia |
|---|---|---|
| HU-003-1 | P1 | Como encargado, quiero registrar una compra con varios productos para que el stock aumente |
| HU-003-2 | P1 | Como encargado, quiero que se me avise de inmediato si la factura ya está registrada para ese proveedor |
| HU-003-3 | P1 | Como encargado, quiero consultar las existencias y ver qué productos están bajo el mínimo |
| HU-003-4 | P1 | Como encargado, quiero ver el kardex de un producto para saber de dónde sale su stock |
| HU-003-5 | P1 | Como encargado, quiero listar las compras y ver el detalle de cada una |
| HU-003-6 | P2 | Como encargado, quiero anular una compra mal registrada indicando el motivo |

### Criterios de aceptación clave
- Dada una compra con 3 productos, cuando se guarda, entonces el stock de cada uno sube en su cantidad y hay 3 movimientos `ENTRADA_COMPRA` con saldo correcto.
- Dada una factura 1234 vigente del proveedor A, cuando se registra la factura 1234 del proveedor A, entonces se rechaza y no cambia ningún stock; si es del proveedor B, entonces se acepta (RN-21).
- Si falla cualquier línea al guardar, no queda guardada ni la cabecera ni ninguna línea ni ningún movimiento (RN-20).
- El total mostrado es igual a la suma de subtotales calculados por el servidor, aunque el cliente envíe otro valor.
- Dada una compra de 10 unidades de un producto sin otro stock, de la que ya se distribuyeron 7, cuando se intenta anular, entonces se rechaza indicando que faltan 7 unidades de ese producto (RN-25).
- Para todo producto, stock actual = suma de sus movimientos (RN-50).

### Fuera de alcance
Orden de compra previa, aprobación, pago y cuentas por pagar, ajustes manuales de inventario (P3 si alcanza).

---

## F-004 · Pedidos

> **Cambio posterior a la entrega (F-009, 26/09):** el representante se muestra con su centro de salud ("Apellido, Nombre · Centro", D-23), y se puede desactivar aunque tenga pedidos por atender, que siguen a su nombre (RN-13 modificada).

### Texto para `/speckit-specify`

> Registro de los pedidos de productos de limpieza que hacen los representantes del centro de salud. El encargado registra el pedido eligiendo un representante activo, la fecha, y uno o más productos con la cantidad solicitada. El pedido tiene un estado que el sistema calcula según lo entregado: pendiente (nada entregado), parcial (algo entregado) o atendido (todo entregado). Además el encargado puede anularlo con motivo si está pendiente o parcial; en el caso parcial, lo entregado se mantiene. Solo se edita mientras está pendiente. El listado de pedidos se filtra por estado y representante, y el detalle muestra por producto lo solicitado, lo entregado y lo pendiente. Registrar un pedido no mueve el stock. Motivo: en 2022 el pedido guardaba el producto en dos lugares y pasaba a "Enviado" sin comparar cantidades.

### Historias de usuario

| # | Prioridad | Historia |
|---|---|---|
| HU-004-1 | P1 | Como encargado, quiero registrar el pedido de un representante con varios productos |
| HU-004-2 | P1 | Como encargado, quiero ver los pedidos pendientes y parciales para planificar la distribución |
| HU-004-3 | P1 | Como encargado, quiero ver en el detalle cuánto se pidió, cuánto se entregó y cuánto falta |
| HU-004-4 | P2 | Como encargado, quiero editar un pedido que aún no se atendió |
| HU-004-5 | P2 | Como encargado, quiero anular un pedido o su saldo pendiente, con motivo |

### Criterios de aceptación clave
- Un pedido nuevo queda `PENDIENTE` y no cambia ningún stock.
- Dado un representante inactivo, no aparece en el selector.
- Un producto no puede repetirse en el mismo pedido.
- Dado un pedido `PARCIAL`, la opción de editar no está disponible.
- Dado un pedido `ATENDIDO`, no puede anularse.

### Fuera de alcance
Que el representante registre su propio pedido, aprobación del pedido, prioridad o urgencia.

---

## F-005 · Distribución

### Texto para `/speckit-specify`

> Distribución de productos de limpieza para atender los pedidos. El encargado elige un pedido pendiente o parcial; el sistema muestra el representante y, por cada producto, lo solicitado, lo ya entregado, lo pendiente y el stock disponible. El encargado ingresa el número de vale (del talonario físico), la fecha, una observación y la cantidad que entrega de cada producto, que no puede superar ni lo pendiente ni el stock disponible. Se permiten entregas parciales. Al guardar, cada producto reduce su stock con un movimiento de salida en el kardex, se actualiza lo entregado en el pedido y se recalcula su estado. El número de vale no se repite entre distribuciones vigentes. Una distribución no se edita: se anula con motivo, lo que repone el stock y descuenta lo entregado del pedido. El encargado lista las distribuciones y ve el detalle de cada una. Motivo: en 2022 el stock podía quedar negativo y un vale duplicado dejaba el detalle en la distribución anterior.

### Historias de usuario

| # | Prioridad | Historia |
|---|---|---|
| HU-005-1 | P1 | Como encargado, quiero registrar la entrega de productos para un pedido y que el stock baje |
| HU-005-2 | P1 | Como encargado, quiero entregar parcialmente cuando no alcanza el stock y completar después |
| HU-005-3 | P1 | Como encargado, quiero que el sistema me impida entregar más de lo que hay o de lo que se pidió |
| HU-005-4 | P1 | Como encargado, quiero listar las distribuciones y ver su detalle |
| HU-005-5 | P2 | Como encargado, quiero anular una distribución mal registrada |
| HU-005-6 | P3 | Como encargado, quiero imprimir el vale con espacio para firmas de entrega y recepción |

### Criterios de aceptación clave
- Dado un pedido de 10 unidades con stock 6, cuando se entregan 6, entonces el stock queda en 0, el pedido pasa a `PARCIAL` y lo pendiente es 4.
- Dada la misma situación, cuando se intenta entregar 7, entonces se rechaza sin guardar nada (RN-32).
- Dados dos registros simultáneos que juntos superan el stock, solo uno se guarda y el otro recibe el error de stock insuficiente.
- Dado el vale 500 vigente, cuando se registra otra distribución con el vale 500, entonces se rechaza sin tocar el stock.
- Al completar lo pendiente de todas las líneas, el pedido pasa a `ATENDIDO`.
- Al anular la única distribución de un pedido `ATENDIDO`, el pedido vuelve a `PENDIENTE` y el stock se repone.

### Fuera de alcance
Distribuciones sin pedido, transporte y logística, confirmación de recepción por el representante.

---

## F-006 · Reportes

### Texto para `/speckit-specify`

> Reportes para consultar e imprimir la información del almacén. Cada reporte tiene filtros básicos, muestra totales y se puede imprimir con un formato limpio (encabezado con nombre del reporte, filtros aplicados, fecha y hora de emisión y usuario que lo emite). Los reportes son: (1) compras en un rango de fechas, filtrable por proveedor, con total gastado; (2) distribuciones en un rango de fechas, filtrable por representante y por producto, con cantidades entregadas; (3) existencias actuales, filtrable por categoría y por "solo bajo mínimo"; (4) kardex de un producto en un rango de fechas; (5) pedidos en un rango de fechas, filtrable por estado y representante. Los documentos anulados se excluyen por defecto, con opción de incluirlos. Por defecto, el rango de fechas es el mes en curso.

### Reportes y filtros (D-12)

| # | Reporte | Filtros | Columnas | Totales | Prioridad |
|---|---|---|---|---|---|
| R-1 | Compras | Fechas (obligatorio), proveedor, incluir anuladas | Fecha, Nº factura, proveedor, cantidad de ítems, total, estado | Total gastado, Nº de compras | P2 |
| R-2 | Distribuciones | Fechas (obligatorio), representante, producto, incluir anuladas | Fecha, Nº vale, representante, servicio, producto, cantidad | Cantidad total por producto | P2 |
| R-3 | Existencias | Categoría, solo bajo mínimo | Código, producto, categoría, unidad, stock actual, stock mínimo, indicador | Nº de productos bajo mínimo | P2 |
| R-4 | Kardex | Producto (obligatorio), fechas | Fecha, tipo, documento, entrada, salida, saldo | Saldo inicial y final del período | P3 |
| R-5 | Pedidos | Fechas (obligatorio), estado, representante | Fecha, representante, Nº ítems, % atendido, estado | Nº por estado | P3 |

> **Cambio posterior a la entrega (F-009, 26/09):** en R-2 y R-5 la columna "servicio" pasó a ser "centro de salud", y el filtro de representante del encabezado lleva su centro (D-23).

### Criterios de aceptación clave
- El total de R-1 coincide con la suma de las compras vigentes del período filtrado.
- En R-4, el saldo final coincide con el stock actual cuando el rango termina hoy.
- La vista de impresión no muestra menús ni botones y muestra los filtros aplicados.

### Fuera de alcance
Exportar a Excel o PDF descargable (se imprime o guarda como PDF desde el navegador), gráficos de tablero, reportes programados.

---

## F-007 · Inteligencia artificial

### Texto para `/speckit-specify`

> Módulo de inteligencia artificial con dos capas. **Capa de pronóstico:** a partir del kardex, el sistema arma la serie mensual de consumo (salidas por distribución menos sus anulaciones) de cada producto y pronostica el consumo del mes en curso (el primero sin datos completos). Muestra, para cada producto, el pronóstico, el stock actual, el stock mínimo y una cantidad sugerida de reposición; y para un producto elegido, un gráfico con el consumo histórico y el pronóstico. El sistema evalúa la calidad del pronóstico reservando los últimos 6 meses y comparando el error del método contra dos métodos de referencia simples, y muestra esa comparación. **Capa de informes:** el encargado elige un período y genera el "Informe IA de compras" o el "Informe IA de distribuciones": el sistema calcula los datos agregados del período y un modelo de lenguaje redacta en español un informe con hallazgos y recomendaciones basado solo en esos datos. El informe muestra el texto junto a la tabla de datos que lo originó, se guarda con su fecha y se puede volver a consultar e imprimir sin conexión. Como no existen datos históricos reales, el sistema incluye un generador de 36 meses de histórico simulado, claramente identificado como simulado. Motivo: cubrir los requerimientos 14 y 15 ("emitir informe con IA") con un componente de IA verificable y conectado a la operación (qué comprar), en lugar de un texto decorativo.

### Definición técnica que la especificación debe dejar explícita (se detalla en `/speckit-plan`)

**Serie.** Consumo mensual por producto = −Σ cantidad de movimientos `SALIDA_DISTRIBUCION` y `ANULACION_DISTRIBUCION` cuya `fecha_documento` cae en el mes (RN-53). Como la anulación lleva la fecha de la distribución anulada, ningún mes queda con consumo negativo. Los meses sin movimientos valen 0.

**Método principal.** Suavizado exponencial de Holt-Winters **aditivo** con estacionalidad de 12 meses. Parámetros α, β, γ ∈ {0,1; 0,2; … 0,9}, elegidos por búsqueda en rejilla minimizando el error dentro del período de entrenamiento (si se eligieran mirando la validación, la evaluación quedaría sesgada a favor del método; corregido al especificar F-007). Método de respaldo si hay menos de 24 meses de datos: promedio móvil de 3 meses (y se indica en pantalla).

**Evaluación.**
- Entrenamiento: todos los meses menos los últimos 6. Validación: los últimos 6.
- Métodos de referencia: (a) **ingenuo estacional**: el mismo mes del año anterior; (b) **promedio móvil de 3 meses**.
- Métricas: **MAE** (error absoluto medio, en unidades) y **WAPE** (Σ|error| / Σ real, en porcentaje; no se indefine cuando un mes vale 0).
- Resultado mostrado: tabla por producto y promedio general, con el mejor método resaltado. Ese resultado alimenta el capítulo de resultados del proyecto.

**Reposición sugerida.** `max(0, ⌈pronóstico del mes en curso + stock mínimo − stock actual⌉)`. El mes pronosticado es el mes en curso, el primero sin datos completos (aclarado en F-007). Se muestra la fórmula en pantalla.

**Informe IA de compras** — datos enviados: total gastado y Nº de compras en el período y en el período anterior de igual duración; gasto por proveedor; los 10 productos con más gasto; productos bajo mínimo; reposición sugerida.

**Informe IA de distribuciones** — datos enviados: cantidad entregada por representante y servicio (desde F-009, por centro de salud y representante); los 10 productos más distribuidos; pedidos por estado; comparación con el período anterior; pronóstico del mes en curso de los 10 productos principales.

**Reglas del informe.**
- Al modelo se le indica que no invente cifras, que use solo los datos entregados, y que responda con secciones fijas: *Resumen*, *Hallazgos*, *Alertas*, *Recomendaciones*.
- Solo se envían datos agregados: nunca contraseñas, teléfonos, direcciones ni CI.
- Si no hay conexión o falla el servicio, se informa el error y se ofrecen los informes ya guardados; el pronóstico y la reposición siguen funcionando porque no dependen del servicio externo.
- Cada informe guarda los datos de entrada, el texto, el modelo usado y la fecha.

**Datos simulados (S-05, S-06).**
- 1 centro de salud, 5 representantes, ~25 productos en ~6 categorías, 36 meses que terminan el mes anterior al actual.
- Consumo base por producto, factor estacional mensual (más alto en junio–agosto), tendencia de +3 % anual y ruido aleatorio de ±15 % con **semilla fija** (reproducible).
- Los pedidos, distribuciones y compras se generan **usando los mismos servicios del sistema**, para que el kardex quede coherente y respete todas las reglas.
- El generador solo se ejecuta sobre una base vacía o de demostración, nunca sobre datos reales. Al terminar, marca toda la base como de demostración (`configuracion.modo_demostracion`), lo que activa la leyenda en todas las pantallas y reportes (aclarado en F-006).

### Historias de usuario

| # | Prioridad | Historia |
|---|---|---|
| HU-007-1 | P1 | Como encargado, quiero ver el pronóstico de consumo del mes en curso por producto |
| HU-007-2 | P1 | Como encargado, quiero una cantidad sugerida de compra por producto para no quedarme sin stock |
| HU-007-3 | P1 | Como responsable del proyecto, quiero ver la evaluación del error del pronóstico frente a métodos simples, para demostrar que funciona |
| HU-007-4 | P1 | Como responsable del proyecto, quiero generar un histórico simulado reproducible para disponer de datos con los que probar |
| HU-007-5 | P2 | Como encargado, quiero generar el Informe IA de compras de un período |
| HU-007-6 | P2 | Como encargado, quiero generar el Informe IA de distribuciones de un período |
| HU-007-7 | P2 | Como encargado, quiero consultar e imprimir informes IA ya generados, aunque no haya internet |
| HU-007-8 | P3 | Como encargado, quiero ver un gráfico del consumo histórico y del pronóstico de un producto |

### Criterios de aceptación clave
- Con la misma base y la misma semilla, el generador produce exactamente los mismos datos.
- Con los mismos datos, el pronóstico da siempre el mismo resultado.
- Para una serie de prueba construida a mano (estacionalidad perfecta, sin ruido), el pronóstico del método principal tiene menor error que el promedio móvil.
- Para un producto con stock actual mayor que pronóstico + mínimo, la reposición sugerida es 0.
- Toda cifra que aparece en el texto de un informe IA existe en su tabla de datos de entrada (verificación manual en la demostración).
- Sin conexión a internet, el módulo de pronóstico funciona y los informes guardados se pueden abrir.
- La base generada queda marcada como simulada, con la fecha y la semilla de la simulación. (Hasta el 29/09 las pantallas mostraban además la leyenda "Datos simulados con fines de demostración"; se quitó a pedido de Raymond, D-26.)

### Fuera de alcance
Modelos de aprendizaje profundo, pronóstico por representante, reentrenamiento programado, chat conversacional con los datos, pronóstico de precios.
