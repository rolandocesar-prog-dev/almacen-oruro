import Link from "next/link";
import { Aviso } from "@/componentes/ui/aviso";
import { requerirSesion } from "@/lib/sesion";

export const metadata = { title: "Inicio · Almacén Regional Oruro" };

const modulos = [
  { ruta: "/compras", titulo: "Compras", descripcion: "Registrar compras con factura y anularlas" },
  { ruta: "/pedidos", titulo: "Pedidos", descripcion: "Registrar los pedidos de los representantes y ver qué falta entregar" },
  { ruta: "/distribuciones", titulo: "Distribuciones", descripcion: "Entregar productos para atender los pedidos y anular entregas mal registradas" },
  { ruta: "/existencias", titulo: "Existencias", descripcion: "Stock actual, bajo mínimo y kardex de cada producto" },
  { ruta: "/productos", titulo: "Productos", descripcion: "Código, categoría, unidad, stock actual y stock mínimo" },
  { ruta: "/categorias", titulo: "Categorías", descripcion: "Grupos para ordenar los productos" },
  { ruta: "/unidades", titulo: "Unidades de medida", descripcion: "Cómo se cuenta cada producto" },
  { ruta: "/proveedores", titulo: "Proveedores", descripcion: "A quiénes se compra y qué productos ofrecen" },
  { ruta: "/centros-salud", titulo: "Centros de salud", descripcion: "Dónde trabajan los representantes" },
  { ruta: "/representantes", titulo: "Representantes", descripcion: "Quiénes hacen los pedidos de cada servicio" },
  { ruta: "/personal", titulo: "Personal", descripcion: "Registrar y mantener a quienes operan el sistema" },
  { ruta: "/sesiones", titulo: "Sesiones", descripcion: "Consultar quién ingresó y cuándo" },
] as const;

export default async function PaginaInicio({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { usuario } = await requerirSesion();
  const { aviso } = await searchParams;

  return (
    <section className="flex flex-col gap-6">
      {aviso === "contrasena" && <Aviso tipo="exito">Contraseña actualizada</Aviso>}
      <h1 className="text-2xl font-semibold">Bienvenido, {usuario.nombre}</h1>
      <ul className="grid gap-4 sm:grid-cols-2">
        {modulos.map((modulo) => (
          <li key={modulo.ruta}>
            <Link href={modulo.ruta} className="block rounded-lg border border-borde bg-white p-4 hover:border-marca">
              <span className="block font-semibold text-marca">{modulo.titulo}</span>
              <span className="text-sm text-gray-600">{modulo.descripcion}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
