import { redirect } from "next/navigation";
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
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-borde bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-marca">Almacén Regional Oruro</h1>
          <p className="text-sm text-gray-600">Ingresa con tu usuario y contraseña</p>
        </div>
        {expirada === "1" && <Aviso tipo="informacion">Tu sesión expiró. Ingresa nuevamente</Aviso>}
        <FormularioIngreso />
      </div>
    </main>
  );
}
