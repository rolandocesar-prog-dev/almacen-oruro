import Link from "next/link";
import type { EnlaceDeAviso } from "@/lib/errores";

type Tipo = "exito" | "error" | "informacion";

const estilosPorTipo: Record<Tipo, string> = {
  exito: "border-exito/30 bg-exito-claro text-exito",
  error: "border-error/30 bg-error-claro text-error",
  informacion: "border-marca/30 bg-marca-claro text-marca",
};

/**
 * Mensaje destacado. Los errores usan role="alert" para que el lector de pantalla los lea
 * de inmediato; los demás, role="status".
 *
 * `enlace` (opcional) se muestra al final del mensaje; por ejemplo, "Ver y reactivar" cuando el
 * valor repetido pertenece a un registro inactivo (F-002, research C-04).
 */
export function Aviso({ tipo, enlace, children }: { tipo: Tipo; enlace?: EnlaceDeAviso; children: React.ReactNode }) {
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${estilosPorTipo[tipo]}`}>
      {children}
      {enlace && (
        <>
          {" "}
          <Link href={enlace.ruta} className="font-medium underline">
            {enlace.texto}
          </Link>
        </>
      )}
    </div>
  );
}
