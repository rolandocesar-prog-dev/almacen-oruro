import Link from "next/link";
import { Aviso } from "@/componentes/ui/aviso";
import { requerirSesion } from "@/lib/sesion";
import { listarCategoriasParaSelector } from "@/servicios/catalogos/categorias";
import { listarUnidadesParaSelector } from "@/servicios/catalogos/unidades-medida";
import { registrarProductoAccion } from "../acciones";
import { FormularioProducto } from "../formulario-producto";

export const metadata = { title: "Registrar producto · Almacén Regional Oruro" };

export default async function PaginaNuevoProducto() {
  await requerirSesion();
  const [categorias, unidades] = await Promise.all([listarCategoriasParaSelector(), listarUnidadesParaSelector()]);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold sm:text-[28px]">Registrar producto</h1>
      <p className="text-sm text-texto-suave">El producto empieza con stock 0: el stock sube con las compras y baja con las distribuciones.</p>
      {(categorias.length === 0 || unidades.length === 0) && (
        <Aviso tipo="informacion">
          Antes de registrar productos necesitas al menos una{" "}
          <Link href="/categorias/nueva" className="underline">
            categoría
          </Link>{" "}
          y una{" "}
          <Link href="/unidades/nueva" className="underline">
            unidad de medida
          </Link>{" "}
          activas.
        </Aviso>
      )}
      <FormularioProducto
        accion={registrarProductoAccion}
        categorias={categorias}
        unidades={unidades}
        textoBoton="Registrar"
        rutaCancelar="/productos"
      />
    </section>
  );
}
