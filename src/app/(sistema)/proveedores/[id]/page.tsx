import Link from "next/link";
import { notFound } from "next/navigation";
import { CambioDeEstado } from "@/componentes/catalogos/cambio-de-estado";
import { EnlaceEditar } from "@/componentes/catalogos/encabezado-listado";
import { InsigniaActivo } from "@/componentes/catalogos/insignia-estado";
import { Aviso } from "@/componentes/ui/aviso";
import { Dato } from "@/componentes/ui/dato";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaFiltroAsociaciones } from "@/esquemas/catalogos/proveedor-producto";
import { esquemaAvisoFicha } from "@/esquemas/comunes";
import { formatearBolivianos } from "@/lib/dinero";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { listarProductosParaSelector } from "@/servicios/catalogos/productos";
import { obtenerProveedor } from "@/servicios/catalogos/proveedores";
import { desactivarProveedorAccion, reactivarProveedorAccion } from "../acciones";
import { AccionesAsociacion } from "./acciones-asociacion";
import {
  asociarProductoAccion,
  cambiarPrecioReferencialAccion,
  desactivarAsociacionAccion,
  reactivarAsociacionAccion,
} from "./acciones-productos";
import { AsociarProducto } from "./asociar-producto";
import { FiltroAsociaciones } from "./filtro-asociaciones";

export const metadata = { title: "Ficha de proveedor · Almacén Regional Oruro" };

const avisos = {
  registrado: "Proveedor registrado.",
  modificado: "Datos actualizados.",
} as const;

export default async function PaginaFichaProveedor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const parametros = await searchParams;
  // Mismo esquema que el filtro de la sección; un valor inválido muestra las asociaciones activas.
  const filtro = esquemaFiltroAsociaciones.parse(parametros);
  const proveedor = id ? await obtenerProveedor(id, filtro) : null;
  if (!proveedor) notFound();

  const { aviso: tipoAviso } = esquemaAvisoFicha.parse(parametros);
  const aviso = tipoAviso ? avisos[tipoAviso] : undefined;
  const productosParaAgregar = proveedor.activo && filtro.asociaciones === "activas" ? await listarProductosParaSelector() : [];

  return (
    <section className="flex flex-col gap-4">
      <Link href="/proveedores" className="text-sm text-marca underline">
        ← Volver al listado
      </Link>
      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{proveedor.razonSocial}</h1>
        <InsigniaActivo activo={proveedor.activo} />
      </div>

      <dl className="grid gap-4 rounded-lg border border-borde bg-white p-6 sm:grid-cols-2">
        <Dato etiqueta="NIT" valor={proveedor.nit} />
        <Dato etiqueta="Nombre de contacto" valor={proveedor.contactoNombre} />
        <Dato etiqueta="Teléfono" valor={proveedor.telefono} />
        <Dato etiqueta="Correo" valor={proveedor.correo} />
        <Dato etiqueta="Dirección" valor={proveedor.direccion} />
      </dl>

      <div className="flex flex-wrap items-start gap-3">
        <EnlaceEditar ruta={`/proveedores/${proveedor.id}/editar`} />
        <CambioDeEstado
          activo={proveedor.activo}
          confirmacionDesactivar={`¿Desactivar el proveedor '${proveedor.razonSocial}'? Sus compras anteriores lo seguirán mostrando.`}
          desactivar={desactivarProveedorAccion.bind(null, proveedor.id)}
          reactivar={reactivarProveedorAccion.bind(null, proveedor.id)}
        />
      </div>

      {/* Historia 6: qué productos ofrece, con precio referencial solo orientativo. */}
      <h2 className="mt-4 text-lg font-semibold">Productos que ofrece</h2>
      <FiltroAsociaciones proveedorId={proveedor.id} valores={filtro} />
      {!proveedor.activo && <Aviso tipo="informacion">El proveedor está inactivo: reactívalo para agregarle productos.</Aviso>}
      {productosParaAgregar.length > 0 && (
        <AsociarProducto accion={asociarProductoAccion.bind(null, proveedor.id)} productos={productosParaAgregar} />
      )}
      <Tabla
        encabezados={["Código", "Producto", "Precio referencial", "Estado", "Acciones"]}
        vacio={
          proveedor.productos.length === 0
            ? filtro.asociaciones === "activas"
              ? "Todavía no hay productos en la lista de este proveedor"
              : "No hay productos quitados de la lista"
            : undefined
        }
      >
        {proveedor.productos.map((asociacion) => (
          <tr key={asociacion.asociacionId}>
            <Celda>{asociacion.codigo}</Celda>
            <Celda>
              <Link href={`/productos/${asociacion.productoId}`} className="text-marca underline">
                {asociacion.nombre}
              </Link>
              {!asociacion.productoActivo && " (producto inactivo)"}
            </Celda>
            <Celda className="text-right">{formatearBolivianos(asociacion.precioReferencial)}</Celda>
            <Celda>
              <InsigniaActivo activo={asociacion.activo} />
            </Celda>
            <Celda>
              <AccionesAsociacion
                asociacionId={asociacion.asociacionId}
                activo={asociacion.activo}
                precioActual={asociacion.precioReferencial?.replace(".", ",") ?? ""}
                cambiarPrecio={cambiarPrecioReferencialAccion.bind(null, asociacion.asociacionId)}
                desactivar={desactivarAsociacionAccion.bind(null, asociacion.asociacionId)}
                reactivar={reactivarAsociacionAccion.bind(null, asociacion.asociacionId)}
              />
            </Celda>
          </tr>
        ))}
      </Tabla>
    </section>
  );
}
