/**
 * Tabla de un reporte. A diferencia de `componentes/ui/tabla.tsx`, NO va dentro de un contenedor con
 * desplazamiento: ese `overflow` impide que el navegador repita el `<thead>` en cada hoja al imprimir
 * (Historia 6 · E2, research E-06). En pantallas chicas la tabla se ajusta con texto más pequeño.
 */
export function TablaReporte({
  encabezados,
  children,
  vacio,
}: {
  encabezados: string[];
  children: React.ReactNode;
  /** Mensaje cuando no hay filas; la página lo pasa con `filas.length === 0 ? SIN_RESULTADOS : undefined`. */
  vacio?: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="border-b border-texto">
          <tr>
            {encabezados.map((encabezado) => (
              <th key={encabezado} scope="col" className="px-2 py-2 font-semibold">
                {encabezado}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-borde">{children}</tbody>
      </table>
      {vacio && <p className="px-2 py-6 text-center text-texto-suave">{vacio}</p>}
    </div>
  );
}

/** Mensaje común cuando los filtros no devuelven nada (regla de resultado vacío de la especificación). */
export const SIN_RESULTADOS = "Sin resultados para los filtros aplicados";

/** Celda de una fila del reporte. */
export function CeldaReporte({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-1.5 align-top ${className}`}>{children}</td>;
}
