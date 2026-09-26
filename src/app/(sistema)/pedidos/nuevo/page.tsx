import Link from "next/link";
import { Aviso } from "@/componentes/ui/aviso";
import { hoyEnLaPaz } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { listarRepresentantesParaSelector } from "@/servicios/catalogos/representantes";
import { listarProductosParaPedido } from "@/servicios/pedidos";
import { registrarPedidoAccion } from "../acciones";
import { FormularioPedido } from "../formulario-pedido";

export const metadata = { title: "Registrar pedido · Almacén Regional Oruro" };

export default async function PaginaNuevoPedido() {
  await requerirSesion();
  // Solo representantes y productos activos se pueden elegir en un pedido nuevo (RN-14).
  const [representantes, productos] = await Promise.all([listarRepresentantesParaSelector(), listarProductosParaPedido()]);

  return (
    <section className="flex flex-col gap-4">
      <Link href="/pedidos" className="text-sm text-marca underline">
        ← Volver a pedidos
      </Link>
      <h1 className="text-2xl font-bold sm:text-[28px]">Registrar pedido</h1>
      <p className="text-sm text-texto-suave">
        Carga lo que pide el representante con la cantidad que necesita. El pedido queda pendiente hasta que se distribuya; mientras nada se
        entregue, se puede editar.
      </p>
      {(representantes.length === 0 || productos.length === 0) && (
        <Aviso tipo="informacion">
          Para registrar pedidos necesitas al menos un{" "}
          <Link href="/representantes/nuevo" className="underline">
            representante
          </Link>{" "}
          y un{" "}
          <Link href="/productos/nuevo" className="underline">
            producto
          </Link>{" "}
          activos.
        </Aviso>
      )}
      <FormularioPedido
        accion={registrarPedidoAccion}
        representantes={representantes}
        productos={productos}
        hoy={hoyEnLaPaz()}
        textoBoton="Registrar pedido"
        rutaCancelar="/pedidos"
      />
    </section>
  );
}
