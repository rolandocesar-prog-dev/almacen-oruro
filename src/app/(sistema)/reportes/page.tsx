import Link from "next/link";
import { requerirSesion } from "@/lib/sesion";

export const metadata = { title: "Reportes · Almacén Regional Oruro" };

// Los cinco reportes de F-006 (FR-001). Cada uno responde una pregunta concreta y se puede imprimir.
const reportes = [
  { ruta: "/reportes/compras", titulo: "Compras", descripcion: "Cuánto se gastó en un período y a qué proveedores" },
  { ruta: "/reportes/distribuciones", titulo: "Distribuciones", descripcion: "Qué se entregó, a quién y cuánto de cada producto" },
  { ruta: "/reportes/existencias", titulo: "Existencias", descripcion: "Stock actual de cada producto y cuáles están bajo mínimo" },
  { ruta: "/reportes/kardex", titulo: "Kardex de un producto", descripcion: "Movimientos de un producto en un período, con saldo inicial y final" },
  { ruta: "/reportes/pedidos", titulo: "Pedidos", descripcion: "Pedidos de un período, cuánto se atendió y cuántos hay por estado" },
] as const;

export default async function PaginaReportes() {
  await requerirSesion();

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-[28px]">Reportes</h1>
        <p className="text-sm text-texto-suave">
          Cada reporte se consulta en pantalla y se imprime (o se guarda como PDF) con su encabezado, los filtros aplicados y la fecha de
          emisión.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {reportes.map((reporte) => (
          <li key={reporte.ruta}>
            <Link href={reporte.ruta} className="block rounded-lg border border-borde bg-white p-4 hover:border-marca">
              <span className="block font-semibold text-marca">{reporte.titulo}</span>
              <span className="text-sm text-texto-suave">{reporte.descripcion}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
