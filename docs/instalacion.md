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

---

## 5. Para el desarrollo (opcional)

| Comando | Qué hace |
|---|---|
| `npm run dev` | Inicia el sistema en modo desarrollo, que se recarga con cada cambio |
| `npm test` | Ejecuta las pruebas automatizadas (necesita Docker Desktop abierto) |
| `npm run lint` y `npm run typecheck` | Revisan el código |
| `npx prisma studio` | Abre una pantalla para ver las tablas de la base de datos |
