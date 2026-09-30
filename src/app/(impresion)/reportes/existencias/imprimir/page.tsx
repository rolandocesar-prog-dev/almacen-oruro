import Link from "next/link";
import { EncabezadoReporte } from "@/componentes/reportes/encabezado-reporte";
import { CeldaReporte, SIN_RESULTADOS, TablaReporte } from "@/componentes/reportes/tabla-reporte";
import { BotonImprimir } from "@/componentes/ui/boton-imprimir";
import { esquemaReporteExistencias, textoDeFiltros } from "@/esquemas/reportes";
import { requerirSesion } from "@/lib/sesion";
import { listarCategorias } from "@/servicios/catalogos/categorias";
import { reporteExistencias } from "@/servicios/reportes";

export const metadata = { title: "Reporte de existencias · Almacén Regional Oruro" };

/** R-3 para imprimir: sin paginar (son unos 25 productos) y sin el menú del sistema (E-04, E-05). */
export default async function PaginaImprimirReporteExistencias({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const { usuario } = await requerirSesion();
  const filtro = esquemaReporteExistencias.parse(await searchParams);

  const [reporte, categorias] = await Promise.all([
    reporteExistencias({ categoriaId: filtro.categoria, soloBajoMinimo: filtro.soloBajoMinimo }),
    listarCategorias({ estado: "todos" }),
  ]);
  const nombreCategoria = categorias.find((categoria) => categoria.id === filtro.categoria)?.nombre;

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/reportes/existencias" className="text-sm text-marca underline">
          ← Volver al reporte
        </Link>
        <BotonImprimir />
      </div>

      <EncabezadoReporte
        titulo="Reporte de existencias"
        filtros={textoDeFiltros([
          { etiqueta: "Situación al momento de la emisión" },
          { etiqueta: "Categoría", valor: nombreCategoria },
          ...(filtro.soloBajoMinimo ? [{ etiqueta: "Solo bajo mínimo" }] : []),
        ])}
        emitidoPor={`${usuario.nombre} ${usuario.apellido}`}
      />

      {reporte.grupos.length === 0 && <p className="px-2 py-6 text-center">{SIN_RESULTADOS}</p>}
      {reporte.grupos.map((grupo) => (
        <div key={grupo.categoria} className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">{grupo.categoria}</h2>
          <TablaReporte encabezados={["Código", "Producto", "Unidad", "Stock actual", "Stock mínimo", "Indicador"]}>
            {grupo.filas.map((fila) => (
              <tr key={fila.id}>
                <CeldaReporte>{fila.codigo}</CeldaReporte>
                <CeldaReporte>{fila.nombre}</CeldaReporte>
                <CeldaReporte>{fila.unidad}</CeldaReporte>
                <CeldaReporte className="text-right tabular-nums">{fila.stockActual}</CeldaReporte>
                <CeldaReporte className="text-right tabular-nums">{fila.stockMinimo}</CeldaReporte>
                <CeldaReporte className={fila.indicador === "Bajo mínimo" ? "font-semibold" : ""}>{fila.indicador}</CeldaReporte>
              </tr>
            ))}
          </TablaReporte>
        </div>
      ))}

      <p className="text-base font-semibold">
        {reporte.totales.productos === 1 ? "1 producto" : `${reporte.totales.productos} productos`} ·{" "}
        {reporte.totales.bajoMinimo === 1 ? "1 bajo mínimo" : `${reporte.totales.bajoMinimo} bajo mínimo`}
      </p>
    </article>
  );
}
