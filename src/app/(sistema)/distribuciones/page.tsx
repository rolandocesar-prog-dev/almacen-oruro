import Link from "next/link";
import { EncabezadoListado } from "@/componentes/catalogos/encabezado-listado";
import { Aviso } from "@/componentes/ui/aviso";
import { InsigniaDocumento } from "@/componentes/ui/insignia-documento";
import { Paginacion } from "@/componentes/ui/paginacion";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaFiltroDistribuciones, type FiltroDistribuciones } from "@/esquemas/distribuciones";
import { formatearFecha, hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { listarProductos } from "@/servicios/catalogos/productos";
import { listarRepresentantes } from "@/servicios/catalogos/representantes";
import { DISTRIBUCIONES_POR_PAGINA, listarDistribuciones } from "@/servicios/distribuciones";
import { FiltrosDistribuciones } from "./filtros-distribuciones";

export const metadata = { title: "Distribuciones · Almacén Regional Oruro" };

export default async function PaginaDistribuciones({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  await requerirSesion();

  // Mismo esquema que el formulario de filtros; si la URL trae algo inválido, se usa el mes en curso.
  const validacion = esquemaFiltroDistribuciones.safeParse(await searchParams);
  const filtro: FiltroDistribuciones = validacion.success
    ? validacion.data
    : { desde: inicioDelMesEnCurso(), hasta: hoyEnLaPaz(), estado: "todas", pagina: 1 };

  const [{ distribuciones, total }, representantes, productos] = await Promise.all([
    listarDistribuciones({ ...filtro, representanteId: filtro.representante, productoId: filtro.producto }),
    // Los filtros incluyen inactivos: sus distribuciones siguen en el histórico (principio V).
    listarRepresentantes({ estado: "todos" }),
    listarProductos({ estado: "todos" }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / DISTRIBUCIONES_POR_PAGINA));

  function enlacePagina(pagina: number) {
    const parametros = new URLSearchParams({ desde: filtro.desde, hasta: filtro.hasta, estado: filtro.estado, pagina: String(pagina) });
    if (filtro.representante) parametros.set("representante", String(filtro.representante));
    if (filtro.producto) parametros.set("producto", String(filtro.producto));
    if (filtro.vale) parametros.set("vale", filtro.vale);
    return `/distribuciones?${parametros.toString()}`;
  }

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoListado
        titulo="Distribuciones"
        total={`${total === 1 ? "1 distribución" : `${total} distribuciones`} del ${formatearFecha(filtro.desde)} al ${formatearFecha(filtro.hasta)}`}
        rutaAlta="/distribuciones/nueva"
        textoAlta="Registrar distribución"
      />

      <FiltrosDistribuciones
        valores={filtro}
        representantes={representantes.map((r) => ({ id: r.id, etiqueta: `${r.nombreCompleto} · ${r.servicio}${r.activo ? "" : " (inactivo)"}` }))}
        productos={productos.map((p) => ({ id: p.id, etiqueta: `${p.codigo} · ${p.nombre}${p.activo ? "" : " (inactivo)"}` }))}
      />
      {!validacion.success && (
        <Aviso tipo="error">{validacion.error.issues[0]?.message ?? "Filtros inválidos"}. Se muestra el mes en curso.</Aviso>
      )}

      <Tabla
        encabezados={["Fecha", "Nº de vale", "Pedido", "Representante", "Servicio", "Productos", "Unidades", "Estado", "Acción"]}
        vacio={distribuciones.length === 0 ? "No hay distribuciones para los filtros aplicados" : undefined}
      >
        {distribuciones.map((distribucion) => (
          <tr key={distribucion.id}>
            <Celda>{formatearFecha(distribucion.fecha)}</Celda>
            <Celda>{distribucion.nroVale}</Celda>
            <Celda>
              <Link href={`/pedidos/${distribucion.pedidoId}`} className="text-marca underline">
                Nº {distribucion.pedidoId}
              </Link>
            </Celda>
            <Celda>{distribucion.representante}</Celda>
            <Celda>{distribucion.servicio}</Celda>
            <Celda className="text-right tabular-nums">{distribucion.productos}</Celda>
            <Celda className="text-right tabular-nums">{distribucion.unidades}</Celda>
            <Celda>
              <InsigniaDocumento estado={distribucion.estado} />
            </Celda>
            <Celda>
              <Link href={`/distribuciones/${distribucion.id}`} className="text-marca underline">
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
