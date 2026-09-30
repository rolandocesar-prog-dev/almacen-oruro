# 00 · Decisiones y alcance

**Proyecto:** Sistema web con inteligencia artificial para el control de compra, almacenaje y distribución de productos de limpieza — Regional Oruro
**Autor del proyecto de grado:** Raymond Jesus Panozo Crespo
**Desarrollo y asesoría técnica:** Rolando
**Fuente:** Capítulo II del documento de grado (Word), diagrama de clases persistentes y base de datos `BDPROYECTOGRADO` (SQL Server, abril 2022)
**Estado:** Borrador para afinar · Revisión 3 · 16/09/2026

---

## 1. Fechas

| Hito | Fecha | Nota |
|---|---|---|
| Inicio de especificación | Domingo 13/09/2026 | Este documento |
| **Entrega del sistema a Raymond** | **Lunes 21/09/2026** | Plazo fijo. No es la defensa: es la fecha desde la cual Raymond estudia el sistema |
| Defensa | Por confirmar | No condiciona el alcance de este plan |

Quedan **9 días calendario**, sin margen. El alcance de abajo está cortado para ese plazo, y la sección 5 dice qué se sacrifica primero si algo se atrasa.

---

## 2. Decisiones cerradas

| # | Decisión | Fundamento | Desde |
|---|---|---|---|
| D-01 | Modelo **relacional** | Inventario transaccional: integridad referencial y saldos consistentes | 24/08 |
| D-02 | Motor **PostgreSQL** | Sin licencia, tipos numéricos y de fecha rigurosos | 24/08 |
| D-03 | Stack **Next.js + TypeScript + Prisma** | Un lenguaje, un repositorio | 24/08 |
| D-04 | **Lógica de negocio en la aplicación**, no en procedimientos almacenados | La base aporta restricciones y transacciones; la lógica queda legible y probable | 24/08 |
| D-05 | **Kardex** (`movimiento_inventario`) como fuente de verdad del stock | Trazabilidad, corrección de errores e histórico para la IA | 24/08 |
| D-06 | IA = **pronóstico de demanda + sugerencia de reposición + informe redactado por LLM** | El pronóstico da el mérito técnico; la redacción cubre los requerimientos 14 y 15 tal como están escritos | 24/08 |
| D-07 | Histórico **simulado y declarado como tal** | No hay datos reales; los de 2022 son de prueba | 24/08 |
| D-08 | Rolando desarrolla, Raymond defiende → **código explicable** | Riesgo principal del proyecto | 24/08 |
| D-09 | Metodología de desarrollo: **Spec-Driven Development con GitHub Spec Kit** | Las especificaciones sirven además como documentación y guion de defensa | 13/09 |
| D-10 | **Un solo rol: Encargado de almacén**, con acceso total | Recorte por plazo. Reemplaza los 3 roles propuestos el 24/08 | 13/09 |
| D-11 | ~~**Un solo centro de salud en operación**~~ **Revertida el 26/09 por D-21** | Recorte por plazo. El catálogo de centros de salud se mantiene porque lo exigen los requerimientos 9 y 12 | 13/09 |
| D-12 | Filtros de reportes: los básicos, definidos por la asesoría (ver `03-funcionalidades.md`, F-006) | Delegado por Rolando | 13/09 |
| D-13 | Se parte con base **en limpio**; no se migran los datos de 2022 | Son datos de prueba | 24/08 |
| D-14 | La base de 2022 se usa solo como **referencia del dominio**; sus defectos se corrigen (ver sección 4) | Pedido explícito de Raymond | 13/09 |
| D-15 | "Eliminar" en el sistema significa **baja lógica** (desactivar), nunca borrado físico | Borrar un proveedor rompía el histórico de compras | 13/09 |
| D-16 | Compras y distribuciones **no se editan: se anulan** con motivo, generando el movimiento inverso en el kardex | Documentos inmutables = kardex siempre cuadra. Explicable en una frase | 13/09 |
| D-17 | El sistema corre **en local, con PostgreSQL en Docker**; solo generar un informe IA nuevo necesita internet | Raymond lo estudia y lo defiende en su computadora, sin depender de un servidor ni de la red (resuelve Q-03) | 16/09 |
| D-18 | ~~El **representante** es la persona responsable de un servicio o área del centro de salud (emergencias, internación, laboratorio…) que solicita los productos~~ **Revertida el 26/09 por D-22** | Confirma S-01 (resuelve Q-04) | 16/09 |
| D-19 | El **Nº de vale** lo escribe el usuario a partir del talonario físico y el sistema valida que **no se repita** entre las distribuciones vigentes, sin distinguir año; no hay numeración automática ni reinicio anual | Confirma S-02 y la regla implementada en F-005 (resuelve Q-04) | 16/09 |
| D-20 | El catálogo es **simulado y verosímil, de 25 productos**, pensado para demostrar todas las funcionalidades (bajo mínimo, stock holgado, estacionalidad, anulaciones, pedidos en los cuatro estados) | No hay catálogo real disponible; lo carga el generador de F-007 (resuelve Q-05) | 16/09 |
| D-21 | Se opera con **varios centros de salud reales**, los que atiende el almacén. Reemplaza D-11 | Observación de Raymond tras la entrega (F-009) | 26/09 |
| D-22 | Cada centro de salud tiene **un solo representante activo**, la persona responsable de pedir los productos para ese centro. El dato "servicio" desaparece. Para reemplazar a la persona se desactiva la anterior y se registra la nueva; se permite desactivarla aunque tenga pedidos por atender, que siguen a su nombre. Reemplaza D-18 | Observación de Raymond (F-009); los pedidos conservan a quien realmente los hizo | 26/09 |
| D-23 | El representante se muestra siempre con su centro: **"Apellido, Nombre · Centro de salud"** | Observación de Raymond (F-009); con varios centros, el nombre solo no alcanza | 26/09 |
| D-24 | El sistema **genera y descarga un respaldo** con todos los datos de la base; la restauración se hace fuera del sistema, con la guía de instalación. No incluye el código ni la configuración con secretos | Observación de Raymond (F-009). Restaurar desde el navegador es destructivo y no se justifica para un solo almacén | 26/09 |
| D-25 | Los campos de contraseña tienen un botón para **mostrar u ocultar** lo escrito | Observación de Raymond (F-009) | 26/09 |
| D-26 | El sistema **ya no muestra el aviso** "Datos simulados con fines de demostración", ni en pantalla ni en los reportes impresos. Los datos siguen siendo simulados y se declaran en la documentación y en la defensa; la base conserva la marca, la fecha y la semilla de la simulación. Cambia cómo se cumple D-07, que sigue vigente | Observación de Raymond tras la entrega; constitución 1.2.0, principios VIII y XI | 29/09 |

