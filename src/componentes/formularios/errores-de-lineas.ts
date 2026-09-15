// Aviso general de los formularios con líneas (compras de F-003 y pedidos de F-004).

/**
 * Mensajes de las líneas con su número, para leerlos en el aviso general sin buscar en la tabla
 * (F-003 FR-007, F-004 FR-016). Los errores de `lineas.{i}.campo` llevan "Línea {i+1}: …" salvo que ya
 * empiecen con "Línea"; los de `lineas` (por ejemplo, "Agrega al menos un producto") van tal cual; los
 * de la cabecera se omiten porque ya se muestran junto a su campo.
 */
export function mensajesPorLinea(errores: Partial<Record<string, string[]>>): string[] {
  return Object.entries(errores).flatMap(([ruta, mensajes = []]) => {
    const linea = /^lineas\.(\d+)\./.exec(ruta);
    if (!linea) return ruta === "lineas" ? mensajes : [];
    const numero = Number(linea[1]) + 1;
    return mensajes.map((mensaje) => (mensaje.startsWith("Línea") ? mensaje : `Línea ${numero}: ${mensaje.charAt(0).toLowerCase()}${mensaje.slice(1)}`));
  });
}
