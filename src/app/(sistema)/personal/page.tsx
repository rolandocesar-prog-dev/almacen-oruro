import Link from "next/link";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { requerirSesion } from "@/lib/sesion";
import { listarPersonal } from "@/servicios/personal";

export const metadata = { title: "Personal · Almacén Regional Oruro" };

export default async function PaginaPersonal() {
  await requerirSesion();
  const personas = await listarPersonal({ estado: "activos" });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Personal</h1>
        <Link href="/personal/nuevo" className="rounded-md bg-marca px-4 py-2 text-sm font-medium text-white hover:bg-marca-oscuro">
          Registrar personal
        </Link>
      </div>

      <Tabla
        encabezados={["Nombre", "Cargo", "Nombre de usuario", "Estado", ""]}
        vacio={personas.length === 0 ? "No hay personal para mostrar" : undefined}
      >
        {personas.map((persona) => (
          <tr key={persona.id}>
            <Celda>{persona.nombreCompleto}</Celda>
            <Celda>{persona.cargo}</Celda>
            <Celda>{persona.nombreUsuario}</Celda>
            <Celda>{persona.activo ? "Activo" : "Inactivo"}</Celda>
            <Celda>
              <Link href={`/personal/${persona.id}`} className="text-marca underline">
                Ver ficha
              </Link>
            </Celda>
          </tr>
        ))}
      </Tabla>
    </section>
  );
}
