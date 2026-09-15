import Link from "next/link";
import { notFound } from "next/navigation";
import { formatearFecha } from "@/lib/fechas";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerDistribucion } from "@/servicios/distribuciones";
import { BotonImprimir } from "@/componentes/ui/boton-imprimir";

export const metadata = { title: "Vale de distribución · Almacén Regional Oruro" };

/**
 * Vale de distribución para imprimir y firmar (Historia 5, FR-016). Los controles de pantalla llevan
 * `print:hidden`: la hoja impresa no tiene menús ni botones (precisión de la especificación).
 */
export default async function PaginaValeDistribucion({ params }: { params: Promise<{ id: string }> }) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const distribucion = id ? await obtenerDistribucion(id) : null;
  if (!distribucion) notFound();

  const { representante, pedido } = distribucion;
  const anulada = distribucion.estado === "ANULADA";

  return (
    <article className="flex flex-col gap-6 text-texto">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/distribuciones/${distribucion.id}`} className="text-sm text-marca underline">
          ← Volver a la distribución
        </Link>
        <BotonImprimir />
      </div>

      <header className="flex flex-col gap-1 border-b-2 border-texto pb-3">
        {/* El centro de salud es el del representante del pedido (spec, Supuestos). */}
        <p className="text-sm font-semibold uppercase tracking-wide">{representante.centroSalud}</p>
        <h1 className="text-2xl font-bold">Vale de distribución Nº {distribucion.nroVale}</h1>
        <p className="text-sm">
          Fecha: {formatearFecha(distribucion.fecha)} · Pedido Nº {pedido.id}
        </p>
      </header>

      {/* Historia 5 · E2: una distribución anulada lo dice de forma visible, también en blanco y negro. */}
      {anulada && (
        <p className="self-start rounded border-4 border-error px-4 py-2 text-3xl font-black tracking-widest text-error" role="status">
          ANULADA
        </p>
      )}

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold">Representante</dt>
          <dd>
            {representante.nombre} {representante.apellido}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Servicio</dt>
          <dd>{representante.servicio}</dd>
        </div>
      </dl>

      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-texto">
            <th scope="col" className="py-2 pr-3">
              Código
            </th>
            <th scope="col" className="py-2 pr-3">
              Producto
            </th>
            <th scope="col" className="py-2 pr-3">
              Unidad
            </th>
            <th scope="col" className="py-2 text-right">
              Cantidad
            </th>
          </tr>
        </thead>
        <tbody>
          {distribucion.lineas.map((linea) => (
            <tr key={linea.id} className="border-b border-borde">
              <td className="py-2 pr-3">{linea.codigo}</td>
              <td className="py-2 pr-3">{linea.nombre}</td>
              <td className="py-2 pr-3">{linea.unidad}</td>
              <td className="py-2 text-right tabular-nums">{linea.cantidad}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-sm">
        <span className="font-semibold">Observación:</span> {distribucion.observacion ?? "—"}
      </p>

      <div className="mt-12 grid grid-cols-2 gap-10 text-center text-sm">
        <div className="border-t border-texto pt-2">Entregado por</div>
        <div className="border-t border-texto pt-2">Recibido por</div>
      </div>
    </article>
  );
}
