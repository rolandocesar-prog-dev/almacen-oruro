import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/componentes/ui/aviso";
import { formatearFechaHora } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { obtenerPersonal } from "@/servicios/personal";

export const metadata = { title: "Ficha de personal · Almacén Regional Oruro" };

const avisos: Record<string, string> = {
  registrado: "Persona registrada. Ya puede ingresar con su usuario y contraseña.",
  modificado: "Datos actualizados.",
};

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-600">{etiqueta}</dt>
      <dd className="text-base">{valor}</dd>
    </div>
  );
}

export default async function PaginaFichaPersonal({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  await requerirSesion();
  const { id } = await params;
  const { aviso } = await searchParams;

  const idNumerico = Number(id);
  const persona = Number.isInteger(idNumerico) ? await obtenerPersonal(idNumerico) : null;
  if (!persona) notFound();

  return (
    <section className="flex flex-col gap-4">
      <Link href="/personal" className="text-sm text-marca underline">
        ← Volver al listado
      </Link>
      {aviso && avisos[aviso] && <Aviso tipo="exito">{avisos[aviso]}</Aviso>}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">
          {persona.nombre} {persona.apellido}
        </h1>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${persona.activo ? "bg-green-100 text-exito" : "bg-gray-200 text-gray-700"}`}>
          {persona.activo ? "Activo" : "Inactivo"}
        </span>
      </div>

      {/* La contraseña no aparece en ningún lugar de la ficha (Historia 3, escenario 6). */}
      <dl className="grid gap-4 rounded-lg border border-borde bg-white p-6 sm:grid-cols-2">
        <Dato etiqueta="Cargo" valor={persona.cargo} />
        <Dato etiqueta="Nombre de usuario" valor={persona.nombreUsuario} />
        <Dato etiqueta="Teléfono" valor={persona.telefono ?? "—"} />
        <Dato etiqueta="Dirección" valor={persona.direccion ?? "—"} />
        <Dato etiqueta="Registrado el" valor={formatearFechaHora(persona.creadoEn)} />
      </dl>
    </section>
  );
}
