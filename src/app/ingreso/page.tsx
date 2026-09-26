import { redirect } from "next/navigation";
import { LogoCns } from "@/componentes/marca/logo-cns";
import { Aviso } from "@/componentes/ui/aviso";
import { obtenerSesionOpcional } from "@/lib/sesion";
import { FormularioIngreso } from "./formulario-ingreso";

export const metadata = { title: "Ingresar · Almacén Regional Oruro" };

export default async function PaginaIngreso({ searchParams }: { searchParams: Promise<{ expirada?: string }> }) {
  // Quien ya tiene sesión vigente no necesita volver a ingresar (Historia 1, escenario 7).
  // Una cookie vencida se trata como sesión inexistente: no se borra aquí porque Next.js no
  // permite modificar cookies al mostrar una página; el siguiente ingreso la sobrescribe.
  if (await obtenerSesionOpcional()) {
    redirect("/");
  }

  const { expirada } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Identidad de la CNS: arriba en el celular, a la izquierda en escritorio (I-60). */}
      <section className="franjas-cns flex flex-col gap-4 bg-marca px-6 py-8 text-white sm:px-10 lg:w-[42%] lg:max-w-xl lg:justify-center lg:gap-7 lg:px-16">
        <LogoCns tamano={150} redondo className="size-20 ring-4 ring-white/20 lg:size-[150px] lg:ring-[6px]" />
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-marca-claro lg:text-sm">Caja Nacional de Salud</p>
          <p className="text-2xl font-bold leading-tight lg:text-[40px]">Almacén Regional Oruro</p>
          <p className="max-w-sm text-sm text-marca-claro lg:text-base">Control de compra, almacenaje y distribución de productos de limpieza</p>
        </div>
      </section>

      <main className="flex flex-1 items-start justify-center px-4 py-8 lg:items-center">
        <div className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-borde bg-white p-6 shadow-lg shadow-marca/5 sm:p-9">
          <div>
            <h1 className="text-2xl font-bold">Ingresar</h1>
            <p className="text-sm text-texto-suave">Ingresa con tu usuario y contraseña</p>
          </div>
          {expirada === "1" && <Aviso tipo="informacion">Tu sesión expiró. Ingresa nuevamente</Aviso>}
          <FormularioIngreso />
        </div>
      </main>
    </div>
  );
}
