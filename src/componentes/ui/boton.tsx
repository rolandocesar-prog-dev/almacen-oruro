import type { ButtonHTMLAttributes } from "react";

type Variante = "principal" | "secundario" | "peligro";

const estilosPorVariante: Record<Variante, string> = {
  principal: "bg-marca text-white hover:bg-marca-oscuro",
  secundario: "bg-white text-marca border border-marca hover:bg-fondo",
  peligro: "bg-error text-white hover:opacity-90",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante };

/** Botón con tres variantes visuales. Deshabilitado se ve atenuado. */
export function Boton({ variante = "principal", className = "", type = "button", ...resto }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${estilosPorVariante[variante]} ${className}`}
      {...resto}
    />
  );
}
