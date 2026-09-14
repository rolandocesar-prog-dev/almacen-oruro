import Link from "next/link";
import { notFound } from "next/navigation";
import { CambioDeEstado } from "@/componentes/catalogos/cambio-de-estado";
import { EnlaceEditar } from "@/componentes/catalogos/encabezado-listado";
import { InsigniaActivo, InsigniaEstado } from "@/componentes/catalogos/insignia-estado";
import { Aviso } from "@/componentes/ui/aviso";
import { Dato } from "@/componentes/ui/dato";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { formatearBolivianos } from "@/lib/dinero";
import { esquemaAvisoFicha } from "@/esquemas/comunes";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerProducto } from "@/servicios/catalogos/productos";
import { desactivarProductoAccion, reactivarProductoAccion } from "../acciones";

export const metadata = { title: "Ficha de producto · Almacén Regional Oruro" };

const avisos = {
  registrado: "Producto registrado con stock 0.",
  modificado: "Datos actualizados.",
} as const;

export default async function PaginaFichaProducto({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const { aviso } = esquemaAvisoFicha.parse(await searchParams);
  const producto = id ? await obtenerProducto(id) : null;
  if (!producto) notFound();

  // Desactivar con stock está permitido, pero se advierte al confirmar (research C-09).
  const { stockActual } = producto;
  const confirmacion =
    stockActual > 0
      ? `Este producto tiene ${stockActual} ${stockActual === 1 ? "unidad" : "unidades"} en stock. ¿Desactivarlo?`
      : `¿Desactivar el producto '${producto.nombre}'?`;

  return (
    <section className="flex flex-col gap-4">
      <Link href="/productos" className="text-sm text-marca underline">
        ← Volver al listado
      </Link>
      {aviso && <Aviso tipo="exito">{avisos[aviso]}</Aviso>}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">
          {producto.codigo} · {producto.nombre}
        </h1>
        <InsigniaActivo activo={producto.activo} />
        {producto.bajoMinimo && <InsigniaEstado variante="bajoMinimo" />}
      </div>

      <dl className="grid gap-4 rounded-lg border border-borde bg-white p-6 sm:grid-cols-2">
        <Dato etiqueta="Categoría" valor={producto.categoria.activo ? producto.categoria.nombre : `${producto.categoria.nombre} (inactiva)`} />
        <Dato
          etiqueta="Unidad de medida"
          valor={`${producto.unidadMedida.nombre} (${producto.unidadMedida.abreviatura})${producto.unidadMedida.activo ? "" : " (inactiva)"}`}
        />
        <Dato etiqueta="Stock actual" valor={producto.stockActual} />
        <Dato etiqueta="Stock mínimo" valor={producto.stockMinimo} />
        <Dato etiqueta="Descripción" valor={producto.descripcion} />
      </dl>

      <div className="flex flex-wrap items-start gap-3">
        <EnlaceEditar ruta={`/productos/${producto.id}/editar`} />
        <CambioDeEstado
          activo={producto.activo}
          confirmacionDesactivar={confirmacion}
          desactivar={desactivarProductoAccion.bind(null, producto.id)}
          reactivar={reactivarProductoAccion.bind(null, producto.id)}
        />
      </div>

      {/* FR-026: proveedores activos que ofrecen el producto, con su precio referencial. */}
      <h2 className="mt-4 text-lg font-semibold">Proveedores que lo ofrecen</h2>
      <Tabla
        encabezados={["Razón social", "NIT", "Precio referencial"]}
        vacio={producto.proveedores.length === 0 ? "Ningún proveedor activo tiene registrado este producto" : undefined}
      >
        {producto.proveedores.map((proveedor) => (
          <tr key={proveedor.asociacionId}>
            <Celda>
              <Link href={`/proveedores/${proveedor.proveedorId}`} className="text-marca underline">
                {proveedor.razonSocial}
              </Link>
            </Celda>
            <Celda>{proveedor.nit}</Celda>
            <Celda className="text-right">{formatearBolivianos(proveedor.precioReferencial)}</Celda>
          </tr>
        ))}
      </Tabla>
    </section>
  );
}
