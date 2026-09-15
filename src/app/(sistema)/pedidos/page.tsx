import Link from "next/link";
import { EncabezadoListado } from "@/componentes/catalogos/encabezado-listado";
import { Aviso } from "@/componentes/ui/aviso";
import { Paginacion } from "@/componentes/ui/paginacion";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaFiltroPedidos, type FiltroPedidos } from "@/esquemas/pedidos";
import { formatearFecha } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { listarRepresentantes } from "@/servicios/catalogos/representantes";
import { listarPedidos, PEDIDOS_POR_PAGINA } from "@/servicios/pedidos";
import { FiltrosPedidos } from "./filtros-pedidos";
import { InsigniaPedido } from "./insignia-pedido";

export const metadata = { title: "Pedidos · Almacén Regional Oruro" };

export default async function PaginaPedidos({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  await requerirSesion();

  // Mismo esquema que el formulario de filtros; si la URL trae algo inválido, se muestran los pedidos por atender.
  const validacion = esquemaFiltroPedidos.safeParse(await searchParams);
  const filtro: FiltroPedidos = validacion.success ? validacion.data : { estado: "por-atender", pagina: 1 };

  const [{ pedidos, total }, representantes] = await Promise.all([
    listarPedidos({ ...filtro, representanteId: filtro.representante }),
    // El filtro incluye a los inactivos: sus pedidos siguen en el histórico (principio V).
    listarRepresentantes({ estado: "todos" }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / PEDIDOS_POR_PAGINA));

  function enlacePagina(pagina: number) {
    const parametros = new URLSearchParams({ estado: filtro.estado, pagina: String(pagina) });
    if (filtro.representante) parametros.set("representante", String(filtro.representante));
    if (filtro.desde) parametros.set("desde", filtro.desde);
    if (filtro.hasta) parametros.set("hasta", filtro.hasta);
    return `/pedidos?${parametros.toString()}`;
  }

  const textoVacio = filtro.estado === "por-atender" && !filtro.representante && !filtro.desde && !filtro.hasta
    ? "No hay pedidos por atender"
    : "No hay pedidos para los filtros aplicados";

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoListado
        titulo="Pedidos"
        total={total === 1 ? "1 pedido" : `${total} pedidos`}
        rutaAlta="/pedidos/nuevo"
        textoAlta="Registrar pedido"
      />

      <FiltrosPedidos
        valores={filtro}
        representantes={representantes.map((r) => ({ id: r.id, etiqueta: `${r.nombreCompleto} · ${r.servicio}${r.activo ? "" : " (inactivo)"}` }))}
      />
      {!validacion.success && (
        <Aviso tipo="error">{validacion.error.issues[0]?.message ?? "Filtros inválidos"}. Se muestran los pedidos por atender.</Aviso>
      )}

      <Tabla
        encabezados={["Nº", "Fecha", "Representante", "Servicio", "Productos", "% atendido", "Estado", "Acción"]}
        vacio={pedidos.length === 0 ? textoVacio : undefined}
      >
        {pedidos.map((pedido) => (
          <tr key={pedido.id}>
            <Celda className="tabular-nums">{pedido.id}</Celda>
            <Celda>{formatearFecha(pedido.fecha)}</Celda>
            <Celda>{pedido.representante}</Celda>
            <Celda>{pedido.servicio}</Celda>
            <Celda className="text-right tabular-nums">{pedido.productos}</Celda>
            <Celda className="text-right tabular-nums">{pedido.porcentajeAtendido} %</Celda>
            <Celda>
              <InsigniaPedido estado={pedido.estado} />
            </Celda>
            <Celda>
              <Link href={`/pedidos/${pedido.id}`} className="text-marca underline">
                Ver detalle
              </Link>
            </Celda>
          </tr>
        ))}
      </Tabla>

      <Paginacion pagina={filtro.pagina} paginas={paginas} enlace={enlacePagina} />
    </section>
  );
}
