import Link from "next/link";
import { notFound } from "next/navigation";
import { CambioDeEstado } from "@/componentes/catalogos/cambio-de-estado";
import { EnlaceEditar } from "@/componentes/catalogos/encabezado-listado";
import { InsigniaActivo } from "@/componentes/catalogos/insignia-estado";
import { Aviso } from "@/componentes/ui/aviso";
import { Dato } from "@/componentes/ui/dato";
import { esquemaAvisoFicha } from "@/esquemas/comunes";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerRepresentante } from "@/servicios/catalogos/representantes";
import { desactivarRepresentanteAccion, reactivarRepresentanteAccion } from "../acciones";

export const metadata = { title: "Ficha de representante · Almacén Regional Oruro" };

const avisos = {
  registrado: "Representante registrado.",
  modificado: "Datos actualizados.",
} as const;

export default async function PaginaFichaRepresentante({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const { aviso } = esquemaAvisoFicha.parse(await searchParams);
  const representante = id ? await obtenerRepresentante(id) : null;
  if (!representante) notFound();

  const { centroSalud } = representante;

  return (
    <section className="flex flex-col gap-4">
      <Link href="/representantes" className="text-sm text-marca underline">
        ← Volver al listado
      </Link>
      {aviso && <Aviso tipo="exito">{avisos[aviso]}</Aviso>}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold sm:text-[28px]">
          {representante.nombre} {representante.apellido}
        </h1>
        <InsigniaActivo activo={representante.activo} />
      </div>

      <dl className="grid gap-4 rounded-lg border border-borde bg-white p-6 sm:grid-cols-2">
        <Dato etiqueta="CI" valor={representante.ci} />
        <Dato etiqueta="Teléfono" valor={representante.telefono} />
        <Dato
          etiqueta="Centro de salud"
          valor={
            <Link href={`/centros-salud/${centroSalud.id}`} className="text-marca underline">
              {centroSalud.activo ? centroSalud.nombre : `${centroSalud.nombre} (inactivo)`}
            </Link>
          }
        />
      </dl>

      <div className="flex flex-wrap items-start gap-3">
        <EnlaceEditar ruta={`/representantes/${representante.id}/editar`} />
        {/* Todos sus pedidos, también los atendidos y anulados (F-004, research P-11). */}
        <Link
          href={`/pedidos?representante=${representante.id}&estado=todos`}
          className="rounded-md border border-marca bg-white px-4 py-2 text-sm font-medium text-marca hover:bg-fondo"
        >
          Ver sus pedidos
        </Link>
        <CambioDeEstado
          activo={representante.activo}
          confirmacionDesactivar={`¿Desactivar a ${representante.nombre} ${representante.apellido}? Ya no podrá elegirse en pedidos nuevos.`}
          desactivar={desactivarRepresentanteAccion.bind(null, representante.id)}
          reactivar={reactivarRepresentanteAccion.bind(null, representante.id)}
        />
      </div>
    </section>
  );
}
