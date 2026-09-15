import Link from "next/link";
import { Aviso } from "@/componentes/ui/aviso";
import { hoyEnLaPaz } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { listarProductosParaSelector } from "@/servicios/catalogos/productos";
import { listarProveedoresParaSelector } from "@/servicios/catalogos/proveedores";
import { FormularioCompra } from "../formulario-compra";

export const metadata = { title: "Registrar compra · Almacén Regional Oruro" };

export default async function PaginaNuevaCompra() {
  await requerirSesion();
  // Solo proveedores y productos activos se pueden elegir en una compra nueva (RN-14).
  const [proveedores, productos] = await Promise.all([listarProveedoresParaSelector(), listarProductosParaSelector()]);

  return (
    <section className="flex flex-col gap-4">
      <Link href="/compras" className="text-sm text-marca underline">
        ← Volver a compras
      </Link>
      <h1 className="text-2xl font-semibold">Registrar compra</h1>
      <p className="text-sm text-gray-600">
        Carga la compra con la factura en mano. Al guardar, el stock de cada producto sube y queda en su kardex. Una compra no se edita: si
        tiene un error, se anula y se vuelve a registrar.
      </p>
      {(proveedores.length === 0 || productos.length === 0) && (
        <Aviso tipo="informacion">
          Para registrar compras necesitas al menos un{" "}
          <Link href="/proveedores/nuevo" className="underline">
            proveedor
          </Link>{" "}
          y un{" "}
          <Link href="/productos/nuevo" className="underline">
            producto
          </Link>{" "}
          activos.
        </Aviso>
      )}
      <FormularioCompra proveedores={proveedores} productos={productos} hoy={hoyEnLaPaz()} />
    </section>
  );
}
