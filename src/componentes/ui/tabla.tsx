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
  vacio?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-borde bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-fondo">
          <tr>
            {encabezados.map((encabezado) => (
              <th key={encabezado} scope="col" className="whitespace-nowrap px-4 py-2 font-semibold">
                {encabezado}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-borde">{children}</tbody>
      </table>
      {vacio && <p className="px-4 py-6 text-center text-gray-600">{vacio}</p>}
    </div>
  );
}

/** Celda de una fila de la tabla. */
export function Celda({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-4 py-2 ${className}`}>{children}</td>;
}
