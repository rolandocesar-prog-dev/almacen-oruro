import Link from "next/link";
import { notFound } from "next/navigation";
import { TablaDatosInforme } from "@/componentes/ia/tabla-datos-informe";
import { NOTA_TEXTO_REDACTADO, TextoInforme, TITULO_DEL_INFORME } from "@/componentes/ia/texto-informe";
import { EncabezadoReporte } from "@/componentes/reportes/encabezado-reporte";
import { BotonImprimir } from "@/componentes/ui/boton-imprimir";
import { textoDeFiltros } from "@/esquemas/reportes";
import { formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerConfiguracion } from "@/servicios/configuracion";
import { obtenerInforme } from "@/servicios/ia/informes";

export const metadata = { title: "Informe IA · Almacén Regional Oruro" };

/**
 * Informe IA para imprimir (FR-016, research A-11): encabezado de reportes, texto, datos, modelo, fecha y
 * la nota de que el texto lo redactó un modelo. Solo lee la base: se imprime sin internet (SC-008).
 */
export default async function PaginaImprimirInforme({ params }: { params: Promise<{ id: string }> }) {
  const { usuario } = await requerirSesion();
  const id = idDeRuta((await params).id);
  const [informe, { modoDemostracion }] = await Promise.all([id ? obtenerInforme(id) : null, obtenerConfiguracion()]);
  if (!informe) notFound();

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/ia/informes/${informe.id}`} className="text-sm text-marca underline">
          ← Volver al informe
        </Link>
        <BotonImprimir />
      </div>

      <EncabezadoReporte
        titulo={TITULO_DEL_INFORME[informe.tipo]}
        filtros={textoDeFiltros([{ etiqueta: `Del ${formatearFecha(informe.desde)} al ${formatearFecha(informe.hasta)}` }])}
        emitidoPor={`${usuario.nombre} ${usuario.apellido}`}
        demostracion={modoDemostracion}
      />

      <p className="text-sm">
        Informe generado el {formatearFechaHora(informe.creadoEn)} por {informe.usuario} · Modelo: {informe.modelo}
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Texto del informe</h2>
        <TextoInforme texto={informe.texto} datos={informe.datosEntrada} />
        <p className="text-sm italic">{NOTA_TEXTO_REDACTADO}.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Datos del período</h2>
        <TablaDatosInforme tipo={informe.tipo} datos={informe.datosEntrada} />
      </section>
    </article>
  );
}
