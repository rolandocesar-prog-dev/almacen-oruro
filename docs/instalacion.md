# Guía de instalación · Sistema de almacén Regional Oruro

Esta guía explica cómo poner en marcha el sistema en una computadora con Windows, sin conocimientos de
programación. Se completa a medida que se agregan funcionalidades (versión F-001, 14/09/2026).

---

## 1. Qué hay que instalar antes (una sola vez)

| Programa | Para qué sirve | Dónde conseguirlo |
|---|---|---|
| **Node.js 22 LTS** | Ejecuta el sistema | https://nodejs.org (elegir la versión 22 "LTS") |
| **Docker Desktop** | Ejecuta la base de datos PostgreSQL | https://www.docker.com/products/docker-desktop |
| **Git** | Descarga el código del proyecto | https://git-scm.com |
| **Google Chrome o Microsoft Edge** | Para usar el sistema | Ya suelen venir instalados |

Para comprobar que quedaron instalados, abrir **PowerShell** y escribir:

```bash
node -v
```

Debe mostrar algo como `v22.23.2`.

```bash
docker info
```

Debe mostrar información sin la palabra `error`. Si dice que no puede conectarse, **abrir Docker
Desktop** desde el menú Inicio y esperar a que diga que está en funcionamiento.

---

## 2. Preparar el sistema (una sola vez)

Todos los comandos se escriben en PowerShell, dentro de la carpeta del proyecto `almacen-oruro`.

**1. Instalar las dependencias** (tarda unos minutos la primera vez):

```bash
npm install
```

**2. Crear el archivo de configuración** copiando el de ejemplo:

```bash
copy .env.example .env
```

Abrir `.env` con el Bloc de notas y cambiar la línea `CONTRASENA_INICIAL` por una contraseña de al menos
8 caracteres. Es la que usará el usuario `admin` la primera vez.

**3. Levantar la base de datos** (con Docker Desktop abierto):

```bash
docker compose up -d
```

**4. Crear las tablas**:

```bash
npx prisma migrate deploy
```

**5. Cargar el usuario inicial**:

```bash
npx prisma db seed
```

Debe decir `✓ Usuario 'admin' creado`.

**6. (Solo para la demostración) Cargar el histórico simulado.** El almacén no tiene años de datos
digitalizados y el pronóstico necesita historia. Este comando crea el catálogo y **36 meses** de compras,
pedidos y distribuciones usando las mismas reglas que el sistema, y deja la base marcada como de
demostración:

```bash
npm run datos:simulados -- --semilla 20260915
```

- Tarda **unos 10 segundos** y muestra el avance mes a mes. Termina con `✓ Histórico simulado generado`.
- Con la misma semilla, los datos son siempre los mismos.
- **Solo funciona sobre una base sin compras, pedidos ni distribuciones**; si ya hay documentos, se niega y
  no cambia nada. No se ofrece en ninguna pantalla, a propósito.
- Mientras la base tenga estos datos, todas las pantallas y hojas impresas dicen "Datos simulados con
  fines de demostración".
- Para volver a generarlo, se recrea la base: `docker compose down -v`, `docker compose up -d`,
  `npx prisma migrate deploy`, `npx prisma db seed` y otra vez este comando. **Eso borra todos los datos.**

**7. (Opcional) Clave para los informes IA.** Para **generar** informes redactados por el modelo de
lenguaje, poner en `.env` la línea `ANTHROPIC_API_KEY="…"` con la clave de la cuenta de Anthropic. Sin
clave, todo lo demás funciona igual —incluidos el pronóstico, la evaluación y la consulta e impresión de
informes ya guardados— y "Generar informe" avisa que el servicio de redacción no está disponible.

---

## 3. Usar el sistema

**1. Iniciar el sistema**:

```bash
npm run build
```

```bash
npm start
```

**2. Abrir el navegador** en `http://localhost:3000`.

**3. Primer ingreso:** usuario `admin` y la contraseña que se puso en `CONTRASENA_INICIAL`. El sistema
pedirá definir una contraseña nueva antes de continuar: en "Contraseña actual" se escribe la inicial.

**4. Registrar al personal** desde el menú **Personal → Registrar personal**. Cada persona podrá ingresar
con el usuario y la contraseña que se le asignen.

