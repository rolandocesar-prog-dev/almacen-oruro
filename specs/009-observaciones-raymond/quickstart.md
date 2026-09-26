# Guía de validación · F-009 Observaciones de Raymond

**Plan**: [plan.md](plan.md) · **Contrato**: [contracts/acciones-f009.md](contracts/acciones-f009.md) ·
**Modelo**: [data-model.md](data-model.md)

## 1. Requisitos previos

- Los de F-001 a F-007 (Node.js 22, Docker Desktop, `.env` completo).
- `.env` con `CONTENEDOR_BASE_DATOS` (o sin ella, para usar `almacen-oruro-postgres`).
- **Base recreada**: la migración de F-009 se niega a correr sobre una base con varios representantes
  activos en un centro (research O-02). Sobre una base de demostración anterior:

```bash
docker compose down -v
```

```bash
docker compose up -d
```

```bash
npx prisma migrate deploy
```

```bash
npx prisma db seed
```

```bash
npm run datos:simulados -- --semilla 20260915
```

> Con nombres provisorios hasta que Raymond responda Q-07. La demostración que se entrega se regenera
> con los nombres reales.

## 2. Pruebas automatizadas

```bash
npm test
```

Deben pasar las 602 pruebas anteriores (ajustadas: sin `servicio`) y las nuevas de research O-14:

| Qué se prueba | Dónde | Resultado esperado |
|---|---|---|
| Registrar un representante en un centro con otro activo | integración, catálogos | rechazo con el nombre del activo |
| Reactivar con otro activo en el centro | integración, catálogos | rechazo con el nombre del activo |
| Cambiar un representante activo a un centro ocupado | integración, catálogos | rechazo con el nombre del activo |
| Dos registros simultáneos en el mismo centro | integración, catálogos | uno aceptado, otro rechazado con el mismo mensaje |
| Desactivar con 2 pedidos por atender y distribuir uno después | integración, catálogos y distribución | desactiva; la distribución se registra a su nombre |
| Selector de centros al registrar y al modificar | integración, catálogos | solo centros activos sin representante activo, más el actual |
| Representante con su centro en pedidos, distribuciones, reportes, kardex e informe IA | integración, cada módulo | `centroSalud` presente; ningún `servicio` |
| Generador reducido | integración, IA | un representante activo por centro; kardex consistente |
| `generarRespaldo` con ejecutor simulado | integración, respaldo | los cuatro mensajes de O-10, sin contenido |
| `generarRespaldo` real sobre la base de pruebas | integración, respaldo (se salta sin contenedor) | archivo con todas las tablas y `_prisma_migrations` |
| `etiquetaRepresentante`, `nombreArchivoRespaldo`, esquema del representante | unitarias | formato y nombre exactos; `servicio` ya no existe |

Además: `npm run typecheck`, `npm run lint` y `npm run build` sin errores.

## 3. Recorrido de validación manual

Con el sistema levantado (`npm run build` y `npm start`) y la demostración regenerada.

### Historia 1 · Un representante activo por centro

1. **Centros** → abrir un centro: se ve su representante activo y "Representantes anteriores" (vacío).
2. **Representantes → Registrar**: el selector de centro no ofrece ningún centro (todos tienen
   representante). Registrar un centro nuevo y volver: aparece solo ese.
3. Desactivar a un representante con pedidos por atender: la confirmación dice cuántos son; al
   confirmar queda inactivo.
4. Registrar a una persona nueva en ese centro: queda activa. La ficha del centro la muestra como
   activa y a la anterior en la lista.
5. Intentar reactivar a la anterior: rechazo con el nombre de la nueva.
6. **Distribuciones → Distribuir** uno de los pedidos de la persona desactivada: se registra, y el vale
   muestra su nombre y su centro.

### Historia 2 · Demostración

7. **IA → Pronóstico** y **Evaluación**: se calculan para los mismos productos que antes (SC-006).
8. **IA → Informes → Nuevo** (con clave) o un informe guardado: la tabla dice "Por centro de salud".

### Historia 3 · Representante con su centro (SC-002)

9. Recorrer y marcar cada lugar de FR-011: selector de pedido nuevo; filtros de pedidos,
   distribuciones y de los dos reportes; listados de pedidos, distribuciones y representantes;
   detalles de pedido y distribución; formulario de distribución; vale impreso; reportes de pedidos y
   distribuciones en pantalla e impresos (incluido el filtro del encabezado); kardex y su reporte;
   informe IA de distribuciones.
10. Buscar "Servicio" en cada uno: no debe aparecer.

### Historia 4 · Respaldo (SC-003, SC-004)

11. **Administración → Respaldo**: se ve la advertencia de datos personales. Pulsar "Generar respaldo":
    el botón dice "Generando…" y en menos de 30 s se descarga
    `respaldo-almacen-oruro-AAAA-MM-DD-HHMM.sql`.
12. Detener el contenedor (`docker compose stop`) y volver a pulsar: mensaje de base detenida, sin
    descarga. Volver a levantarlo.
13. Restaurar el archivo siguiendo la sección nueva de `docs/instalacion.md` **en una copia**
    (otra carpeta del proyecto u otra máquina) y comparar: mismos conteos, kardex cuadrado (pantalla
    **Existencias → Verificación**) e ingreso con la misma contraseña.

### Historia 5 · Contraseña visible

14. En **Ingreso**, **Cambiar mi contraseña**, **Personal → Registrar** y **Personal → ficha →
    Restablecer**: escribir, "Mostrar", "Ocultar"; mostrar un campo no muestra el otro.
15. Enviar con un error de validación: los campos vuelven a quedar ocultos.
16. Recorrer con Tab: el botón recibe el foco y se activa con Enter o Espacio. En Edge, no aparece un
    segundo ojo.

## 4. Estado de la validación

Pendiente: se completa al cerrar la implementación.