---

## 3. Alcance

### 3.1 Dentro del alcance (entrega 21/09)

| Módulo | Contenido |
|---|---|
| **F-001 Acceso y personal** | Inicio y cierre de sesión, contraseñas con hash, registro de sesiones, CRUD de personal (el personal es el usuario del sistema) |
| **F-002 Catálogos** | Categorías, unidades de medida, productos (con código y stock mínimo), proveedores, relación proveedor–producto, centro de salud, representantes. Validación de duplicados y baja lógica |
| **F-003 Compras e inventario** | Compra con cabecera (proveedor, factura) y detalle; factura única por proveedor; entrada al kardex; consulta de existencias y kardex por producto; anulación de compra |
| **F-004 Pedidos** | Pedido de un representante con detalle por producto; estados PENDIENTE → PARCIAL → ATENDIDO, o ANULADO |
| **F-005 Distribución** | Vale de distribución contra un pedido; Nº de vale único; salida del kardex; entregas parciales; no permite stock negativo; anulación |
| **F-006 Reportes** | 5 reportes con filtros básicos e impresión desde el navegador |
| **F-007 Inteligencia artificial** | Generador de histórico simulado, pronóstico mensual por producto con evaluación de error, sugerencia de reposición, informe IA de compras e informe IA de distribuciones |

