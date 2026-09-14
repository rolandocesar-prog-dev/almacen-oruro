import Link from "next/link";
import { EncabezadoListado } from "@/componentes/catalogos/encabezado-listado";
import { InsigniaActivo } from "@/componentes/catalogos/insignia-estado";
import { MensajeVacio } from "@/componentes/catalogos/mensaje-vacio";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaFiltroCatalogo, type FiltroCatalogo } from "@/esquemas/comunes";
import { requerirSesion } from "@/lib/sesion";
import { listarCentrosSalud } from "@/servicios/catalogos/centros-salud";
import { FiltrosCentrosSalud } from "./filtros-centros-salud";

export const metadata = { title: "Centros de salud · Almacén Regional Oruro" };

export default async function PaginaCentrosSalud({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  await requerirSesion();

  // Mismo esquema que el formulario de filtros; un valor inválido en la URL usa los valores por defecto.
  const validacion = esquemaFiltroCatalogo.safeParse(await searchParams);
  const filtro: FiltroCatalogo = validacion.success ? validacion.data : { estado: "activos" };
  const centros = await listarCentrosSalud(filtro);

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoListado
        titulo="Centros de salud"
        total={centros.length === 1 ? "1 centro de salud" : `${centros.length} centros de salud`}
        rutaAlta="/centros-salud/nuevo"
        textoAlta="Registrar centro de salud"
      />
      <FiltrosCentrosSalud valores={filtro} />
      <Tabla
        encabezados={["Nombre", "Teléfono", "Representantes activos", "Estado", ""]}
        vacio={
          centros.length === 0 ? (
            <MensajeVacio q={filtro.q} rutaLimpiar={`/centros-salud?estado=${filtro.estado}`} sinRegistros="No hay centros de salud para los filtros aplicados" />
          ) : undefined
        }
      >
        {centros.map((centro) => (
          <tr key={centro.id}>
            <Celda>{centro.nombre}</Celda>
            <Celda>{centro.telefono ?? "—"}</Celda>
            <Celda>{centro.representantesActivos}</Celda>
            <Celda>
              <InsigniaActivo activo={centro.activo} />
            </Celda>
            <Celda>
              <Link href={`/centros-salud/${centro.id}`} className="text-marca underline">
                Ver ficha
              </Link>
            </Celda>
          </tr>
        ))}
      </Tabla>
    </section>
  );
}
