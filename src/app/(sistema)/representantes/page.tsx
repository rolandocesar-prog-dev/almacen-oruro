import Link from "next/link";
import { EncabezadoListado } from "@/componentes/catalogos/encabezado-listado";
import { InsigniaActivo } from "@/componentes/catalogos/insignia-estado";
import { MensajeVacio } from "@/componentes/catalogos/mensaje-vacio";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaFiltroCatalogo, type FiltroCatalogo } from "@/esquemas/comunes";
import { requerirSesion } from "@/lib/sesion";
import { listarRepresentantes } from "@/servicios/catalogos/representantes";
import { FiltrosRepresentantes } from "./filtros-representantes";

export const metadata = { title: "Representantes · Almacén Regional Oruro" };

export default async function PaginaRepresentantes({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  await requerirSesion();

  // Mismo esquema que el formulario de filtros; un valor inválido en la URL usa los valores por defecto.
  const validacion = esquemaFiltroCatalogo.safeParse(await searchParams);
  const filtro: FiltroCatalogo = validacion.success ? validacion.data : { estado: "activos" };
  const representantes = await listarRepresentantes(filtro);

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoListado
        titulo="Representantes"
        total={representantes.length === 1 ? "1 representante" : `${representantes.length} representantes`}
        rutaAlta="/representantes/nuevo"
        textoAlta="Registrar representante"
      />
      <FiltrosRepresentantes valores={filtro} />
      <Tabla
        encabezados={["Nombre completo", "CI", "Servicio", "Centro de salud", "Estado", ""]}
        vacio={
          representantes.length === 0 ? (
            <MensajeVacio q={filtro.q} rutaLimpiar={`/representantes?estado=${filtro.estado}`} sinRegistros="No hay representantes para los filtros aplicados" />
          ) : undefined
        }
      >
        {representantes.map((representante) => (
          <tr key={representante.id}>
            <Celda>{representante.nombreCompleto}</Celda>
            <Celda>{representante.ci}</Celda>
            <Celda>{representante.servicio}</Celda>
            <Celda>{representante.centroSalud}</Celda>
            <Celda>
              <InsigniaActivo activo={representante.activo} />
            </Celda>
            <Celda>
              <Link href={`/representantes/${representante.id}`} className="text-marca underline">
                Ver ficha
              </Link>
            </Celda>
          </tr>
        ))}
      </Tabla>
    </section>
  );
}
