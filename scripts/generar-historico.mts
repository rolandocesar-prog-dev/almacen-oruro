// Comando de instalación del histórico simulado (F-007, FR-024).
//
//   npm run datos:simulados -- --semilla 20260915
//
// Es una envoltura delgada: toda la lógica está en `generarHistorico`. No existe ninguna pantalla que
// lo ejecute, a propósito: así nadie puede llenar de datos inventados una base con datos reales.
// Solo corre sobre una base sin compras, pedidos ni distribuciones; para volver a generar se recrea
// la base (ver docs/instalacion.md).
import "dotenv/config";
import { ErrorDeNegocio } from "../src/lib/errores";
import { prisma } from "../src/lib/prisma";
import { generarHistorico } from "../src/servicios/ia/generador";

/** Semilla por defecto: un valor fijo, para que la instalación estándar sea siempre la misma. */
const SEMILLA_POR_DEFECTO = 20260915;

function leerSemilla(argumentos: string[]): number {
  const posicion = argumentos.indexOf("--semilla");
  if (posicion === -1) return SEMILLA_POR_DEFECTO;

  const valor = Number(argumentos[posicion + 1]);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error("La semilla debe ser un número entero positivo: --semilla 20260915");
  }
  return valor;
}

async function main() {
  const semilla = leerSemilla(process.argv.slice(2));
  console.log(`Generando 36 meses de histórico simulado con la semilla ${semilla}…`);
  console.log("Puede tardar varios minutos: cada compra, pedido y distribución se registra con los servicios reales.\n");

  const inicio = Date.now();
  const resumen = await generarHistorico({ semilla, alPaso: (aviso) => console.log(`  ${aviso}`) });
  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);

  console.log("\n✓ Histórico simulado generado.");
  console.log(`  Meses: ${resumen.meses} · Productos: ${resumen.productos}`);
  console.log(`  Compras: ${resumen.compras} (${resumen.comprasAnuladas} anuladas)`);
  console.log(`  Pedidos: ${resumen.pedidos} (${resumen.pedidosAnulados} anulados)`);
  console.log(`  Distribuciones: ${resumen.distribuciones} (${resumen.distribucionesAnuladas} anuladas)`);
  console.log(`  Movimientos de inventario: ${resumen.movimientos}`);
  console.log(`  Duración: ${segundos} s`);
  console.log("\nLa base quedó marcada como de demostración: todas las pantallas lo avisan.");
}

main()
  .catch((error: unknown) => {
    const mensaje = error instanceof ErrorDeNegocio || error instanceof Error ? error.message : String(error);
    console.error(`\n✗ No se generó el histórico: ${mensaje}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
