"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoCns } from "@/componentes/marca/logo-cns";
import { Icono, type NombreIcono } from "@/componentes/ui/icono";
import { esOpcionActiva, esRutaActiva, gruposMenu } from "./opciones";

/**
 * Menú lateral del sistema (I-59). En escritorio queda fijo a la izquierda; en pantallas chicas se
 * esconde y lo abre el botón ☰ de la barra superior, sobre el contenido.
 *
 * Es de cliente solo por dos cosas de la vista: resaltar la opción de la página actual y abrir o cerrar
 * el menú en el celular. La sesión y los permisos siguen en el servidor (FR-004): `pie` llega ya armado
 * desde el layout, con el usuario y el botón de cerrar sesión.
 */
export function MenuLateral({ conMenu, pie }: { conMenu: boolean; pie: React.ReactNode }) {
  const rutaActual = usePathname();
  const [abierto, setAbierto] = useState(false);
  const botonAbrir = useRef<HTMLButtonElement>(null);
  const botonCerrar = useRef<HTMLButtonElement>(null);

  // Al cambiar de página el menú del celular se cierra solo. Se ajusta durante el render, como indica
  // React para estado que depende de otro valor, y no con un efecto.
  const [rutaAnterior, setRutaAnterior] = useState(rutaActual);
  if (rutaActual !== rutaAnterior) {
    setRutaAnterior(rutaActual);
    setAbierto(false);
  }

  // Quien navega con teclado queda dentro del menú al abrirlo.
  useEffect(() => {
    if (abierto) botonCerrar.current?.focus();
  }, [abierto]);

  function cerrar() {
    setAbierto(false);
    botonAbrir.current?.focus();
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-marca px-2 text-white lg:hidden print:hidden [&_:focus-visible]:outline-white">
        <button
          ref={botonAbrir}
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          aria-expanded={abierto}
          aria-controls="menu-lateral"
          className="flex size-11 items-center justify-center rounded-lg hover:bg-white/10"
        >
          <Icono nombre="menu" className="size-6" />
        </button>
        <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
          <LogoCns tamano={32} redondo />
          <span className="truncate">Almacén Regional Oruro</span>
        </Link>
      </header>

      {abierto && <div className="fixed inset-0 z-40 bg-texto/50 lg:hidden" onClick={cerrar} aria-hidden="true" />}

      <aside
        id="menu-lateral"
        onKeyDown={(evento) => {
          if (evento.key === "Escape" && abierto) cerrar();
        }}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-marca text-white transition-transform duration-200 lg:visible lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:shrink-0 lg:translate-x-0 print:hidden [&_:focus-visible]:outline-white ${
          abierto ? "translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="franjas-cns flex items-center gap-3 border-b border-white/15 px-4 py-4">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-3">
            <LogoCns tamano={44} redondo />
            <span className="flex min-w-0 flex-col">
              <span className="font-bold leading-tight">Almacén Regional Oruro</span>
              <span className="text-xs text-marca-claro">Caja Nacional de Salud</span>
            </span>
          </Link>
          <button
            ref={botonCerrar}
            type="button"
            onClick={cerrar}
            aria-label="Cerrar menú"
            className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/10 lg:hidden"
          >
            <Icono nombre="cerrar" className="size-6" />
          </button>
        </div>

        {/* Con el cambio de contraseña pendiente solo se puede cambiarla o cerrar sesión: no hay menú. */}
        {conMenu ? (
          <nav aria-label="Menú principal" className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-3">
            <ul>
              <li>
                <EnlaceMenu ruta="/" texto="Inicio" icono="inicio" activo={esRutaActiva("/", rutaActual)} />
              </li>
            </ul>
            {gruposMenu.map((grupo) => (
              <div key={grupo.titulo} className="flex flex-col gap-1">
                <h2 className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-marca-suave">{grupo.titulo}</h2>
                <ul className="flex flex-col gap-0.5">
                  {grupo.opciones.map((opcion) => (
                    <li key={opcion.ruta}>
                      <EnlaceMenu ruta={opcion.ruta} texto={opcion.texto} icono={opcion.icono} activo={esOpcionActiva(opcion, rutaActual)} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        <div className="border-t border-white/15 px-4 py-3">{pie}</div>
      </aside>
    </>
  );
}

function EnlaceMenu({ ruta, texto, icono, activo }: { ruta: string; texto: string; icono: NombreIcono; activo: boolean }) {
  return (
    <Link
      href={ruta}
      aria-current={activo ? "page" : undefined}
      className={`flex min-h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
        activo ? "bg-white font-semibold text-marca" : "font-medium text-marca-claro hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icono nombre={icono} />
      {texto}
    </Link>
  );
}
