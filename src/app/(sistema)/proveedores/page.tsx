import Link from "next/link";
import { EncabezadoListado } from "@/componentes/catalogos/encabezado-listado";
import { InsigniaActivo } from "@/componentes/catalogos/insignia-estado";
import { MensajeVacio } from "@/componentes/catalogos/mensaje-vacio";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaFiltroCatalogo, type FiltroCatalogo } from "@/esquemas/comunes";
import { requerirSesion } from "@/lib/sesion";
import { listarProveedores } from "@/servicios/catalogos/proveedores";
import { FiltrosProveedores } from "./filtros-proveedores";

export const metadata = { title: "Proveedores · Almacén Regional Oruro" };

export default async function PaginaProveedores({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  await requerirSesion();

  // Mismo esquema que el formulario de filtros; un valor inválido en la URL usa los valores por defecto.
  const validacion = esquemaFiltroCatalogo.safeParse(await searchParams);
  const filtro: FiltroCatalogo = validacion.success ? validacion.data : { estado: "activos" };
  const proveedores = await listarProveedores(filtro);

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoListado
        titulo="Proveedores"
        total={proveedores.length === 1 ? "1 proveedor" : `${proveedores.length} proveedores`}
        rutaAlta="/proveedores/nuevo"
        textoAlta="Registrar proveedor"
      />
      <FiltrosProveedores valores={filtro} />
      <Tabla
        encabezados={["Razón social", "NIT", "Contacto", "Teléfono", "Estado", ""]}
        vacio={
          proveedores.length === 0 ? (
            <MensajeVacio q={filtro.q} rutaLimpiar={`/proveedores?estado=${filtro.estado}`} sinRegistros="No hay proveedores para los filtros aplicados" />
          ) : undefined
        }
      >
        {proveedores.map((proveedor) => (
          <tr key={proveedor.id}>
            <Celda>{proveedor.razonSocial}</Celda>
            <Celda>{proveedor.nit}</Celda>
            <Celda>{proveedor.contactoNombre ?? "—"}</Celda>
            <Celda>{proveedor.telefono ?? "—"}</Celda>
            <Celda>
              <InsigniaActivo activo={proveedor.activo} />
            </Celda>
            <Celda>
              <Link href={`/proveedores/${proveedor.id}`} className="text-marca underline">
                Ver ficha
              </Link>
            </Celda>
          </tr>
        ))}
      </Tabla>
    </section>
  );
}
