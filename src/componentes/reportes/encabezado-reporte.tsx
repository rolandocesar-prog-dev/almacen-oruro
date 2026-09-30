import { LogoCns } from "@/componentes/marca/logo-cns";
import { formatearFechaHora } from "@/lib/fechas";

/**
 * Encabezado común de los cinco reportes, en pantalla y en la hoja impresa (FR-006): qué sistema, qué
 * reporte, con qué filtros, cuándo se emitió y quién lo emitió. Sin estos datos, una hoja suelta no dice de
 * qué período es (SC-006, SC-007). Lleva el logo de la CNS (I-61): impreso en blanco y negro se sigue
 * leyendo, porque el nombre de la institución va también en texto.
 *
 * Ya no lleva el aviso de datos simulados: lo pidió Raymond después de la entrega (I-75).
 */
export function EncabezadoReporte({
  titulo,
  filtros,
  emitidoPor,
}: {
  titulo: string;
  filtros: string;
  emitidoPor: string;
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
      </div>
    </header>
  );
}
