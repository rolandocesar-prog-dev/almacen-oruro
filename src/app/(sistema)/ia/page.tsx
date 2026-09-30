import Link from "next/link";
import { requerirSesion } from "@/lib/sesion";

export const metadata = { title: "Inteligencia artificial · Almacén Regional Oruro" };

// Las tres pantallas del módulo de IA (F-007). Las dos primeras calculan en el momento y funcionan sin
// internet (FR-007); la tercera solo necesita conexión para **generar** un informe nuevo (FR-016).
const pantallas = [
  {
    ruta: "/ia/pronostico",
    titulo: "Pronóstico y reposición",
    descripcion: "Cuánto se va a consumir este mes de cada producto, según lo aprendido de su historial, y cuánto conviene reponer",
  },
  {
    ruta: "/ia/evaluacion",
    titulo: "Evaluación del pronóstico",
    descripcion: "Qué tan bien predice: se prueba con meses que el método no vio y se compara con dos métodos simples",
  },
  {
    ruta: "/ia/informes",
    titulo: "Informes IA",
    descripcion: "Un modelo de lenguaje redacta informes de compras y distribuciones con las cifras ya calculadas; necesita internet para generar uno nuevo",
  },
] as const;

export default async function PaginaIa() {
  await requerirSesion();

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-[28px]">Inteligencia artificial</h1>
        <p className="text-sm text-texto-suave">
          El sistema aprende del consumo de cada producto para predecir cuánto se va a usar este mes y cuánto conviene reponer, y comprueba
          qué tan bien predice. Ese aprendizaje ocurre dentro del propio sistema, con los datos del kardex y sin internet. El modelo de lenguaje
          solo redacta los informes a partir de cifras ya calculadas, que se muestran junto al texto.
        </p>
        <p className="mt-2 text-sm text-texto-suave">
          Por qué esto es inteligencia artificial y el procedimiento completo, paso a paso y con un ejemplo, están en{" "}
          <code className="rounded bg-marca-claro px-1">docs/metodo-pronostico.md</code>.
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
