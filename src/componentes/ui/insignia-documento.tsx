/**
 * Estado de un documento con texto y color: REGISTRADA (vigente) o ANULADA. Compras y distribuciones
 * comparten el mismo estado de documento, así que usan la misma insignia (I-28).
 */
export function InsigniaDocumento({ estado }: { estado: "REGISTRADA" | "ANULADA" }) {
  const clases = estado === "REGISTRADA" ? "bg-green-100 text-exito" : "bg-red-100 text-error";
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${clases}`}>
      {estado === "REGISTRADA" ? "Registrada" : "Anulada"}
    </span>
  );
}
