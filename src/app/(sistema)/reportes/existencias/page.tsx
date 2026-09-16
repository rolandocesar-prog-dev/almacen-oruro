import Link from "next/link";
import { EncabezadoReporte } from "@/componentes/reportes/encabezado-reporte";
import { CeldaReporte, SIN_RESULTADOS, TablaReporte } from "@/componentes/reportes/tabla-reporte";
import { esquemaReporteExistencias, textoDeFiltros } from "@/esquemas/reportes";
import { requerirSesion } from "@/lib/sesion";
import { listarCategorias } from "@/servicios/catalogos/categorias";
import { obtenerConfiguracion } from "@/servicios/configuracion";
import { reporteExistencias } from "@/servicios/reportes";
import { FiltrosReporteExistencias } from "./filtros-reporte-existencias";
import { parametrosDeExistencias } from "./parametros";

export const metadata = { title: "Reporte de existencias · Almacén Regional Oruro" };

export default async function PaginaReporteExistencias({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const { usuario } = await requerirSesion();

  // Los valores inválidos toman el valor por defecto: el reporte siempre se puede emitir (FR-002).
  const filtro = esquemaReporteExistencias.parse(await searchParams);

  const [reporte, categorias, { modoDemostracion }] = await Promise.all([
    reporteExistencias({ categoriaId: filtro.categoria, soloBajoMinimo: filtro.soloBajoMinimo }),
    listarCategorias({ estado: "todos" }),
    obtenerConfiguracion(),
  ]);
  const nombreCategoria = categorias.find((categoria) => categoria.id === filtro.categoria)?.nombre;
  const parametros = parametrosDeExistencias(filtro);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/reportes" className="text-sm text-marca underline">
          ← Volver a reportes
        </Link>
        <Link
          href={`/reportes/existencias/imprimir${parametros.size > 0 ? `?${parametros.toString()}` : ""}`}
          className="rounded-md border border-marca bg-white px-4 py-2 text-sm font-medium text-marca hover:bg-fondo"
        >
          Imprimir
        </Link>
      </div>

      <FiltrosReporteExistencias
        valores={filtro}
        categorias={categorias.map((c) => ({ id: c.id, etiqueta: `${c.nombre}${c.activo ? "" : " (inactiva)"}` }))}
      />

      <EncabezadoReporte
        titulo="Reporte de existencias"
        filtros={textoDeFiltros([
          { etiqueta: "Situación al momento de la emisión" },
          { etiqueta: "Categoría", valor: nombreCategoria },
          ...(filtro.soloBajoMinimo ? [{ etiqueta: "Solo bajo mínimo" }] : []),
        ])}
        emitidoPor={`${usuario.nombre} ${usuario.apellido}`}
        demostracion={modoDemostracion}
      />

      {reporte.grupos.length === 0 && <p className="px-2 py-6 text-center text-gray-600">{SIN_RESULTADOS}</p>}
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
                {/* El indicador va con texto, no solo con color: se entiende impreso en blanco y negro. */}
                <CeldaReporte className={fila.indicador === "Bajo mínimo" ? "font-semibold text-aviso" : ""}>{fila.indicador}</CeldaReporte>
              </tr>
            ))}
          </TablaReporte>
        </div>
      ))}

      <p className="text-base font-semibold">
        {reporte.totales.productos === 1 ? "1 producto" : `${reporte.totales.productos} productos`} ·{" "}
        {reporte.totales.bajoMinimo === 1 ? "1 bajo mínimo" : `${reporte.totales.bajoMinimo} bajo mínimo`}
      </p>
    </section>
  );
}
