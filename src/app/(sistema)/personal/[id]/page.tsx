import Link from "next/link";
import { notFound } from "next/navigation";
import { CambioDeEstado } from "@/componentes/catalogos/cambio-de-estado";
import { InsigniaActivo } from "@/componentes/catalogos/insignia-estado";
import { Aviso } from "@/componentes/ui/aviso";
import { formatearFechaHora } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { obtenerPersonal } from "@/servicios/personal";
import { desactivarPersonalAccion, reactivarPersonalAccion, restablecerContrasenaAccion } from "../acciones";
import { RestablecerContrasena } from "./restablecer-contrasena";

export const metadata = { title: "Ficha de personal · Almacén Regional Oruro" };

const avisos: Record<string, string> = {
  registrado: "Persona registrada. Ya puede ingresar con su usuario y contraseña.",
  modificado: "Datos actualizados.",
};

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-texto-suave">{etiqueta}</dt>
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
  const { usuario } = await requerirSesion();
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
        <h1 className="text-2xl font-bold sm:text-[28px]">
          {persona.nombre} {persona.apellido}
        </h1>
        <InsigniaActivo activo={persona.activo} />
      </div>

      {/* La contraseña no aparece en ningún lugar de la ficha (Historia 3, escenario 6). */}
      <dl className="grid gap-4 rounded-lg border border-borde bg-white p-6 sm:grid-cols-2">
        <Dato etiqueta="Cargo" valor={persona.cargo} />
        <Dato etiqueta="Nombre de usuario" valor={persona.nombreUsuario} />
        <Dato etiqueta="Teléfono" valor={persona.telefono ?? "—"} />
        <Dato etiqueta="Dirección" valor={persona.direccion ?? "—"} />
        <Dato etiqueta="Registrado el" valor={formatearFechaHora(persona.creadoEn)} />
      </dl>

      <div className="flex flex-wrap items-start gap-3">
        <Link href={`/personal/${persona.id}/editar`} className="rounded-md border border-marca bg-white px-4 py-2 text-sm font-medium text-marca hover:bg-fondo">
          Editar
        </Link>
        {/* Nadie puede desactivarse a sí mismo (RN-04): el botón ni siquiera se muestra. */}
        <CambioDeEstado
          activo={persona.activo}
          ocultarDesactivar={persona.id === usuario.id}
          confirmacionDesactivar={`¿Desactivar a ${persona.nombre} ${persona.apellido}? Ya no podrá ingresar y se cerrarán sus sesiones abiertas.`}
          desactivar={desactivarPersonalAccion.bind(null, persona.id)}
          reactivar={reactivarPersonalAccion.bind(null, persona.id)}
        />
      </div>

      {/* Nadie restablece su propia contraseña: la cambia indicando la actual (Historia 5, escenario 6). */}
      {persona.id === usuario.id ? (
        <p className="text-sm">
          Para cambiar tu contraseña usa{" "}
          <Link href="/cambiar-contrasena" className="text-marca underline">
            Cambiar mi contraseña
          </Link>
          .
        </p>
      ) : (
        <RestablecerContrasena accion={restablecerContrasenaAccion.bind(null, persona.id)} />
      )}
    </section>
  );
}
