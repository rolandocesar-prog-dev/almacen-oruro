import Link from "next/link";
import { notFound } from "next/navigation";
import { CambioDeEstado } from "@/componentes/catalogos/cambio-de-estado";
import { EnlaceEditar } from "@/componentes/catalogos/encabezado-listado";
import { InsigniaActivo } from "@/componentes/catalogos/insignia-estado";
import { Aviso } from "@/componentes/ui/aviso";
import { Dato } from "@/componentes/ui/dato";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerProveedor } from "@/servicios/catalogos/proveedores";
import { desactivarProveedorAccion, reactivarProveedorAccion } from "../acciones";

export const metadata = { title: "Ficha de proveedor · Almacén Regional Oruro" };

const avisos: Record<string, string> = {
  registrado: "Proveedor registrado.",
  modificado: "Datos actualizados.",
};

export default async function PaginaFichaProveedor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const { aviso } = await searchParams;
  const proveedor = id ? await obtenerProveedor(id) : null;
  if (!proveedor) notFound();

  return (
    <section className="flex flex-col gap-4">
      <Link href="/proveedores" className="text-sm text-marca underline">
        ← Volver al listado
      </Link>
      {typeof aviso === "string" && avisos[aviso] && <Aviso tipo="exito">{avisos[aviso]}</Aviso>}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{proveedor.razonSocial}</h1>
        <InsigniaActivo activo={proveedor.activo} />
      </div>

      <dl className="grid gap-4 rounded-lg border border-borde bg-white p-6 sm:grid-cols-2">
        <Dato etiqueta="NIT" valor={proveedor.nit} />
        <Dato etiqueta="Nombre de contacto" valor={proveedor.contactoNombre} />
        <Dato etiqueta="Teléfono" valor={proveedor.telefono} />
        <Dato etiqueta="Correo" valor={proveedor.correo} />
        <Dato etiqueta="Dirección" valor={proveedor.direccion} />
      </dl>

      <div className="flex flex-wrap items-start gap-3">
        <EnlaceEditar ruta={`/proveedores/${proveedor.id}/editar`} />
        <CambioDeEstado
          activo={proveedor.activo}
          confirmacionDesactivar={`¿Desactivar el proveedor '${proveedor.razonSocial}'? Sus compras anteriores lo seguirán mostrando.`}
          desactivar={desactivarProveedorAccion.bind(null, proveedor.id)}
          reactivar={reactivarProveedorAccion.bind(null, proveedor.id)}
        />
      </div>
    </section>
  );
}
