import Link from "next/link";
import { mesAnteriorCompleto } from "@/lib/fechas";
import { requerirSesion } from "@/lib/sesion";
import { FormularioInforme } from "./formulario-informe";

export const metadata = { title: "Nuevo informe IA · Almacén Regional Oruro" };

export default async function PaginaNuevoInforme() {
  await requerirSesion();
  const { desde, hasta } = mesAnteriorCompleto();

  return (
    <section className="flex flex-col gap-4">
      <Link href="/ia/informes" className="text-sm text-marca underline">
        ← Volver a informes
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Nuevo informe IA</h1>
        <p className="text-sm text-gray-600">
          El sistema calcula los datos del período y un modelo de lenguaje los redacta en español. El texto se guarda junto a la tabla de datos
          que lo originó, para verificar cada cifra.
        </p>
      </div>
      <FormularioInforme desde={desde} hasta={hasta} />
    </section>
  );
}
