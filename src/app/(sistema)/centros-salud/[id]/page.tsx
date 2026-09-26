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
import { obtenerCentroSalud } from "@/servicios/catalogos/centros-salud";
import { desactivarCentroSaludAccion, reactivarCentroSaludAccion } from "../acciones";

export const metadata = { title: "Ficha de centro de salud · Almacén Regional Oruro" };

const avisos = {
  registrado: "Centro de salud registrado.",
  modificado: "Datos actualizados.",
} as const;

export default async function PaginaFichaCentroSalud({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const { aviso } = esquemaAvisoFicha.parse(await searchParams);
  const centro = id ? await obtenerCentroSalud(id) : null;
  if (!centro) notFound();

  return (
    <section className="flex flex-col gap-4">
      <Link href="/centros-salud" className="text-sm text-marca underline">
        ← Volver al listado
      </Link>
      {aviso && <Aviso tipo="exito">{avisos[aviso]}</Aviso>}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold sm:text-[28px]">{centro.nombre}</h1>
        <InsigniaActivo activo={centro.activo} />
      </div>

      <dl className="grid gap-4 rounded-lg border border-borde bg-white p-6 sm:grid-cols-2">
        <Dato etiqueta="Teléfono" valor={centro.telefono} />
        <Dato etiqueta="Dirección" valor={centro.direccion} />
        <Dato etiqueta="Representantes activos" valor={centro.representantesActivos} />
      </dl>

      <div className="flex flex-wrap items-start gap-3">
        <EnlaceEditar ruta={`/centros-salud/${centro.id}/editar`} />
        <CambioDeEstado
          activo={centro.activo}
          confirmacionDesactivar={`¿Desactivar el centro de salud '${centro.nombre}'?`}
          desactivar={desactivarCentroSaludAccion.bind(null, centro.id)}
          reactivar={reactivarCentroSaludAccion.bind(null, centro.id)}
        />
      </div>
    </section>
  );
}
