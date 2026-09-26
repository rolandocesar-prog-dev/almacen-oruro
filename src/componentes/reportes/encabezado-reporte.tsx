import { LogoCns } from "@/componentes/marca/logo-cns";
import { formatearFechaHora } from "@/lib/fechas";

/**
 * Encabezado común de los cinco reportes, en pantalla y en la hoja impresa (FR-006): qué sistema, qué
 * reporte, con qué filtros, cuándo se emitió y quién lo emitió. Sin estos datos, una hoja suelta no dice de
 * qué período es (SC-006, SC-007). Lleva el logo de la CNS (I-61): impreso en blanco y negro se sigue
 * leyendo, porque el nombre de la institución va también en texto.
 */
export function EncabezadoReporte({
  titulo,
  filtros,
  emitidoPor,
  demostracion,
}: {
  titulo: string;
  filtros: string;
  emitidoPor: string;
  demostracion: boolean;
}) {
  return (
    <header className="flex items-center gap-5 border-b-2 border-texto pb-3">
      <LogoCns tamano={72} />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-marca print:text-texto">Caja Nacional de Salud · Almacén Regional Oruro</p>
        <h1 className="text-2xl font-bold">{titulo}</h1>
        <p className="text-sm">{filtros}</p>
        <p className="text-sm text-texto-suave">
          Emitido el {formatearFechaHora(new Date())} por {emitidoPor}
        </p>
        {/* FR-007: la marca vale para toda la base y la pone el generador de F-007 (D-07). */}
        {demostracion && (
          <p className="mt-1 self-start border-2 border-aviso px-3 py-1 text-sm font-semibold text-aviso">
            Datos simulados con fines de demostración
          </p>
        )}
      </div>
    </header>
  );
}
