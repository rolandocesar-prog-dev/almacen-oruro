import type { NombreIcono } from "@/componentes/ui/icono";

export type OpcionMenu = {
  ruta: string;
  texto: string;
  icono: NombreIcono;
  /** Explicación corta que muestra la pantalla de inicio. */
  descripcion: string;
  /** Otras rutas que pertenecen a este módulo aunque no cuelguen de `ruta` (el kardex, de existencias). */
  rutasRelacionadas?: readonly string[];
};

export type GrupoMenu = { titulo: string; opciones: readonly OpcionMenu[] };

/**
 * Módulos del sistema agrupados por tarea (I-59). Es la única lista: la usan el menú lateral y las
 * tarjetas de la pantalla de inicio, así un módulo nuevo aparece en los dos lugares a la vez.
 */
export const gruposMenu: readonly GrupoMenu[] = [
  {
    titulo: "Operaciones",
    opciones: [
      { ruta: "/compras", texto: "Compras", icono: "compras", descripcion: "Registrar compras con factura y anularlas" },
      { ruta: "/pedidos", texto: "Pedidos", icono: "pedidos", descripcion: "Registrar los pedidos de los representantes y ver qué falta entregar" },
      {
        ruta: "/distribuciones",
        texto: "Distribuciones",
        icono: "distribuciones",
        descripcion: "Entregar productos para atender los pedidos y anular entregas mal registradas",
      },
    ],
  },
  {
    titulo: "Inventario y análisis",
    opciones: [
      {
        ruta: "/existencias",
        texto: "Existencias",
        icono: "existencias",
        descripcion: "Stock actual, bajo mínimo y kardex de cada producto",
        rutasRelacionadas: ["/kardex"],
      },
      { ruta: "/reportes", texto: "Reportes", icono: "reportes", descripcion: "Consultar e imprimir compras, distribuciones, existencias, kardex y pedidos" },
      { ruta: "/ia", texto: "Inteligencia artificial", icono: "ia", descripcion: "Pronóstico de consumo, reposición sugerida e informes redactados" },
    ],
  },
  {
    titulo: "Catálogos",
    opciones: [
      { ruta: "/productos", texto: "Productos", icono: "productos", descripcion: "Código, categoría, unidad, stock actual y stock mínimo" },
      { ruta: "/categorias", texto: "Categorías", icono: "categorias", descripcion: "Grupos para ordenar los productos" },
      { ruta: "/unidades", texto: "Unidades de medida", icono: "unidades", descripcion: "Cómo se cuenta cada producto" },
      { ruta: "/proveedores", texto: "Proveedores", icono: "proveedores", descripcion: "A quiénes se compra y qué productos ofrecen" },
      { ruta: "/centros-salud", texto: "Centros de salud", icono: "centrosSalud", descripcion: "Dónde trabajan los representantes" },
      { ruta: "/representantes", texto: "Representantes", icono: "representantes", descripcion: "Quién hace los pedidos de cada centro de salud" },
    ],
  },
  {
    titulo: "Administración",
    opciones: [
      { ruta: "/personal", texto: "Personal", icono: "personal", descripcion: "Registrar y mantener a quienes operan el sistema" },
      { ruta: "/sesiones", texto: "Sesiones", icono: "sesiones", descripcion: "Consultar quién ingresó y cuándo" },
      { ruta: "/respaldo", texto: "Respaldo", icono: "respaldo", descripcion: "Descargar una copia de todos los datos del sistema" },
    ],
  },
];

/** Una ruta está activa en sí misma y en las de adentro (/compras/nueva, /compras/12…). */
export function esRutaActiva(ruta: string, rutaActual: string): boolean {
  if (ruta === "/") return rutaActual === "/";
  return rutaActual === ruta || rutaActual.startsWith(`${ruta}/`);
}

/** Una opción del menú está activa en su ruta o en alguna de sus rutas relacionadas. */
export function esOpcionActiva(opcion: Pick<OpcionMenu, "ruta" | "rutasRelacionadas">, rutaActual: string): boolean {
  return [opcion.ruta, ...(opcion.rutasRelacionadas ?? [])].some((ruta) => esRutaActiva(ruta, rutaActual));
}