**5. Cargar los catálogos** desde la fila **Catálogos** del menú, en este orden, porque cada uno usa
los anteriores:

1. **Categorías** (por ejemplo, Desinfectantes) y **Unidades** (por ejemplo, Bidón 5 L).
2. **Productos**, eligiendo su categoría y unidad. Empiezan con stock 0: el stock solo cambia con
   compras y distribuciones.
3. **Proveedores** y, en la ficha de cada uno, los productos que ofrece con su precio referencial.
4. **Centros de salud** y después **Representantes**.

Nada se borra: un registro que ya no se usa se **desactiva** desde su ficha y se puede reactivar.

**6. Registrar compras y consultar el inventario**

- **Compras → Registrar compra**, con la factura en mano: proveedor, Nº de factura, fecha y una línea
  por producto con cantidad y precio. El sistema calcula los subtotales y el total, y al guardar sube
  el stock de cada producto. Si la factura ya está registrada para ese proveedor, lo avisa al salir
  del campo.
- Una compra **no se edita**. Si tiene un error, desde su detalle se **anula** indicando el motivo: el
  stock se revierte y la factura queda libre para registrarla bien. No se puede anular si ese stock
  ya se entregó.
- **Existencias** muestra el stock de cada producto con los que están bajo el mínimo arriba. Desde
  cada producto se abre su **kardex**, con todos los movimientos que explican su stock.
- **Existencias → Verificar consistencia** comprueba que el stock de cada producto sea igual a la
  suma de sus movimientos.

**7. Registrar pedidos**

- **Pedidos → Registrar pedido**: representante, fecha y una línea por producto con la cantidad que
  pide. Junto a cada producto se ve su stock actual como información: se puede pedir más de lo que
  hay. **Registrar un pedido no mueve el stock**; el stock sale al distribuir.
- El estado lo calcula el sistema según lo entregado: **Pendiente** (nada entregado), **Parcial**
  (algo entregado) o **Atendido** (todo entregado). **Pedidos** muestra por defecto los que tienen
  algo por entregar, del más antiguo al más reciente, con el porcentaje atendido.
- Un pedido se **edita solo mientras está pendiente**: se cambian representante, fecha, observación y
  productos, y conserva su número.
- Si ya no se necesita, desde su detalle se **anula** indicando el motivo, mientras esté pendiente o
  parcial. Lo que ya se entregó se conserva y lo que faltaba queda como saldo anulado.
- Desde la ficha de un representante, **Ver sus pedidos** abre todos sus pedidos.

**8. Registrar distribuciones**

- **Distribuciones → Registrar distribución** muestra los pedidos pendientes y parciales; se elige uno
  (o se entra desde **Distribuir** en la ficha del pedido).
- Por cada producto se ve lo pedido, lo entregado, lo pendiente, el stock y el **máximo que se puede
  entregar**. Las líneas completas o sin stock no admiten cantidad. Se escribe el **Nº de vale** del
  talonario (el sistema avisa si ya está registrado), la fecha y la cantidad que se entrega; no hace
  falta entregar todo de una vez.
- Al guardar, el **stock baja** y el kardex registra la salida; el pedido suma lo entregado y cambia a
  parcial o atendido.
- Una distribución **no se edita**. Si tiene un error, desde su detalle se **anula** con motivo: el stock
  se repone, lo entregado del pedido se descuenta y el vale queda libre para registrarla bien.
- **Imprimir vale** abre una hoja limpia con los productos y espacios para las firmas de quien entrega y
  quien recibe.

**9. Consultar e imprimir reportes**

- **Reportes** reúne cinco: compras, distribuciones, existencias, kardex de un producto y pedidos.
- Los que llevan fechas empiezan con el **mes en curso**, del día 1 a hoy, y filtran por la fecha del
  documento. Cada reporte tiene además sus propios filtros (proveedor, representante, producto,
  categoría, estado).
- Los documentos anulados **no aparecen** salvo que se marque "Incluir anulados", y **nunca suman** en los
  totales: el total de compras, las cantidades entregadas y el conteo de pedidos cuentan solo lo vigente.
