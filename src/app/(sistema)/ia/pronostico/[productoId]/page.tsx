import Link from "next/link";
import { notFound } from "next/navigation";
import { Dato } from "@/componentes/ui/dato";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { formatearMes } from "@/lib/fechas";
import { formatearUnDecimal } from "@/lib/numeros";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { detalleDePronostico } from "@/servicios/ia/detalle";
import { GraficoConsumo } from "./grafico-consumo";

export const metadata = { title: "Consumo y pronóstico · Almacén Regional Oruro" };

export default async function PaginaGraficoProducto({ params }: { params: Promise<{ productoId: string }> }) {
  await requerirSesion();
  const productoId = idDeRuta((await params).productoId);
  const detalle = productoId ? await detalleDePronostico(productoId) : null;
  if (!detalle) notFound();

  const { producto, serie, validacion } = detalle;
  const pronosticoDeValidacion = new Map(validacion.map((mes) => [mes.mes, mes.pronostico]));

  return (
    <section className="flex flex-col gap-4">
      <Link href="/ia/pronostico" className="text-sm text-marca underline">
        ← Volver al pronóstico
      </Link>
      <div>
        <h1 className="text-2xl font-bold sm:text-[28px]">
          {producto.codigo} · {producto.nombre}
        </h1>
        {!producto.activo && <p className="text-sm font-semibold text-aviso">Producto inactivo: no figura en la pantalla de pronóstico.</p>}
      </div>

      <dl className="grid gap-3 rounded-md border border-borde bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Dato etiqueta="Método" valor={detalle.etiqueta} />
        <Dato etiqueta={`Pronóstico de ${formatearMes(detalle.mesPronosticado)}`} valor={`${formatearUnDecimal(detalle.pronostico)} ${producto.unidad}`} />
        <Dato etiqueta="Stock actual" valor={producto.stockActual} />
        <Dato etiqueta="Stock mínimo" valor={producto.stockMinimo} />
        <Dato etiqueta="Reposición sugerida" valor={detalle.reposicionSugerida} />
      </dl>

      {serie.length === 0 ? (
        <p className="rounded-md border border-borde bg-white p-4 text-texto-suave">Este producto todavía no tiene consumo registrado: no hay nada que graficar.</p>
      ) : (
        <GraficoConsumo detalle={detalle} />
      )}

      {validacion.length === 0 && serie.length > 0 && (
        <p className="text-sm text-texto-suave">
          Con menos de 30 meses de historia no se reservan meses de validación: el gráfico muestra solo el consumo y el pronóstico del mes.
        </p>
      )}

      {serie.length > 0 && (
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Valores del gráfico</h2>
          <Tabla encabezados={["Mes", "Consumo", "Pronóstico (validación)"]}>
            {serie.map((punto) => (
              <tr key={punto.mes}>
                <Celda>{formatearMes(punto.mes)}</Celda>
                <Celda className="text-right tabular-nums">{punto.consumo}</Celda>
                <Celda className="text-right tabular-nums">
                  {pronosticoDeValidacion.has(punto.mes) ? formatearUnDecimal(pronosticoDeValidacion.get(punto.mes) ?? 0) : "—"}
                </Celda>
              </tr>
            ))}
            <tr className="bg-amber-50 font-semibold">
              <Celda>{formatearMes(detalle.mesPronosticado)} (pronóstico)</Celda>
              <Celda className="text-right">—</Celda>
              <Celda className="text-right tabular-nums">{formatearUnDecimal(detalle.pronostico)}</Celda>
            </tr>
          </Tabla>
        </div>
      )}
    </section>
  );
}
