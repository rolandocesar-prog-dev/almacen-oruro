// Proveedores (F-002, Historia 3). Nunca se borran: se desactivan (FR-002, principio V).
import { condicionDeEstado, type FiltroCatalogo } from "@/esquemas/comunes";
import type { DatosProveedor } from "@/esquemas/catalogos/proveedor";
import { ErrorDeNegocio } from "@/lib/errores";
import { esErrorDeDuplicado, prisma } from "@/lib/prisma";
import { coincideBusqueda, compararEnEspanol, recortarEspacios } from "@/lib/texto";
import { errorDuplicado } from "./comun";

/** Verifica que ningún OTRO proveedor, activo o inactivo, tenga el mismo NIT (RN-11). */
async function verificarNitLibre(nit: string, exceptoId?: number) {
  const existente = await prisma.proveedor.findUnique({ where: { nit }, select: { id: true, nit: true, activo: true } });
  if (existente && existente.id !== exceptoId) {
    throw errorDuplicado({
      articulo: "un",
      catalogo: "proveedor",
      inactivo: !existente.activo,
      campo: "NIT",
      valor: existente.nit,
      ruta: `/proveedores/${existente.id}`,
      campoFormulario: "nit",
    });
  }
}

/** Guardado simultáneo del mismo NIT: la base decide y se da el mismo mensaje (research C-05). */
async function traducirDuplicado(error: unknown, nit: string): Promise<never> {
  if (esErrorDeDuplicado(error)) await verificarNitLibre(nit);
  throw error;
}

function prepararDatos(datos: DatosProveedor) {
  return {
    razonSocial: recortarEspacios(datos.razonSocial),
    nit: datos.nit,
    contactoNombre: datos.contactoNombre ? recortarEspacios(datos.contactoNombre) : null,
    telefono: datos.telefono ?? null,
    correo: datos.correo ?? null,
    direccion: datos.direccion ? recortarEspacios(datos.direccion) : null,
  };
}

async function obtenerExistente(id: number) {
  const proveedor = await prisma.proveedor.findUnique({ where: { id }, select: { id: true, activo: true } });
  if (!proveedor) throw new ErrorDeNegocio("No existe el proveedor indicado");
  return proveedor;
}

/** Registra un proveedor activo (FR-008). La razón social puede repetirse; el NIT no (FR-019). */
export async function registrarProveedor(datos: DatosProveedor): Promise<{ id: number }> {
  await verificarNitLibre(datos.nit);
  try {
    return await prisma.proveedor.create({ data: prepararDatos(datos), select: { id: true } });
  } catch (error) {
    return traducirDuplicado(error, datos.nit);
  }
}

/** Modifica los datos del proveedor. Las compras anteriores muestran el valor vigente (FR-027). */
export async function modificarProveedor(id: number, datos: DatosProveedor): Promise<void> {
  await obtenerExistente(id);
  await verificarNitLibre(datos.nit, id);
  try {
    await prisma.proveedor.update({ where: { id }, data: prepararDatos(datos) });
  } catch (error) {
    await traducirDuplicado(error, datos.nit);
  }
}

/**
 * Desactiva un proveedor. No tiene condiciones (RN-13): sus compras siguen en el histórico y solo
 * deja de ofrecerse para compras nuevas.
 */
export async function desactivarProveedor(id: number): Promise<void> {
  const proveedor = await obtenerExistente(id);
  if (!proveedor.activo) throw new ErrorDeNegocio("El proveedor ya está inactivo");
  await prisma.proveedor.update({ where: { id }, data: { activo: false } });
}

/** Reactiva un proveedor. No depende de otro catálogo (RN-17). */
export async function reactivarProveedor(id: number): Promise<void> {
  const proveedor = await obtenerExistente(id);
  if (proveedor.activo) throw new ErrorDeNegocio("El proveedor ya está activo");
  await prisma.proveedor.update({ where: { id }, data: { activo: true } });
}

/**
 * Ficha del proveedor con los productos que ofrece (Historia 6). `asociaciones` elige si se ven las
 * asociaciones activas o las inactivas; así una asociación desactivada se puede reactivar.
 */
export async function obtenerProveedor(id: number, { asociaciones = "activas" }: { asociaciones?: "activas" | "inactivas" } = {}) {
  const proveedor = await prisma.proveedor.findUnique({
    where: { id },
    include: {
      productos: {
        where: { activo: asociaciones === "activas" },
        select: {
          id: true,
          precioReferencial: true,
          activo: true,
          producto: { select: { id: true, codigo: true, nombre: true, activo: true } },
        },
      },
    },
  });
  if (!proveedor) return null;

  const { productos, ...datos } = proveedor;
  return {
    ...datos,
    productos: productos
      .map((asociacion) => ({
        asociacionId: asociacion.id,
        activo: asociacion.activo,
        precioReferencial: asociacion.precioReferencial?.toFixed(2) ?? null,
        productoId: asociacion.producto.id,
        codigo: asociacion.producto.codigo,
        nombre: asociacion.producto.nombre,
        productoActivo: asociacion.producto.activo,
      }))
      .sort((a, b) => compararEnEspanol(a.nombre, b.nombre)),
  };
}

/**
 * Listado con filtro de estado y búsqueda por razón social, NIT o contacto, en memoria (research C-01).
 * Ordenado por razón social (FR-007).
 */
export async function listarProveedores({ q, estado }: FiltroCatalogo) {
  const proveedores = await prisma.proveedor.findMany({
    where: { activo: condicionDeEstado(estado) },
    select: { id: true, razonSocial: true, nit: true, contactoNombre: true, telefono: true, activo: true },
  });
  return proveedores
    .filter((proveedor) => coincideBusqueda(q, proveedor.razonSocial, proveedor.nit, proveedor.contactoNombre))
    .sort((a, b) => compararEnEspanol(a.razonSocial, b.razonSocial));
}

/**
 * Opciones del selector de proveedores de F-003: "Razón social (NIT)", con el NIT para distinguir
 * razones sociales iguales. Solo activos (RN-14), más el actual marcado si está inactivo (FR-003).
 */
export async function listarProveedoresParaSelector(idActual?: number) {
  const proveedores = await prisma.proveedor.findMany({
    where: { OR: [{ activo: true }, ...(idActual ? [{ id: idActual }] : [])] },
    select: { id: true, razonSocial: true, nit: true, activo: true },
  });
  return proveedores
    .sort((a, b) => compararEnEspanol(a.razonSocial, b.razonSocial))
    .map(({ id, razonSocial, nit, activo }) => {
      const etiqueta = `${razonSocial} (${nit})`;
      return { id, etiqueta: activo ? etiqueta : `${etiqueta} (inactivo)`, activo };
    });
}
