import Link from "next/link";
import { requerirSesion } from "@/lib/sesion";

export const metadata = { title: "Inteligencia artificial · Almacén Regional Oruro" };

// Las tres pantallas del módulo de IA (F-007). Las dos primeras calculan en el momento y funcionan sin
// internet (FR-007); la tercera solo necesita conexión para **generar** un informe nuevo (FR-016).
const pantallas = [
  {
    ruta: "/ia/pronostico",
    titulo: "Pronóstico y reposición",
    descripcion: "Cuánto se va a consumir este mes de cada producto y cuánto conviene reponer",
  },
  {
    ruta: "/ia/evaluacion",
    titulo: "Evaluación del pronóstico",
    descripcion: "Cuánto se equivoca el método frente a dos métodos simples, con los números a la vista",
  },
  {
    ruta: "/ia/informes",
    titulo: "Informes IA",
    descripcion: "Informes de compras y distribuciones redactados a partir de los datos del período",
  },
] as const;

export default async function PaginaIa() {
  await requerirSesion();

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-[28px]">Inteligencia artificial</h1>
        <p className="text-sm text-texto-suave">
          El sistema calcula: la serie de consumo, el pronóstico, la evaluación y la reposición sugerida salen del kardex con un método
          escrito en el propio sistema, sin internet y sin guardar nada. El modelo de lenguaje solo redacta los informes a partir de datos ya
          calculados, que se muestran junto al texto.
        </p>
        <p className="mt-2 text-sm text-texto-suave">
          El procedimiento completo, paso a paso y con un ejemplo, está en{" "}
          <code className="rounded bg-gray-100 px-1">docs/metodo-pronostico.md</code>.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {pantallas.map((pantalla) => (
          <li key={pantalla.ruta}>
            <Link href={pantalla.ruta} className="block rounded-lg border border-borde bg-white p-4 hover:border-marca">
              <span className="block font-semibold text-marca">{pantalla.titulo}</span>
              <span className="text-sm text-texto-suave">{pantalla.descripcion}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
