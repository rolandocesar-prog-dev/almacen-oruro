/** Estado de una compra con texto y color: REGISTRADA (vigente) o ANULADA. */
export function InsigniaCompra({ estado }: { estado: "REGISTRADA" | "ANULADA" }) {
  const clases = estado === "REGISTRADA" ? "bg-green-100 text-exito" : "bg-red-100 text-error";
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${clases}`}>
      {estado === "REGISTRADA" ? "Registrada" : "Anulada"}
    </span>
  );
}
