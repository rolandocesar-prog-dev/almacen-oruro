/**
 * Íconos de línea propios (24×24, trazo de 1,8): uno por módulo del menú y unos pocos de acción.
 * Se dibujan aquí para no sumar una librería de íconos al proyecto (I-58). Son decorativos: el texto
 * que los acompaña es el que se lee, por eso llevan aria-hidden.
 */
const trazos = {
  inicio: "M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10",
  compras: "M3 4h2l2.4 11h11l2-8H6.2M9 20.5h.01M18 20.5h.01",
  pedidos: "M9 3h6v3H9zM7 4.5H5V21h14V4.5h-2M8 11h8M8 15h6",
  distribuciones: "M2 6h12v10H2zM14 9h4l4 4v3h-8M6 19.5h.01M18 19.5h.01M6 16v1M18 16v1",
  existencias: "M4 7.5L12 3l8 4.5v9L12 21l-8-4.5zM4 7.5l8 4.5 8-4.5M12 12v9",
  reportes: "M5 20V11M11 20V4M17 20v-6M3 20h18",
  ia: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  productos: "M3 12V4h8l10 10-8 8zM7.5 7.5h.01",
  categorias: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  unidades: "M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2",
  proveedores: "M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6",
  centrosSalud: "M4 4h16v16H4zM12 8v8M8 12h8",
  representantes: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a7 7 0 0 1 14 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6",
  personal: "M4 5h16v14H4zM9 10.5h.01M6.5 15.5a3 3 0 0 1 5 0M14 10h4M14 14h3",
  sesiones: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  contrasena: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4M12 15v2",
  salir: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  menu: "M4 7h16M4 12h16M4 17h16",
  cerrar: "M6 6l12 12M18 6L6 18",
  mas: "M12 5v14M5 12h14",
} as const;

export type NombreIcono = keyof typeof trazos;

export function Icono({ nombre, className = "size-5" }: { nombre: NombreIcono; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <path d={trazos[nombre]} />
    </svg>
  );
}
