import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

export const metadata: Metadata = {
  title: "Almacén Regional Oruro",
  description: "Control de compra, almacenaje y distribución de productos de limpieza",
};

// Public Sans (licencia OFL, en fuentes/OFL.txt) va dentro del proyecto: compilar y usar el sistema no
// necesita internet (I-57). Es una fuente variable, así que un solo archivo cubre todos los grosores.
const publicSans = localFont({
  src: "./fuentes/public-sans-variable.woff2",
  weight: "100 900",
  variable: "--font-public-sans",
  display: "swap",
});

export default function LayoutRaiz({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={publicSans.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
