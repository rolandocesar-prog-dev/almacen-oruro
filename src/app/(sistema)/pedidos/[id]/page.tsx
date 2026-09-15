import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/componentes/ui/aviso";
import { Dato } from "@/componentes/ui/dato";
import { InsigniaDocumento } from "@/componentes/ui/insignia-documento";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaAvisoFicha } from "@/esquemas/comunes";
import { formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerPedido } from "@/servicios/pedidos";
import { anularPedidoAccion } from "../acciones";
import { InsigniaPedido } from "../insignia-pedido";
import { AnularPedido } from "./anular-pedido";

export const metadata = { title: "Detalle de pedido · Almacén Regional Oruro" };

const avisos = {
  registrado: "Pedido registrado.",
  modificado: "Pedido actualizado.",
} as const;

const claseBoton = "rounded-md border border-marca bg-white px-4 py-2 text-sm font-medium text-marca hover:bg-fondo";

export default async function PaginaDetallePedido({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const { aviso } = esquemaAvisoFicha.parse(await searchParams);
  const pedido = id ? await obtenerPedido(id) : null;
  if (!pedido) notFound();

  const { representante, acciones } = pedido;
  const anulado = pedido.estado === "ANULADO";

  return (
    <section className="flex flex-col gap-4">
      <Link href="/pedidos" className="text-sm text-marca underline">
        ← Volver a pedidos
      </Link>
      {aviso && <Aviso tipo="exito">{avisos[aviso]}</Aviso>}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Pedido Nº {pedido.id}</h1>
        <InsigniaPedido estado={pedido.estado} />
      </div>
      {/* SC-007: la regla del estado a la vista, para explicar por qué el pedido tiene el que muestra (RN-41). */}
      <p className="text-sm text-gray-600">
        Pendiente: nada entregado · Parcial: algo entregado · Atendido: todo entregado · Anulado: lo anuló el encargado; lo entregado se
        conserva.
      </p>

      <dl className="grid gap-4 rounded-lg border border-borde bg-white p-6 sm:grid-cols-2">
        <Dato etiqueta="Fecha del pedido" valor={formatearFecha(pedido.fecha)} />
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
        <Dato etiqueta="Observación" valor={pedido.observacion} />
        <Dato etiqueta="Registrado por" valor={`${pedido.registradoPor} · ${formatearFechaHora(pedido.registradoEn)}`} />
        {anulado && (
          <>
            <Dato etiqueta="Motivo de la anulación" valor={pedido.motivoAnulacion} />
            <Dato etiqueta="Anulado por" valor={`${pedido.anuladoPor ?? ""} · ${pedido.anuladoEn ? formatearFechaHora(pedido.anuladoEn) : ""}`} />
          </>
        )}
      </dl>

      {/* Las acciones dependen del estado (FR-015); cada acción vuelve a verificarlo en el servidor. */}
      {(acciones.editar || acciones.distribuir) && (
        <div className="flex flex-wrap gap-3">
          {acciones.editar && (
            <Link href={`/pedidos/${pedido.id}/editar`} className={claseBoton}>
              Editar
            </Link>
          )}
          {acciones.distribuir && (
            <Link href={`/distribuciones/nueva?pedido=${pedido.id}`} className={claseBoton}>
              Distribuir
            </Link>
          )}
        </div>
      )}

      {/* En un pedido ANULADO lo que faltaba no está "pendiente": quedó anulado (FR-011, RN-43). */}
      <Tabla encabezados={["Código", "Producto", "Unidad", "Solicitado", "Entregado", anulado ? "Saldo anulado" : "Pendiente"]}>
        {pedido.lineas.map((linea) => (
          <tr key={linea.id}>
            <Celda>{linea.codigo}</Celda>
            <Celda>
              <Link href={`/productos/${linea.productoId}`} className="text-marca underline">
                {linea.nombre}
              </Link>
              {linea.productoActivo ? "" : " (inactivo)"}
            </Celda>
            <Celda>{linea.unidad}</Celda>
            <Celda className="text-right tabular-nums">{linea.solicitada}</Celda>
            <Celda className="text-right tabular-nums">{linea.entregada}</Celda>
            <Celda className="text-right tabular-nums">{anulado ? linea.saldoAnulado : linea.pendiente}</Celda>
          </tr>
        ))}
      </Tabla>

      <h2 className="text-lg font-semibold">Distribuciones</h2>
      {pedido.distribuciones.length === 0 ? (
        <p className="text-sm text-gray-600">Todavía no hay distribuciones para este pedido.</p>
      ) : (
        <Tabla encabezados={["Nº de vale", "Fecha", "Estado", "Acción"]}>
          {pedido.distribuciones.map((distribucion) => (
            <tr key={distribucion.id}>
              <Celda>{distribucion.nroVale}</Celda>
              <Celda>{formatearFecha(distribucion.fecha)}</Celda>
              <Celda>
                <InsigniaDocumento estado={distribucion.estado} />
              </Celda>
              <Celda>
                <Link href={`/distribuciones/${distribucion.id}`} className="text-marca underline">
                  Ver distribución
                </Link>
              </Celda>
            </tr>
          ))}
        </Tabla>
      )}

      {/* RN-43: solo se anula lo que todavía tiene algo por entregar (PENDIENTE o PARCIAL). */}
      {acciones.anular && <AnularPedido accion={anularPedidoAccion.bind(null, pedido.id)} pedidoId={pedido.id} />}
    </section>
  );
}