### 3.1.1 Después de la entrega (constitución, principio XI)

| Módulo | Contenido |
|---|---|
| **F-009 Observaciones de Raymond** (26/09) | Varios centros de salud con un representante activo cada uno (D-21, D-22); representante mostrado con su centro (D-23); respaldo descargable de la base (D-24); mostrar u ocultar contraseñas (D-25). La numeración salta de 007 a 009 porque "008" identifica el cambio de identidad visual, que no tuvo especificación propia |

### 3.2 Fuera del alcance (trabajo futuro)

- Múltiples roles y permisos diferenciados.
- Lotes y fechas de vencimiento.
- Orden de compra con flujo de aprobación (se registra la compra ya realizada).
- Acceso del representante al sistema (el pedido lo registra el encargado de almacén).
- Varios almacenes.
- Edición de documentos confirmados (se usa anulación).
- Exportar a Excel, notificaciones por correo y aplicación móvil nativa (la interfaz sí se adapta a pantallas chicas).
- Recuperación de contraseña por correo (la restablece otro usuario del sistema).

---

## 4. Defectos del sistema 2022 que se corrigen

Salen de revisar los procedimientos almacenados del `.mdf`. Cada uno se convierte en una regla de negocio de `02-modelo-de-dominio.md`.

| # | Defecto encontrado | Evidencia | Corrección |
|---|---|---|---|
| X-01 | Con una factura duplicada, `paInsertarCompra` no inserta ni avisa; `paInsertarDetalleCompra` cuelga el detalle en la **compra anterior** (`MAX(idCompra)`) y el stock sube igual | `paInsertarCompra`, `paInsertarDetalleCompra` | Cabecera y detalle en **una sola transacción**; si falla la validación, no se guarda nada y se informa el motivo (RN-20) |
| X-02 | Lo mismo con el vale duplicado en distribución | `paInsertarDistribucion`, `paInsertarRealizaDistribucion` | Igual que X-01 (RN-30) |
| X-03 | El stock puede quedar negativo | `paActualizarProductoXDistribucion` resta sin validar | Validación en transacción con bloqueo (RN-32) |
| X-04 | Contraseñas en texto plano | `paIniciarSesion`, `paVerifLogin` | Hash bcrypt (RN-02) |
| X-05 | Factura única **en toda la base**, cuando dos proveedores pueden emitir el mismo número | `paBuscarFactura` | Única por proveedor (RN-21) |
| X-06 | El proveedor está en el detalle de compra: una factura podía tener varios proveedores | Diagrama: `DetalleCompra.idProveedor` | Proveedor en la cabecera |
| X-07 | `Pedido` guarda `Producto` y `Cantidad` además de `DetallePedido` | Diagrama, `paInsertarPedido` | Solo el detalle guarda productos |
| X-08 | `Distribucion` guarda el representante además del pedido | Diagrama | El representante se obtiene del pedido |
| X-09 | Una distribución marca el pedido como "Enviado" sin comparar cantidades | `paActualizarEstPedidoXDistribucion` | El estado se calcula por cantidades entregadas (RN-41) |
| X-10 | Estados en texto libre ("En proceso", "Enviado", "Activo") | Varios | Enumeraciones controladas |
| X-11 | Borrado físico de catálogos | `paEliminarProveedor`, `paEliminarProducto`, etc. | Baja lógica (D-15) |
| X-12 | `CantidadActual` copiado en detalles como parche de auditoría | `DetalleCompra`, `Realiza` | Kardex con saldo resultante |
| X-13 | Tipos: claves `numeric`, teléfono `numeric`, importes sin escala | Diagrama | Ver tipos en `02-modelo-de-dominio.md` |
| X-14 | Subtotal y total los envía el formulario | `paInsertarDetalleCompra` | Los calcula el servidor (RN-23) |

---

## 5. Prioridades si el plazo aprieta

El orden de corte está fijado **ahora**, para no discutirlo el sábado a medianoche. Se recorta de abajo hacia arriba:

