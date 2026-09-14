// Campos de filtro que repiten los seis listados de catálogos. Se usan dentro de <Filtros>.
import type { EstadoFiltro } from "@/esquemas/comunes";

/** Campo "Buscar": texto parcial, sin distinguir mayúsculas ni tildes (FR-007). */
export function CampoBusqueda({ valor, ayuda }: { valor?: string; ayuda: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor="q" className="text-sm font-medium">
        Buscar
      </label>
      <input
        id="q"
        name="q"
        type="search"
        maxLength={60}
        defaultValue={valor ?? ""}
        placeholder={ayuda}
        className="w-full min-w-0 rounded-md border border-borde px-3 py-2 sm:w-64"
      />
    </div>
  );
}

/** Selector de estado: activos (por defecto), inactivos o todos. */
export function CampoEstado({ valor }: { valor: EstadoFiltro }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="estado" className="text-sm font-medium">
        Estado
      </label>
      <select id="estado" name="estado" defaultValue={valor} className="rounded-md border border-borde px-3 py-2">
        <option value="activos">Activos</option>
        <option value="inactivos">Inactivos</option>
        <option value="todos">Todos</option>
      </select>
    </div>
  );
}
