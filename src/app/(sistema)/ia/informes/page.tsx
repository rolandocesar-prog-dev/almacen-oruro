import Link from "next/link";
import { TITULO_DEL_INFORME } from "@/componentes/ia/texto-informe";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaFiltroInformes } from "@/esquemas/ia";
import { formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { listarInformes } from "@/servicios/ia/informes";
import { FiltrosInformes } from "./filtros-informes";

export const metadata = { title: "Informes IA · Almacén Regional Oruro" };

export default async function PaginaInformes({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  await requerirSesion();

  // Un tipo inválido en la dirección muestra todos.
  const filtro = esquemaFiltroInformes.parse(await searchParams);
  const { informes } = await listarInformes({ tipo: filtro.tipo });

  return (
    <section className="flex flex-col gap-4">
      <Link href="/ia" className="text-sm text-marca underline">
        ← Volver a inteligencia artificial
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Informes IA</h1>
          <p className="text-sm text-gray-600">
            Los informes guardados se consultan e imprimen sin internet. Cada uno conserva los datos con que se redactó.
          </p>
        </div>
        <Link href="/ia/informes/nuevo" className="rounded-md bg-marca px-4 py-2 text-sm font-medium text-white hover:bg-marca-oscuro">
          Generar informe
        </Link>
      </div>

      <FiltrosInformes valores={filtro} />

      <Tabla
        encabezados={["Generado el", "Tipo", "Período", "Modelo", "Emitido por", ""]}
        vacio={informes.length === 0 ? "Todavía no hay informes generados" : undefined}
      >
        {informes.map((informe) => (
          <tr key={informe.id}>
            <Celda>{formatearFechaHora(informe.creadoEn)}</Celda>
            <Celda>{TITULO_DEL_INFORME[informe.tipo]}</Celda>
            <Celda>
              {formatearFecha(informe.desde)} al {formatearFecha(informe.hasta)}
            </Celda>
            <Celda>{informe.modelo}</Celda>
            <Celda>{informe.usuario}</Celda>
            <Celda>
              <Link href={`/ia/informes/${informe.id}`} className="text-marca underline">
                Ver informe
              </Link>
            </Celda>
          </tr>
        ))}
      </Tabla>
    </section>
  );
}
