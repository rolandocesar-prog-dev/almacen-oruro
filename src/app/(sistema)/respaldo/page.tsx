import { Aviso } from "@/componentes/ui/aviso";
import { requerirSesion } from "@/lib/sesion";
import { BotonRespaldo } from "./boton-respaldo";

export const metadata = { title: "Respaldo · Almacén Regional Oruro" };

/**
 * Respaldo de la base (F-009, Historia 4). Solo genera y descarga: restaurar reemplaza todos los datos y
 * se hace fuera del sistema, con la guía de instalación (D-24, FR-022).
 */
export default async function PaginaRespaldo() {
  await requerirSesion();

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold sm:text-[28px]">Respaldo de la base de datos</h1>
        <p className="text-texto-suave">Descarga una copia de todos los datos del sistema, tal como están en este momento.</p>
      </header>

      {/* FR-019: el archivo trae datos personales; la advertencia va antes del botón. */}
      <Aviso tipo="informacion">
        El archivo contiene datos personales y las contraseñas cifradas del personal. Guárdalo en un lugar seguro, por ejemplo
        una memoria USB que no quede en el almacén.
      </Aviso>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-lg border border-borde bg-white p-5">
          <h2 className="font-semibold">Qué incluye</h2>
          <p className="text-sm text-texto-suave">
            Todos los datos: catálogos, compras, pedidos, distribuciones, kardex, personal, sesiones, informes IA y la
            configuración del sistema, incluida la marca de datos simulados.
          </p>
        </div>
        {/* FR-018: sin el código ni los secretos de configuración. */}
        <div className="flex flex-col gap-2 rounded-lg border border-borde bg-white p-5">
          <h2 className="font-semibold">Qué no incluye</h2>
          <p className="text-sm text-texto-suave">
            El código del sistema, que ya está en su repositorio, ni el archivo de configuración con las claves de acceso.
          </p>
        </div>
      </div>

      <BotonRespaldo />

      <p className="text-sm text-texto-suave">
        Para restaurar un respaldo, sigue la guía de instalación, sección «Restaurar un respaldo». La restauración reemplaza todos
        los datos y no se hace desde el sistema.
      </p>
    </section>
  );
}
