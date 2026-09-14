import { redirect } from "next/navigation";
import { obtenerSesionOpcional } from "@/lib/sesion";
import { FormularioIngreso } from "./formulario-ingreso";

export const metadata = { title: "Ingresar · Almacén Regional Oruro" };

export default async function PaginaIngreso() {
  // Quien ya tiene sesión vigente no necesita volver a ingresar (Historia 1, escenario 7).
  if (await obtenerSesionOpcional()) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-lg border border-borde bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-marca">Almacén Regional Oruro</h1>
        <p className="mb-6 text-sm text-gray-600">Ingresa con tu usuario y contraseña</p>
        <FormularioIngreso />
      </div>
    </main>
  );
}
