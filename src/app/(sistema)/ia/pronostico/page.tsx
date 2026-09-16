import Link from "next/link";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaFiltroPronostico } from "@/esquemas/ia";
import { formatearMes } from "@/lib/fechas";
import { formatearUnDecimal } from "@/lib/numeros";
import { requerirSesion } from "@/lib/sesion";
import { listarCategorias } from "@/servicios/catalogos/categorias";
import { pronosticoDeProductos } from "@/servicios/ia/pronostico";
import { FiltrosPronostico } from "./filtros-pronostico";

export const metadata = { title: "Pronóstico y reposición · Almacén Regional Oruro" };

export default async function PaginaPronostico({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  await requerirSesion();

  // Un valor inválido en la dirección no rompe la página: se ignora ese filtro.
  const filtro = esquemaFiltroPronostico.parse(await searchParams);
  const [{ mesPronosticado, filas, totales }, categorias] = await Promise.all([
    pronosticoDeProductos({ categoriaId: filtro.categoria, soloConReposicion: filtro.soloConReposicion }),
    listarCategorias({ estado: "todos" }),
  ]);

  return (
    <section className="flex flex-col gap-4">
      <Link href="/ia" className="text-sm text-marca underline">
        ← Volver a inteligencia artificial
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">Pronóstico y reposición sugerida</h1>
        <p className="text-sm text-gray-600">
          Consumo pronosticado para <strong>{formatearMes(mesPronosticado)}</strong> ·{" "}
          {totales.productos === 1 ? "1 producto" : `${totales.productos} productos`} ·{" "}
          <strong>{totales.unidadesSugeridas.toLocaleString("es-BO")} unidades sugeridas para reponer</strong>
        </p>
      </div>

      {/* FR-005: la fórmula a la vista, para que cualquiera rehaga la cuenta con los números de la fila. */}
      <div className="rounded-md border border-borde bg-white p-4 text-sm">
        <p className="font-medium">Cómo se calcula la reposición sugerida</p>
        <p className="mt-1 font-mono">Reposición = máx(0, ⌈pronóstico + stock mínimo − stock actual⌉)</p>
        <p className="mt-2 text-gray-600">
          El pronóstico se calcula en este momento a partir del kardex, sin internet y sin guardar nada: si se registra un documento, la próxima
          consulta ya lo refleja. Con 24 meses de historia o más se usa Holt-Winters; con menos, un promedio de los últimos meses. El
          procedimiento completo está en <code className="rounded bg-gray-100 px-1">docs/metodo-pronostico.md</code> y su precisión, en{" "}
          <Link href="/ia/evaluacion" className="text-marca underline">
            Evaluación del pronóstico
          </Link>
          .
        </p>
      </div>

      <FiltrosPronostico
        valores={filtro}
        categorias={categorias.map((c) => ({ id: c.id, etiqueta: c.activo ? c.nombre : `${c.nombre} (inactiva)` }))}
      />

      <Tabla
        encabezados={["Código", "Producto", "Unidad", "Método", "Pronóstico", "Stock actual", "Stock mínimo", "Reposición sugerida", ""]}
        vacio={filas.length === 0 ? "No hay productos activos para los filtros aplicados" : undefined}
      >
        {filas.map((fila) => (
          <tr key={fila.productoId} className={fila.reposicionSugerida > 0 ? "bg-amber-50" : undefined}>
            <Celda>{fila.codigo}</Celda>
            <Celda>{fila.nombre}</Celda>
            <Celda>{fila.unidad}</Celda>
            <Celda>{fila.etiquetaMetodo}</Celda>
            <Celda className="text-right tabular-nums">{formatearUnDecimal(fila.pronostico)}</Celda>
            <Celda className="text-right tabular-nums">{fila.stockActual}</Celda>
            <Celda className="text-right tabular-nums">{fila.stockMinimo}</Celda>
            {/* El número va en negrita cuando hay que comprar: se distingue sin depender del color de la fila. */}
            <Celda className={`text-right tabular-nums ${fila.reposicionSugerida > 0 ? "font-semibold" : ""}`}>{fila.reposicionSugerida}</Celda>
            <Celda>
              <Link href={`/ia/pronostico/${fila.productoId}`} className="text-marca underline">
                Ver gráfico
              </Link>
            </Celda>
          </tr>
        ))}
      </Tabla>
    </section>
  );
}
