import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/componentes/ui/aviso";
import { Dato } from "@/componentes/ui/dato";
import { InsigniaDocumento } from "@/componentes/ui/insignia-documento";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaAvisoDistribucion } from "@/esquemas/distribuciones";
import { formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerDistribucion } from "@/servicios/distribuciones";
import { InsigniaPedido } from "../../pedidos/insignia-pedido";

export const metadata = { title: "Detalle de distribución · Almacén Regional Oruro" };

export default async function PaginaDetalleDistribucion({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const { aviso } = esquemaAvisoDistribucion.parse(await searchParams);
  const distribucion = id ? await obtenerDistribucion(id) : null;
  if (!distribucion) notFound();

  const { representante, pedido } = distribucion;

  return (
    <section className="flex flex-col gap-4">
      <Link href="/distribuciones" className="text-sm text-marca underline">
        ← Volver a distribuciones
      </Link>
      {aviso === "registrada" && <Aviso tipo="exito">Distribución registrada. El stock bajó y lo entregado del pedido se actualizó.</Aviso>}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Vale {distribucion.nroVale}</h1>
        <InsigniaDocumento estado={distribucion.estado} />
      </div>

      <dl className="grid gap-4 rounded-lg border border-borde bg-white p-6 sm:grid-cols-2">
        <Dato etiqueta="Fecha de la distribución" valor={formatearFecha(distribucion.fecha)} />
        <Dato
          etiqueta="Pedido"
          valor={
            <span className="inline-flex flex-wrap items-center gap-2">
              <Link href={`/pedidos/${pedido.id}`} className="text-marca underline">
                Nº {pedido.id}
              </Link>
              <InsigniaPedido estado={pedido.estado} />
            </span>
          }
        />
        {/* El representante sale del pedido: la distribución no lo guarda aparte (X-08). */}
        <Dato
          etiqueta="Representante"
          valor={
            <>
              <Link href={`/representantes/${representante.id}`} className="text-marca underline">
                {representante.apellido}, {representante.nombre}
              </Link>
              {representante.activo ? "" : " (inactivo)"} · {representante.servicio}
            </>
          }
        />
        <Dato etiqueta="Centro de salud" valor={representante.centroSalud} />
        <Dato etiqueta="Observación" valor={distribucion.observacion} />
        <Dato etiqueta="Registrada por" valor={`${distribucion.registradaPor} · ${formatearFechaHora(distribucion.registradaEn)}`} />
        {distribucion.estado === "ANULADA" && (
          <>
            <Dato etiqueta="Motivo de la anulación" valor={distribucion.motivoAnulacion} />
            <Dato
              etiqueta="Anulada por"
              valor={`${distribucion.anuladaPor ?? ""} · ${distribucion.anuladaEn ? formatearFechaHora(distribucion.anuladaEn) : ""}`}
            />
          </>
        )}
      </dl>

      {/* Historia 3 · E4: solo imprimir el vale y, si está vigente, anularla. */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/distribuciones/${distribucion.id}/vale`}
          className="rounded-md border border-marca bg-white px-4 py-2 text-sm font-medium text-marca hover:bg-fondo"
        >
          Imprimir vale
        </Link>
      </div>

      {/* Una distribución no tiene "Editar" ni "Borrar": solo se anula (D-16, FR-012). */}
      <Tabla encabezados={["Código", "Producto", "Unidad", "Cantidad"]}>
        {distribucion.lineas.map((linea) => (
          <tr key={linea.id}>
            <Celda>{linea.codigo}</Celda>
            <Celda>
              <Link href={`/productos/${linea.productoId}`} className="text-marca underline">
                {linea.nombre}
              </Link>
              {linea.productoActivo ? "" : " (inactivo)"}
            </Celda>
            <Celda>{linea.unidad}</Celda>
            <Celda className="text-right tabular-nums">{linea.cantidad}</Celda>
          </tr>
        ))}
      </Tabla>
    </section>
  );
}
