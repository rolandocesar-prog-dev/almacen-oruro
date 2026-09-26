import { notFound } from "next/navigation";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerProveedor } from "@/servicios/catalogos/proveedores";
import { modificarProveedorAccion } from "../../acciones";
import { FormularioProveedor } from "../../formulario-proveedor";

export const metadata = { title: "Editar proveedor · Almacén Regional Oruro" };

export default async function PaginaEditarProveedor({ params }: { params: Promise<{ id: string }> }) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const proveedor = id ? await obtenerProveedor(id) : null;
  if (!proveedor) notFound();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold sm:text-[28px]">Editar {proveedor.razonSocial}</h1>
      <FormularioProveedor
        accion={modificarProveedorAccion.bind(null, proveedor.id)}
        valores={proveedor}
        textoBoton="Guardar cambios"
        rutaCancelar={`/proveedores/${proveedor.id}`}
      />
    </section>
  );
}
