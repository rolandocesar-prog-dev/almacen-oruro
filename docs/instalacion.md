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
