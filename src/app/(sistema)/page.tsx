import Link from "next/link";
import { gruposMenu } from "@/componentes/navegacion/opciones";
import { Aviso } from "@/componentes/ui/aviso";
import { Icono } from "@/componentes/ui/icono";
import { requerirSesion } from "@/lib/sesion";

export const metadata = { title: "Inicio · Almacén Regional Oruro" };

export default async function PaginaInicio({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { usuario } = await requerirSesion();
  const { aviso } = await searchParams;

  return (
    <section className="flex flex-col gap-7">
      {aviso === "contrasena" && <Aviso tipo="exito">Contraseña actualizada</Aviso>}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold sm:text-[28px]">Bienvenido, {usuario.nombre}</h1>
        <p className="text-texto-suave">Elige un módulo para empezar</p>
      </header>

      {/* Las mismas secciones y módulos del menú lateral (opciones.ts). */}
      {gruposMenu.map((grupo, indice) => (
        <section key={grupo.titulo} aria-labelledby={`grupo-${indice}`} className="flex flex-col gap-3">
          <h2 id={`grupo-${indice}`} className="text-[13px] font-semibold uppercase tracking-wider text-texto-suave">
            {grupo.titulo}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {grupo.opciones.map((opcion) => (
              <li key={opcion.ruta}>
                <Link
                  href={opcion.ruta}
                  className="flex h-full items-start gap-3.5 rounded-xl border border-borde bg-white p-4 transition hover:border-marca hover:shadow-sm"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-marca-claro text-marca">
                    <Icono nombre={opcion.icono} />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="font-semibold text-marca">{opcion.texto}</span>
                    <span className="text-sm text-texto-suave">{opcion.descripcion}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
