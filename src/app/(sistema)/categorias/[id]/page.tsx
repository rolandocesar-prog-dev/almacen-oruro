import Link from "next/link";
import { notFound } from "next/navigation";
import { CambioDeEstado } from "@/componentes/catalogos/cambio-de-estado";
import { EnlaceEditar } from "@/componentes/catalogos/encabezado-listado";
import { InsigniaActivo } from "@/componentes/catalogos/insignia-estado";
import { Aviso } from "@/componentes/ui/aviso";
import { Dato } from "@/componentes/ui/dato";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerCategoria } from "@/servicios/catalogos/categorias";
import { desactivarCategoriaAccion, reactivarCategoriaAccion } from "../acciones";

export const metadata = { title: "Ficha de categoría · Almacén Regional Oruro" };

const avisos: Record<string, string> = {
  registrado: "Categoría registrada.",
  modificado: "Datos actualizados.",
};

export default async function PaginaFichaCategoria({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const { aviso } = await searchParams;
  const categoria = id ? await obtenerCategoria(id) : null;
  if (!categoria) notFound();

  return (
    <section className="flex flex-col gap-4">
      <Link href="/categorias" className="text-sm text-marca underline">
        ← Volver al listado
      </Link>
      {aviso && avisos[aviso] && <Aviso tipo="exito">{avisos[aviso]}</Aviso>}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{categoria.nombre}</h1>
        <InsigniaActivo activo={categoria.activo} />
      </div>

      <dl className="grid gap-4 rounded-lg border border-borde bg-white p-6 sm:grid-cols-2">
        <Dato etiqueta="Descripción" valor={categoria.descripcion} />
        <Dato etiqueta="Productos activos" valor={categoria.productosActivos} />
      </dl>

      <div className="flex flex-wrap items-start gap-3">
        <EnlaceEditar ruta={`/categorias/${categoria.id}/editar`} />
        <CambioDeEstado
          activo={categoria.activo}
          confirmacionDesactivar={`¿Desactivar la categoría '${categoria.nombre}'?`}
          desactivar={desactivarCategoriaAccion.bind(null, categoria.id)}
          reactivar={reactivarCategoriaAccion.bind(null, categoria.id)}
        />
      </div>
    </section>
  );
}
