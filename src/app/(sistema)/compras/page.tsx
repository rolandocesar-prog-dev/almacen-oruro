import Link from "next/link";
import { EncabezadoListado } from "@/componentes/catalogos/encabezado-listado";
import { Aviso } from "@/componentes/ui/aviso";
import { Paginacion } from "@/componentes/ui/paginacion";
import { InsigniaDocumento } from "@/componentes/ui/insignia-documento";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaFiltroCompras, type FiltroCompras } from "@/esquemas/compras";
import { formatearBolivianos } from "@/lib/dinero";
import { formatearFecha, hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { listarProveedores } from "@/servicios/catalogos/proveedores";
import { COMPRAS_POR_PAGINA, listarCompras } from "@/servicios/compras";
import { FiltrosCompras } from "./filtros-compras";

export const metadata = { title: "Compras · Almacén Regional Oruro" };

export default async function PaginaCompras({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  await requerirSesion();

  // Mismo esquema que el formulario de filtros; si la URL trae algo inválido, se usa el mes en curso.
  const validacion = esquemaFiltroCompras.safeParse(await searchParams);
  const filtro: FiltroCompras = validacion.success
    ? validacion.data
    : { desde: inicioDelMesEnCurso(), hasta: hoyEnLaPaz(), estado: "todas", pagina: 1 };

  const [{ compras, total }, proveedores] = await Promise.all([
    listarCompras({ ...filtro, proveedorId: filtro.proveedor }),
    listarProveedores({ estado: "todos" }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / COMPRAS_POR_PAGINA));

  function enlacePagina(pagina: number) {
    const parametros = new URLSearchParams({ desde: filtro.desde, hasta: filtro.hasta, estado: filtro.estado, pagina: String(pagina) });
    if (filtro.proveedor) parametros.set("proveedor", String(filtro.proveedor));
    if (filtro.factura) parametros.set("factura", filtro.factura);
    return `/compras?${parametros.toString()}`;
  }

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoListado
        titulo="Compras"
        total={`${total === 1 ? "1 compra" : `${total} compras`} del ${formatearFecha(filtro.desde)} al ${formatearFecha(filtro.hasta)}`}
        rutaAlta="/compras/nueva"
        textoAlta="Registrar compra"
      />

      <FiltrosCompras
        valores={filtro}
        proveedores={proveedores.map((p) => ({ id: p.id, etiqueta: `${p.razonSocial} (${p.nit})${p.activo ? "" : " (inactivo)"}` }))}
      />
      {!validacion.success && (
        <Aviso tipo="error">{validacion.error.issues[0]?.message ?? "Filtros inválidos"}. Se muestra el mes en curso.</Aviso>
      )}

      <Tabla
        encabezados={["Fecha", "Nº de factura", "Proveedor", "Ítems", "Total", "Estado", ""]}
        vacio={compras.length === 0 ? "No hay compras para los filtros aplicados" : undefined}
      >
        {compras.map((compra) => (
          <tr key={compra.id}>
            <Celda>{formatearFecha(compra.fecha)}</Celda>
            <Celda>{compra.nroFactura}</Celda>
            <Celda>{compra.proveedor}</Celda>
            <Celda className="text-right tabular-nums">{compra.items}</Celda>
            <Celda className="text-right tabular-nums">{formatearBolivianos(compra.total)}</Celda>
            <Celda>
              <InsigniaDocumento estado={compra.estado} />
            </Celda>
            <Celda>
              <Link href={`/compras/${compra.id}`} className="text-marca underline">
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
