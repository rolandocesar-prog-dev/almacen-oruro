import Link from "next/link";
import { notFound } from "next/navigation";
import { CambioDeEstado } from "@/componentes/catalogos/cambio-de-estado";
import { EnlaceEditar } from "@/componentes/catalogos/encabezado-listado";
import { InsigniaActivo } from "@/componentes/catalogos/insignia-estado";
import { Aviso } from "@/componentes/ui/aviso";
import { Dato } from "@/componentes/ui/dato";
import { esquemaAvisoFicha } from "@/esquemas/comunes";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerCentroSalud, obtenerRepresentantesDelCentro } from "@/servicios/catalogos/centros-salud";
import { desactivarCentroSaludAccion, reactivarCentroSaludAccion } from "../acciones";

export const metadata = { title: "Ficha de centro de salud · Almacén Regional Oruro" };

const avisos = {
  registrado: "Centro de salud registrado.",
  modificado: "Datos actualizados.",
} as const;

export default async function PaginaFichaCentroSalud({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const { aviso } = esquemaAvisoFicha.parse(await searchParams);
  const centro = id ? await obtenerCentroSalud(id) : null;
  if (!centro) notFound();
  // FR-007: un centro tiene como máximo un representante activo (RN-18) y conserva a los anteriores.
  const { activo, anteriores } = await obtenerRepresentantesDelCentro(centro.id);

  return (
    <section className="flex flex-col gap-4">
      <Link href="/centros-salud" className="text-sm text-marca underline">
        ← Volver al listado
      </Link>
      {aviso && <Aviso tipo="exito">{avisos[aviso]}</Aviso>}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold sm:text-[28px]">{centro.nombre}</h1>
        <InsigniaActivo activo={centro.activo} />
      </div>

      <dl className="grid gap-4 rounded-lg border border-borde bg-white p-6 sm:grid-cols-2">
        <Dato etiqueta="Teléfono" valor={centro.telefono} />
        <Dato etiqueta="Dirección" valor={centro.direccion} />
        <Dato
          etiqueta="Representante"
          valor={
            activo ? (
              <Link href={`/representantes/${activo.id}`} className="text-marca underline">
                {activo.nombreCompleto}
              </Link>
            ) : (
              "Sin representante activo"
            )
          }
        />
      </dl>

      {/* Sin fechas (aclaración del 26/09): cuándo pidió cada persona ya se ve en sus pedidos. */}
      <section aria-labelledby="representantes-anteriores" className="flex flex-col gap-2 rounded-lg border border-borde bg-white p-6">
        <h2 id="representantes-anteriores" className="text-lg font-semibold">
          Representantes anteriores
        </h2>
        {anteriores.length === 0 ? (
          <p className="text-sm text-texto-suave">Ninguno</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {anteriores.map((representante) => (
              <li key={representante.id}>
                <Link href={`/representantes/${representante.id}`} className="text-marca underline">
                  {representante.nombreCompleto}
                </Link>{" "}
                · CI {representante.ci}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-start gap-3">
        <EnlaceEditar ruta={`/centros-salud/${centro.id}/editar`} />
        <CambioDeEstado
          activo={centro.activo}
          confirmacionDesactivar={`¿Desactivar el centro de salud '${centro.nombre}'?`}
          desactivar={desactivarCentroSaludAccion.bind(null, centro.id)}
          reactivar={reactivarCentroSaludAccion.bind(null, centro.id)}
        />
      </div>
    </section>
  );
}
