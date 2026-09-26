/**
 * Tabla con desplazamiento horizontal propio: en pantallas chicas se desliza la tabla,
 * no la página entera.
 */
export function Tabla({
  encabezados,
  children,
  vacio,
}: {
  encabezados: string[];
  children: React.ReactNode;
  /** Mensaje cuando no hay filas; puede incluir un enlace, como "Limpiar búsqueda". */
  vacio?: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-borde bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-marca-claro/60">
          <tr>
            {encabezados.map((encabezado) => (
              <th key={encabezado} scope="col" className="whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-wide text-texto-suave">
                {encabezado}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-borde [&>tr]:transition-colors [&>tr:hover]:bg-fondo">{children}</tbody>
      </table>
      {vacio && <p className="px-4 py-6 text-center text-texto-suave">{vacio}</p>}
    </div>
  );
}

/** Celda de una fila de la tabla. */
export function Celda({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-3 py-3 ${className}`}>{children}</td>;
}
