import { requerirSesion } from "@/lib/sesion";
import { registrarProveedorAccion } from "../acciones";
import { FormularioProveedor } from "../formulario-proveedor";

export const metadata = { title: "Registrar proveedor · Almacén Regional Oruro" };

export default async function PaginaNuevoProveedor() {
  await requerirSesion();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold sm:text-[28px]">Registrar proveedor</h1>
      <FormularioProveedor accion={registrarProveedorAccion} textoBoton="Registrar" rutaCancelar="/proveedores" />
    </section>
  );
}
