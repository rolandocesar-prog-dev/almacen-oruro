type Tipo = "exito" | "error" | "informacion";

const estilosPorTipo: Record<Tipo, string> = {
  exito: "border-exito bg-green-50 text-exito",
  error: "border-error bg-red-50 text-error",
  informacion: "border-marca bg-blue-50 text-marca",
};

/**
 * Mensaje destacado. Los errores usan role="alert" para que el lector de pantalla los lea
 * de inmediato; los demás, role="status".
 */
export function Aviso({ tipo, children }: { tipo: Tipo; children: React.ReactNode }) {
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`rounded-md border-l-4 px-4 py-3 text-sm ${estilosPorTipo[tipo]}`}>
      {children}
    </div>
  );
}
