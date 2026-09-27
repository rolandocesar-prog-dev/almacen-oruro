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
12. Levantar el sistema con `CONTENEDOR_BASE_DATOS` apuntando a un contenedor que no existe y pulsar:
    mensaje de base detenida, sin descarga. (Detener la base no sirve para esta prueba: sin base, el sistema
    entero deja de responder antes de llegar al respaldo; ver `docs/decisiones.md`, I-70.)
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

Recorrido del 26/09/2026 (T041), con el build de producción sobre una **copia aislada** de la base de
demostración y un usuario de revisión; la base de desarrollo no se tocó. El navegador **no descargó**
archivos: la descarga del respaldo se interceptó en la página para medir nombre, tamaño y contenido.

| Paso | Resultado |
|---|---|
| 1 | Ficha del centro: representante activo con enlace y "Representantes anteriores: Ninguno" ✅ |
| 2 | Formulario de representante sin centros libres: aviso y ningún centro para elegir ✅ |
| 3 | Desactivar a una representante con 12 pedidos por atender: la confirmación avisa los 12 ✅ |
| 4 | Registrar a la persona nueva: el formulario ofrece solo ese centro, preseleccionado ✅; la ficha del centro muestra a la nueva como activa y a la anterior en la lista ✅ |
| 5 | Reactivar a la anterior: rechazo que nombra a la persona activa ✅. Desactivar el centro: rechazo que nombra a su representante (FR-027) ✅ |
| 6 | Distribuir un pedido de la representante inactiva: se registra; el detalle muestra el centro una sola vez, el vale lo lleva en el encabezado y el kardex dice "Vale N · Apellido, Nombre · Centro" ✅ |
| 7 | Pronóstico: 25 productos y 838 unidades sugeridas, **idéntico a antes de F-009**; evaluación sobre 25 productos, Holt-Winters mejor (SC-006, con nombres provisorios) ✅ |
| 8 | Informe guardado con el formato anterior: tabla "por representante" con columna "Servicio" ✅ |
| 9–10 | 24 pantallas e impresos responden 200 y ninguna muestra "Servicio"; selectores y encabezados de reportes con el centro (SC-002) ✅ |
| 11 | Respaldo: "Generando…" y botón deshabilitado mientras corre; 361 ms, 536 KB, 19 tablas, nombre con fecha y hora de Oruro (SC-003) ✅ |
| 12 | Contenedor mal configurado: mensaje en español, ningún archivo; el detalle técnico queda en el registro del servidor ✅ |
| 13 | Restauración con los comandos de la guía en PowerShell sobre una base vacía: mismos conteos en todas las tablas, kardex cuadrado, marca de demostración, índice RN-18, tildes y secuencias; ingreso con la misma contraseña (SC-004) ✅ |
| 14–16 | Ocho botones "Mostrar" con nombres distintos; cada campo por separado; se ocultan al enviar con error; Tab y Enter funcionan; el ingreso funciona con la contraseña visible (SC-005) ✅ |
| 375 px | Sin desplazamiento horizontal en respaldo, ficha del centro, representantes, pedidos y cambiar contraseña; el botón "Mostrar" cabe en el espacio del campo (T039) ✅ |

**Queda pendiente:** regenerar la demostración con los nombres reales de los centros (T021, Q-07). No se
pudo comprobar el botón nativo de Edge (`::-ms-reveal`) porque el navegador de pruebas es Chromium.
