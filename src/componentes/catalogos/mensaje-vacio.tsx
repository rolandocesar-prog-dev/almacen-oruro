import Link from "next/link";

/**
 * Mensaje de un listado sin filas. Si se estaba buscando, lo dice y ofrece limpiar la búsqueda
 * conservando el estado elegido (Historia 5, escenario 3).
 */
export function MensajeVacio({ q, rutaLimpiar, sinRegistros }: { q?: string; rutaLimpiar: string; sinRegistros: string }) {
  if (!q) return <>{sinRegistros}</>;
  return (
    <>
      No hay resultados para &apos;{q}&apos;.{" "}
      <Link href={rutaLimpiar} className="text-marca underline">
        Limpiar búsqueda
      </Link>
    </>
  );
}
