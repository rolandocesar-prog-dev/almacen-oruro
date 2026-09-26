/** Par etiqueta-valor de una ficha, dentro de un <dl>. Un valor vacío se muestra como "—". */
export function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-texto-suave">{etiqueta}</dt>
      <dd className="text-base">{valor === null || valor === undefined || valor === "" ? "—" : valor}</dd>
    </div>
  );
}
