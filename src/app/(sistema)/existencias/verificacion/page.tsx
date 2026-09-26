import Link from "next/link";
import { Aviso } from "@/componentes/ui/aviso";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { formatearFechaHora } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { verificarConsistenciaInventario } from "@/servicios/inventario";

export const metadata = { title: "Verificación del inventario · Almacén Regional Oruro" };

// Se calcula en cada visita: la verificación es "a pedido" (FR-020) y no debe mostrarse desde caché.
export const dynamic = "force-dynamic";

export default async function PaginaVerificacion() {
  await requerirSesion();
  const resultado = await verificarConsistenciaInventario();

  return (
    <section className="flex flex-col gap-4">
      <Link href="/existencias" className="text-sm text-marca underline">
        ← Volver a existencias
      </Link>
      <h1 className="text-2xl font-bold sm:text-[28px]">Verificación de consistencia del inventario</h1>
      <p className="text-sm text-texto-suave">
        Compara, para cada producto, el stock actual con la suma de todos sus movimientos del kardex (RN-50). Verificado el{" "}
        {formatearFechaHora(resultado.verificadoEn)}.
      </p>

      {resultado.diferencias.length === 0 ? (
        <Aviso tipo="exito">
          El inventario es consistente: el stock de los {resultado.revisados} productos coincide con la suma de sus movimientos.
        </Aviso>
      ) : (
        <>
          <Aviso tipo="error">
            {resultado.diferencias.length === 1 ? "1 producto tiene" : `${resultado.diferencias.length} productos tienen`} diferencia entre su
            stock y la suma de sus movimientos (de {resultado.revisados} revisados).
          </Aviso>
          <Tabla encabezados={["Código", "Producto", "Stock actual", "Suma de movimientos", "Diferencia"]}>
            {resultado.diferencias.map((fila) => (
              <tr key={fila.productoId}>
                <Celda>{fila.codigo}</Celda>
                <Celda>
                  <Link href={`/kardex/${fila.productoId}`} className="text-marca underline">
                    {fila.nombre}
                  </Link>
                </Celda>
                <Celda className="text-right tabular-nums">{fila.stockActual}</Celda>
                <Celda className="text-right tabular-nums">{fila.sumaMovimientos}</Celda>
                <Celda className="text-right tabular-nums">{fila.diferencia}</Celda>
              </tr>
            ))}
          </Tabla>
        </>
      )}

      <Link href="/existencias/verificacion" className="self-start rounded-md border border-marca bg-white px-4 py-2 text-sm font-medium text-marca hover:bg-fondo">
        Verificar otra vez
      </Link>
    </section>
  );
}
