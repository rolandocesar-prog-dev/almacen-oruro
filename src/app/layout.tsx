import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Almacén Regional Oruro",
  description: "Control de compra, almacenaje y distribución de productos de limpieza",
};

export default function LayoutRaiz({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
