type Variante = "activo" | "inactivo" | "bajoMinimo";

// Texto oscuro sobre fondo claro: contraste mayor a 4.5:1 en las tres variantes.
const estilos: Record<Variante, { texto: string; clases: string }> = {
  activo: { texto: "Activo", clases: "bg-exito-claro text-exito" },
  inactivo: { texto: "Inactivo", clases: "bg-borde text-texto" },
  bajoMinimo: { texto: "Bajo mínimo", clases: "bg-aviso-claro text-aviso" },
};

/** Insignia de estado de un registro, con texto (no solo color) para que se entienda sin ver colores. */
export function InsigniaEstado({ variante }: { variante: Variante }) {
  const { texto, clases } = estilos[variante];
  return <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${clases}`}>{texto}</span>;
}

/** Atajo para la insignia de activo o inactivo. */
export function InsigniaActivo({ activo }: { activo: boolean }) {
  return <InsigniaEstado variante={activo ? "activo" : "inactivo"} />;
}