- **Imprimir** abre la hoja con el nombre del sistema, el nombre del reporte, los filtros aplicados, la
  fecha y hora de emisión y quién lo emite; los botones no salen impresos. Desde el navegador también se
  puede guardar como PDF.
- Si la base tiene datos simulados (los carga el generador del módulo de inteligencia artificial), todas
  las pantallas y las hojas impresas muestran "Datos simulados con fines de demostración".

**10. Pronóstico, reposición e informes IA**

- **IA → Pronóstico y reposición** muestra, para cada producto activo, cuánto se espera consumir **este
  mes**, el stock, el mínimo y la **reposición sugerida**, con la fórmula a la vista:
  `máx(0, ⌈pronóstico + stock mínimo − stock actual⌉)`. Se filtra por categoría y por "Solo con reposición
  mayor que 0". Con 24 meses de historia o más se usa Holt-Winters; con menos, un promedio. Se calcula en
  el momento, **sin internet**, y no se guarda nada.
- **Ver gráfico** abre el consumo mensual del producto, el pronóstico del mes y, si tiene al menos 30
  meses, los pronósticos de los 6 meses reservados para validar; debajo, la tabla con los mismos números.
- **IA → Evaluación del pronóstico** compara el método del sistema con dos métodos simples (ingenuo
  estacional y promedio móvil) sobre los últimos 6 meses, con MAE y WAPE por producto y en general. En los
  dos, **menos es mejor**.
- **IA → Informes IA → Generar informe**: tipo (compras o distribuciones) y período (por defecto, el mes
  anterior). El sistema calcula los datos y el modelo **solo redacta** el resumen, los hallazgos, las alertas
  y las recomendaciones. **Necesita internet y la clave del paso 7**; puede tardar hasta un minuto. Si falla,
  no se guarda nada y el mensaje dice por qué.
- Cada informe guarda el texto **junto a la tabla de datos** con que se redactó, el modelo, la fecha y quién
  lo generó. Si una cifra del texto no está en la tabla, se marca con "Cifra no encontrada en los datos".
  Los informes no se editan ni se borran; generar otro crea uno nuevo.
- Los informes guardados se consultan e **imprimen sin internet**.
- El procedimiento de cálculo, paso a paso, está en [`metodo-pronostico.md`](metodo-pronostico.md).

Para detener el sistema, presionar `Ctrl + C` en la ventana de PowerShell. La base de datos sigue
guardada: la próxima vez basta con abrir Docker Desktop, ejecutar `docker compose up -d` y `npm start`.

---

## 4. Problemas frecuentes

| Qué pasa | Qué hacer |
|---|---|
| `npm install` muestra `Cannot read properties of null (reading 'edgesOut')` | Verificar que existe el archivo `.npmrc` en la carpeta del proyecto (viene incluido) |
| `Can't reach database server at localhost:5432` | Abrir Docker Desktop, esperar a que arranque y ejecutar `docker compose up -d` |
| `Define CONTRASENA_INICIAL en .env con al menos 8 caracteres` | Revisar el paso 2 de la sección 2 |
| Nadie recuerda la contraseña de `admin` | Otro usuario activo puede restablecerla desde **Personal → ficha de admin → Restablecer contraseña** |
| "Tu sesión expiró. Ingresa nuevamente" | Es normal: la sesión dura 8 horas desde el ingreso |
| `El generador solo se ejecuta sobre una base sin compras, pedidos ni distribuciones` | La base ya tiene documentos: para regenerar el histórico, recrearla como dice el paso 6 de la sección 2 |
| "No se pudo generar el informe: sin conexión con el servicio de redacción" | Revisar la conexión a internet y la línea `ANTHROPIC_API_KEY` de `.env` (paso 7 de la sección 2); los informes ya guardados se siguen consultando |

---

## 5. Para el desarrollo (opcional)

| Comando | Qué hace |
|---|---|
| `npm run dev` | Inicia el sistema en modo desarrollo, que se recarga con cada cambio |
| `npm test` | Ejecuta las pruebas automatizadas (necesita Docker Desktop abierto) |
| `npm run lint` y `npm run typecheck` | Revisan el código |
| `npx prisma studio` | Abre una pantalla para ver las tablas de la base de datos |
