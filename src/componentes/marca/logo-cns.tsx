import Image from "next/image";
import logo from "./logo-cns.jpg";

/**
 * Logo de la Caja Nacional de Salud. Se importa como archivo estático (no desde /public) para que Next.js
 * lo sirva bajo /_next/, que el proxy deja pasar sin sesión: así se ve también en la pantalla de ingreso.
 * `redondo` recorta el fondo blanco cuadrado de la imagen al círculo del logo.
 */
export function LogoCns({ tamano, redondo = false, className = "" }: { tamano: number; redondo?: boolean; className?: string }) {
  return (
    <Image
      src={logo}
      alt="Caja Nacional de Salud"
      width={tamano}
      height={tamano}
      loading="eager"
      className={`shrink-0 ${redondo ? "rounded-full" : ""} ${className}`}
    />
  );
}
