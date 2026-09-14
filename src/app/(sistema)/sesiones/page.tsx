import Link from "next/link";
import { Aviso } from "@/componentes/ui/aviso";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaFiltroSesiones, type FiltroSesiones } from "@/esquemas/acceso";
import { formatearFechaHora, hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { listarSesiones, SESIONES_POR_PAGINA } from "@/servicios/acceso";
import { listarPersonal } from "@/servicios/personal";
import { FiltrosSesiones } from "./filtros-sesiones";

export const metadata = { title: "Historial de sesiones · Almacén Regional Oruro" };

export default async function PaginaSesiones({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  await requerirSesion();

  // Mismo esquema que el formulario de filtros; si la URL trae algo inválido, se usa el mes en curso.
  const validacion = esquemaFiltroSesiones.safeParse(await searchParams);
  const filtro: FiltroSesiones = validacion.success
    ? validacion.data
    : { desde: inicioDelMesEnCurso(), hasta: hoyEnLaPaz(), pagina: 1 };

  const [{ filas, total }, personas] = await Promise.all([
    listarSesiones({ usuarioId: filtro.usuario, desde: filtro.desde, hasta: filtro.hasta, pagina: filtro.pagina }),
    listarPersonal({ estado: "todos" }),
  ]);

  const paginas = Math.max(1, Math.ceil(total / SESIONES_POR_PAGINA));

  function enlacePagina(pagina: number) {
    const parametros = new URLSearchParams({ desde: filtro.desde, hasta: filtro.hasta, pagina: String(pagina) });
    if (filtro.usuario) parametros.set("usuario", String(filtro.usuario));
    return `/sesiones?${parametros.toString()}`;
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Historial de sesiones</h1>

      <FiltrosSesiones valores={filtro} personas={personas} />
      {!validacion.success && (
        <Aviso tipo="error">
          {validacion.error.issues[0]?.message ?? "Filtros inválidos"}. Se muestra el mes en curso.
        </Aviso>
      )}

      <p className="text-sm text-gray-600">
        {total} {total === 1 ? "sesión" : "sesiones"} en el período
      </p>

      <Tabla
        encabezados={["Persona", "Nombre de usuario", "Inicio", "Fin", "Estado"]}
        vacio={filas.length === 0 ? "No hay sesiones para los filtros aplicados" : undefined}
      >
        {filas.map((fila) => (
          <tr key={fila.id}>
            <Celda>{fila.persona}</Celda>
            <Celda>{fila.nombreUsuario}</Celda>
            <Celda>{formatearFechaHora(fila.inicio)}</Celda>
            <Celda>{fila.fin ? formatearFechaHora(fila.fin) : "—"}</Celda>
            <Celda>{fila.estado}</Celda>
          </tr>
        ))}
      </Tabla>

      {paginas > 1 && (
        <nav aria-label="Páginas" className="flex items-center gap-3 text-sm">
          {filtro.pagina > 1 && (
            <Link href={enlacePagina(filtro.pagina - 1)} className="text-marca underline">
              ← Anterior
            </Link>
          )}
          <span>
            Página {filtro.pagina} de {paginas}
          </span>
          {filtro.pagina < paginas && (
            <Link href={enlacePagina(filtro.pagina + 1)} className="text-marca underline">
              Siguiente →
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
