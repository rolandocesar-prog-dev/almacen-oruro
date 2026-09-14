import Link from "next/link";
import { notFound } from "next/navigation";
import { CambioDeEstado } from "@/componentes/catalogos/cambio-de-estado";
import { EnlaceEditar } from "@/componentes/catalogos/encabezado-listado";
import { InsigniaActivo } from "@/componentes/catalogos/insignia-estado";
import { Aviso } from "@/componentes/ui/aviso";
import { Dato } from "@/componentes/ui/dato";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerCentroSalud } from "@/servicios/catalogos/centros-salud";
import { desactivarCentroSaludAccion, reactivarCentroSaludAccion } from "../acciones";

export const metadata = { title: "Ficha de centro de salud · Almacén Regional Oruro" };

const avisos: Record<string, string> = {
  registrado: "Centro de salud registrado.",
  modificado: "Datos actualizados.",
};

export default async function PaginaFichaCentroSalud({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const { aviso } = await searchParams;
  const centro = id ? await obtenerCentroSalud(id) : null;
  if (!centro) notFound();

  return (
    <section className="flex flex-col gap-4">
      <Link href="/centros-salud" className="text-sm text-marca underline">
        ← Volver al listado
      </Link>
      {aviso && avisos[aviso] && <Aviso tipo="exito">{avisos[aviso]}</Aviso>}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{centro.nombre}</h1>
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
