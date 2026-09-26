import type { EstadoPedido } from "@/generado/prisma/client";

// Texto oscuro sobre fondo claro: contraste mayor a 4.5:1 en los cuatro estados. El texto va siempre,
// para que el estado se entienda sin distinguir colores.
const estilos: Record<EstadoPedido, { texto: string; clases: string }> = {
  PENDIENTE: { texto: "Pendiente", clases: "bg-aviso-claro text-aviso" },
  PARCIAL: { texto: "Parcial", clases: "bg-blue-100 text-blue-900" },
  ATENDIDO: { texto: "Atendido", clases: "bg-exito-claro text-exito" },
  ANULADO: { texto: "Anulado", clases: "bg-error-claro text-error" },
};

/** Estado de un pedido: PENDIENTE, PARCIAL o ATENDIDO los calcula el sistema; ANULADO lo pone el encargado. */
export function InsigniaPedido({ estado }: { estado: EstadoPedido }) {
  const { texto, clases } = estilos[estado];
  return <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${clases}`}>{texto}</span>;
}