| Prioridad | Qué | Si se recorta… |
|---|---|---|
| P1 · imprescindible | F-001, F-002, F-003 (compra + kardex + existencias), F-004, F-005, pronóstico y reposición de F-007 | No hay proyecto |
| P2 · importante | Informes IA redactados (F-007), reportes de compras, distribuciones y existencias (F-006), anulaciones | Se pierde la cobertura literal de los requerimientos 14 y 15, o la corrección de errores |
| P3 · deseable | Reporte de pedidos, reporte de kardex imprimible, impresión del vale, panel de inicio, relación proveedor–producto con precio referencial, gráfico de consumo por producto, resaltado automático de cifras en los informes IA | Se documenta como trabajo futuro |

---

## 6. Supuestos (válidos hasta que Raymond diga lo contrario)

| # | Supuesto |
|---|---|
| S-01 | El **representante** es la persona responsable de un servicio o área del centro de salud (emergencias, internación, laboratorio…) que solicita los productos. **Confirmado el 16/09 (D-18)**. **Reemplazado el 26/09 por D-22**: un representante activo por centro de salud |
| S-02 | El **Nº de vale** lo escribe el usuario (talonario físico) y el sistema valida que no se repita. **Confirmado el 16/09 (D-19)** |
| S-03 | Las cantidades son **enteras**, en la unidad de presentación del producto (bidón, caja, unidad) |
| S-04 | Una distribución siempre atiende **un pedido** existente; no hay salidas sin pedido (salvo anulación) |
| S-05 | Volumen de la simulación: 1 centro de salud, 5 representantes, 25 productos en 6 categorías, 36 meses de histórico. **Catálogo simulado confirmado el 16/09 (D-20)**. **Desde F-009:** los centros de salud reales que indique Raymond (Q-07), uno por cada representante, con el mismo volumen de productos y meses |
| S-06 | Estacionalidad simulada: mayor consumo en invierno (junio–agosto) por la temporada respiratoria, leve tendencia creciente y ruido aleatorio |
| S-07 | La interfaz se usa en computadora de escritorio con Chrome o Edge |

---

## 7. Pendientes

| # | Pregunta | Para | ¿Bloquea? | Mientras tanto |
|---|---|---|---|---|
| Q-01 | Objetivos general y específicos del Capítulo I, para verificar que la IA propuesta los cumple | Raymond | No, pero es urgente | Se asume D-06 |
| Q-02 | **Cuenta y clave de API del modelo de lenguaje** para los informes redactados (quién la aporta y quién la paga) | Rolando / Raymond | **Sí, para F-007 el sábado 19/09** | Se desarrolla con la clave de la asesoría |
| Q-03 | Despliegue: ¿dónde lo va a correr Raymond para estudiar y para la defensa? | Rolando | — | ✅ **Resuelta el 16/09 → D-17**: local, con PostgreSQL en Docker |
| Q-04 | Confirmar S-01 (qué es un representante) y S-02 (vale manual o automático; si el talonario reinicia su numeración cada año) | Raymond | — | ✅ **Resuelta el 16/09 → D-18 y D-19**: representante = responsable de un servicio; vale manual que no se repite |
| Q-05 | Catálogo real de productos, categorías y unidades, si existe | Raymond | — | ✅ **Resuelta el 16/09 → D-20**: catálogo simulado verosímil de 25 productos |
| Q-06 | Actualizar el Capítulo II del Word con los cambios de este documento (IA definida, un rol, baja lógica, anulación, kardex). **F-009 suma:** requerimientos 6 y 9, un centro de salud tiene un solo representante activo y el representante ya no tiene servicio; el representante se muestra con su centro en pedidos, distribuciones, reportes e informes; nuevo requerimiento de respaldo de la base (generar y descargar; restaurar con la guía); ver y ocultar la contraseña al escribirla (requerimientos 1 y 13) | Raymond | No | Se entrega la lista de cambios junto con el sistema |
| Q-07 | **Nombres de los centros de salud reales** que atiende el almacén, y cuántos son, para regenerar la demostración (F-009) | Raymond | **Sí, para regenerar la demo**; no para especificar ni planificar | Se planifica con 5 centros, uno por cada representante actual |
