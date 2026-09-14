import Link from "next/link";
import { requerirSesion } from "@/lib/sesion";

export const metadata = { title: "Inicio · Almacén Regional Oruro" };

const modulos = [
  { ruta: "/personal", titulo: "Personal", descripcion: "Registrar y mantener a quienes operan el sistema" },
  { ruta: "/sesiones", titulo: "Sesiones", descripcion: "Consultar quién ingresó y cuándo" },
] as const;

export default async function PaginaInicio() {
  const { usuario } = await requerirSesion();

  return (
    <section className="flex flex-col gap-6">
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
