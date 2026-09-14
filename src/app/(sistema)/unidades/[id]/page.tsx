import Link from "next/link";
import { notFound } from "next/navigation";
import { CambioDeEstado } from "@/componentes/catalogos/cambio-de-estado";
import { EnlaceEditar } from "@/componentes/catalogos/encabezado-listado";
import { InsigniaActivo } from "@/componentes/catalogos/insignia-estado";
import { Aviso } from "@/componentes/ui/aviso";
import { Dato } from "@/componentes/ui/dato";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerUnidadMedida } from "@/servicios/catalogos/unidades-medida";
import { desactivarUnidadAccion, reactivarUnidadAccion } from "../acciones";

export const metadata = { title: "Ficha de unidad de medida · Almacén Regional Oruro" };

const avisos: Record<string, string> = {
  registrado: "Unidad de medida registrada.",
  modificado: "Datos actualizados.",
};

export default async function PaginaFichaUnidad({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const { aviso } = await searchParams;
  const unidad = id ? await obtenerUnidadMedida(id) : null;
  if (!unidad) notFound();

  return (
    <section className="flex flex-col gap-4">
      <Link href="/unidades" className="text-sm text-marca underline">
        ← Volver al listado
      </Link>
      {aviso && avisos[aviso] && <Aviso tipo="exito">{avisos[aviso]}</Aviso>}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{unidad.nombre}</h1>
        <InsigniaActivo activo={unidad.activo} />
      </div>

      <dl className="grid gap-4 rounded-lg border border-borde bg-white p-6 sm:grid-cols-2">
        <Dato etiqueta="Abreviatura" valor={unidad.abreviatura} />
        <Dato etiqueta="Productos activos" valor={unidad.productosActivos} />
      </dl>

      <div className="flex flex-wrap items-start gap-3">
        <EnlaceEditar ruta={`/unidades/${unidad.id}/editar`} />
        <CambioDeEstado
          activo={unidad.activo}
          confirmacionDesactivar={`¿Desactivar la unidad de medida '${unidad.nombre}'?`}
          desactivar={desactivarUnidadAccion.bind(null, unidad.id)}
          reactivar={reactivarUnidadAccion.bind(null, unidad.id)}
        />
      </div>
    </section>
  );
}
