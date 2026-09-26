/**
 * Estado de un documento con texto y color: REGISTRADA (vigente) o ANULADA. Compras y distribuciones
 * comparten el mismo estado de documento, así que usan la misma insignia (I-28).
 */
export function InsigniaDocumento({ estado }: { estado: "REGISTRADA" | "ANULADA" }) {
  const clases = estado === "REGISTRADA" ? "bg-exito-claro text-exito" : "bg-error-claro text-error";
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${clases}`}>
      {estado === "REGISTRADA" ? "Registrada" : "Anulada"}
    </span>
  );
}
