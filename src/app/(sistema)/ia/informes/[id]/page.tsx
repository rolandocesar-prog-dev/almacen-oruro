import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { TablaDatosInforme } from "@/componentes/ia/tabla-datos-informe";
import { NOTA_TEXTO_REDACTADO, TextoInforme, TITULO_DEL_INFORME } from "@/componentes/ia/texto-informe";
import { Aviso } from "@/componentes/ui/aviso";
import { Dato } from "@/componentes/ui/dato";
import { formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerInforme } from "@/servicios/ia/informes";

export const metadata = { title: "Informe IA · Almacén Regional Oruro" };

const esquemaAvisoInforme = z.object({ aviso: z.literal("generado").optional().catch(undefined) });

export default async function PaginaInforme({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const { aviso } = esquemaAvisoInforme.parse(await searchParams);
  const informe = id ? await obtenerInforme(id) : null;
  if (!informe) notFound();

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/ia/informes" className="text-sm text-marca underline">
          ← Volver a informes
        </Link>
        <Link
          href={`/ia/informes/${informe.id}/imprimir`}
          className="rounded-md border border-marca bg-white px-4 py-2 text-sm font-medium text-marca hover:bg-fondo"
        >
          Imprimir informe
        </Link>
      </div>
      {aviso === "generado" && <Aviso tipo="exito">Informe generado y guardado.</Aviso>}

      <h1 className="text-2xl font-semibold">{TITULO_DEL_INFORME[informe.tipo]}</h1>
      <dl className="grid gap-3 rounded-md border border-borde bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Dato etiqueta="Período" valor={`Del ${formatearFecha(informe.desde)} al ${formatearFecha(informe.hasta)}`} />
        <Dato etiqueta="Generado el" valor={formatearFechaHora(informe.creadoEn)} />
        <Dato etiqueta="Generado por" valor={informe.usuario} />
        <Dato etiqueta="Modelo" valor={informe.modelo} />
      </dl>

      {/* FR-013: el texto junto a la tabla de datos con que se redactó, para verificar cada cifra (SC-007). */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-md border border-borde bg-white p-4">
          <h2 className="text-lg font-semibold">Texto del informe</h2>
          <TextoInforme texto={informe.texto} />
          <p className="mt-2 text-xs italic text-gray-600">{NOTA_TEXTO_REDACTADO}.</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 overflow-x-auto rounded-md border border-borde bg-white p-4">
          <h2 className="text-lg font-semibold">Datos enviados al modelo</h2>
          <TablaDatosInforme tipo={informe.tipo} datos={informe.datosEntrada} />
        </div>
      </div>
    </section>
  );
}
