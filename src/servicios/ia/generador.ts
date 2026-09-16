// Generador de histórico simulado (F-007, research A-07; FR-018 a FR-022, FR-024).
//
// El almacén no tiene datos históricos digitalizados, y sin historia no hay pronóstico que mostrar. Este
// generador crea 36 meses de compras, pedidos y distribuciones verosímiles **usando los servicios reales
// de F-003 a F-005**: cada movimiento pasa por `registrarMovimiento` y el kardex cuadra al terminar
// (SC-004, constitución, principio III). Un INSERT masivo habría sido más rápido y habría podido dejar
// un inventario imposible.
//
// Todo lo aleatorio sale de una semilla (`mulberry32`): con la misma semilla, la misma base (SC-001).
// Solo se ejecuta desde el comando de instalación y solo sobre una base sin documentos (FR-022, FR-024).
import { elegirDe, enteroEntre, generadorAleatorio } from "@/lib/aleatorio";
import { ErrorDeNegocio } from "@/lib/errores";
import { mesAnterior, mesEnCurso, mesSiguiente, primerDiaDelMes } from "@/lib/fechas";
import { prisma } from "@/lib/prisma";
import { normalizarTexto } from "@/lib/texto";
import { anularCompra, registrarCompra } from "@/servicios/compras";
import { anularDistribucion, registrarDistribucion } from "@/servicios/distribuciones";
import { anularPedido, registrarPedido } from "@/servicios/pedidos";

/** Crecimiento anual del consumo: 3 % por año (FR-019). */
const TENDENCIA_ANUAL = 1.03;

/** Amplitud del ruido mensual: hasta ±15 % (FR-019). */
const RUIDO_MAXIMO = 0.15;

/**
 * Factor estacional de cada mes (enero a diciembre). Junio, julio y agosto están por encima del resto:
 * es el invierno del sur, cuando suben las consultas y con ellas la limpieza (S-06).
 */
const ESTACIONAL_MES = [0.85, 0.85, 0.95, 1.0, 1.1, 1.35, 1.45, 1.3, 1.05, 0.95, 0.9, 0.85];

/**
 * Consumo objetivo de un producto en un mes: su base, corregida por la estación, por los años
 * transcurridos y por un ruido de hasta ±15 % (FR-019).
 *
 * Es una función **pura**: recibe el generador aleatorio en lugar de crearlo, así se puede probar sin
 * base de datos y el generador completo sigue siendo reproducible.
 */
export function objetivoDeConsumo(base: number, mes: number, anios: number, aleatorio: () => number): number {
  const estacional = ESTACIONAL_MES[mes - 1] ?? 1;
  const ruido = 1 + (aleatorio() * 2 - 1) * RUIDO_MAXIMO;
  return base * estacional * TENDENCIA_ANUAL ** anios * ruido;
}

const CATEGORIAS = [
  "Detergentes y jabones",
  "Desinfectantes",
  "Papel y descartables",
  "Utensilios de limpieza",
  "Bolsas y contenedores",
  "Protección personal",
] as const;

const UNIDADES = [
  { nombre: "Unidad", abreviatura: "UN" },
  { nombre: "Litro", abreviatura: "L" },
  { nombre: "Kilogramo", abreviatura: "KG" },
  { nombre: "Paquete", abreviatura: "PQT" },
  { nombre: "Caja", abreviatura: "CJA" },
  { nombre: "Rollo", abreviatura: "ROL" },
] as const;

/** Catálogo de productos: `base` es el consumo mensual típico y `precio` el costo por unidad en Bs. */
const PRODUCTOS = [
  { codigo: "LIM-001", nombre: "Detergente en polvo 1 kg", categoria: 0, unidad: 2, base: 40, precio: "18.50" },
  { codigo: "LIM-002", nombre: "Detergente líquido 1 L", categoria: 0, unidad: 1, base: 35, precio: "16.00" },
  { codigo: "LIM-003", nombre: "Jabón líquido de manos 1 L", categoria: 0, unidad: 1, base: 55, precio: "21.00" },
  { codigo: "LIM-004", nombre: "Jabón en barra 200 g", categoria: 0, unidad: 0, base: 60, precio: "5.50" },
  { codigo: "DES-001", nombre: "Lavandina 1 L", categoria: 1, unidad: 1, base: 90, precio: "9.50" },
  { codigo: "DES-002", nombre: "Alcohol en gel 1 L", categoria: 1, unidad: 1, base: 70, precio: "27.00" },
  { codigo: "DES-003", nombre: "Alcohol medicinal 1 L", categoria: 1, unidad: 1, base: 65, precio: "24.00" },
  { codigo: "DES-004", nombre: "Desinfectante de pisos 5 L", categoria: 1, unidad: 1, base: 30, precio: "48.00" },
  { codigo: "DES-005", nombre: "Amonio cuaternario 1 L", categoria: 1, unidad: 1, base: 20, precio: "62.00" },
  { codigo: "PAP-001", nombre: "Papel higiénico jumbo", categoria: 2, unidad: 5, base: 120, precio: "12.00" },
  { codigo: "PAP-002", nombre: "Toalla de papel interfoliada", categoria: 2, unidad: 3, base: 95, precio: "15.50" },
  { codigo: "PAP-003", nombre: "Servilleta de papel", categoria: 2, unidad: 3, base: 50, precio: "8.00" },
  { codigo: "PAP-004", nombre: "Papel toalla en rollo", categoria: 2, unidad: 5, base: 80, precio: "11.00" },
  { codigo: "UTE-001", nombre: "Trapeador de algodón", categoria: 3, unidad: 0, base: 18, precio: "35.00" },
  { codigo: "UTE-002", nombre: "Escoba de cerda plástica", categoria: 3, unidad: 0, base: 15, precio: "28.00" },
  { codigo: "UTE-003", nombre: "Balde de 12 L", categoria: 3, unidad: 0, base: 10, precio: "32.00" },
  { codigo: "UTE-004", nombre: "Paño multiuso", categoria: 3, unidad: 3, base: 45, precio: "14.00" },
  { codigo: "UTE-005", nombre: "Esponja doble faz", categoria: 3, unidad: 3, base: 40, precio: "7.50" },
  { codigo: "UTE-006", nombre: "Recogedor de basura", categoria: 3, unidad: 0, base: 8, precio: "22.00" },
  { codigo: "BOL-001", nombre: "Bolsa de basura negra 100 L", categoria: 4, unidad: 3, base: 110, precio: "19.00" },
  { codigo: "BOL-002", nombre: "Bolsa de basura roja 50 L", categoria: 4, unidad: 3, base: 85, precio: "17.50" },
  { codigo: "BOL-003", nombre: "Contenedor de residuos 60 L", categoria: 4, unidad: 0, base: 6, precio: "145.00" },
  { codigo: "PRO-001", nombre: "Guante de nitrilo caja x 100", categoria: 5, unidad: 4, base: 75, precio: "42.00" },
  { codigo: "PRO-002", nombre: "Barbijo quirúrgico caja x 50", categoria: 5, unidad: 4, base: 65, precio: "30.00" },
  { codigo: "PRO-003", nombre: "Guante de goma para limpieza", categoria: 5, unidad: 0, base: 25, precio: "16.00" },
] as const;

const PROVEEDORES = [
  { razonSocial: "Distribuidora La Paz S.R.L.", nit: "1023456017" },
  { razonSocial: "Comercial Andina Ltda.", nit: "2045678023" },
  { razonSocial: "Insumos Bolivia S.A.", nit: "3067890031" },
] as const;

/** Cada representante es el responsable de un servicio o área del centro de salud (D-18). */
const REPRESENTANTES = [
  { nombre: "María", apellido: "Quispe", ci: "4821507", servicio: "Emergencias" },
  { nombre: "Jorge", apellido: "Mamani", ci: "3915482", servicio: "Internación" },
  { nombre: "Elena", apellido: "Choque", ci: "5203871", servicio: "Laboratorio" },
  { nombre: "Rubén", apellido: "Colque", ci: "4409236", servicio: "Consulta externa" },
  { nombre: "Silvia", apellido: "Apaza", ci: "6110394", servicio: "Odontología" },
] as const;

const CENTRO_SALUD = "Centro de Salud Oruro Central";

/** Cuánto se compra respecto del consumo del mes: normal y con stock de sobra. */
const HOLGURA_NORMAL = 1.9;
const HOLGURA_AMPLIA = 3.2;

const MOTIVOS_ANULACION_COMPRA = [
  "Factura cargada con el proveedor equivocado",
  "La factura se anuló en origen",
  "Cantidades mal transcritas de la factura",
] as const;

const MOTIVOS_ANULACION_DISTRIBUCION = [
  "Vale registrado por duplicado",
  "El vale correspondía a otro servicio",
  "Cantidades mal anotadas en el vale",
] as const;

const MOTIVOS_ANULACION_PEDIDO = [
  "El servicio retiró el pedido",
  "Pedido repetido por error",
] as const;

export type OpcionesGenerador = {
  /** Meses de historia a generar; por defecto 36 (FR-018). */
  meses?: number;
  /** Cuántos productos del catálogo usar; por defecto los 25. */
  productos?: number;
  /** Semilla de la aleatoriedad: con la misma semilla, los mismos datos (FR-019). */
  semilla: number;
  /** Aviso de avance, para que el comando muestre en qué mes va. */
  alPaso?: (aviso: string) => void;
  /** "Hoy" del generador; se inyecta en las pruebas para que no dependan del día. */
  ahora?: Date;
};

export type ResumenGenerador = {
  meses: number;
  productos: number;
  compras: number;
  pedidos: number;
  distribuciones: number;
  comprasAnuladas: number;
  distribucionesAnuladas: number;
  pedidosAnulados: number;
  movimientos: number;
};

/** Los meses a generar, del más antiguo al más reciente, terminando en el mes anterior al actual. */
function mesesAGenerar(cantidad: number, ahora: Date): string[] {
  const meses: string[] = [];
  let mes = mesAnterior(mesEnCurso(ahora));
  for (let contador = 0; contador < cantidad; contador += 1) {
    meses.unshift(mes);
    mes = mesAnterior(mes);
  }
  return meses;
}

/** Fecha "AAAA-MM-DD" del día indicado de un mes. */
function diaDelMes(mes: string, dia: number): string {
  return `${mes}-${String(dia).padStart(2, "0")}`;
}

/** Crea el catálogo con el que se mueve el almacén simulado. */
async function crearCatalogo(cantidadDeProductos: number) {
  const categorias: number[] = [];
  for (const nombre of CATEGORIAS) {
    const categoria = await prisma.categoria.create({
      data: { nombre, nombreNormalizado: normalizarTexto(nombre), activo: true },
    });
    categorias.push(categoria.id);
  }

  const unidades: number[] = [];
  for (const unidad of UNIDADES) {
    const creada = await prisma.unidadMedida.create({
      data: { nombre: unidad.nombre, nombreNormalizado: normalizarTexto(unidad.nombre), abreviatura: unidad.abreviatura, activo: true },
    });
    unidades.push(creada.id);
  }

  const definiciones = PRODUCTOS.slice(0, cantidadDeProductos);
  const productos = [];
  for (const definicion of definiciones) {
    const creado = await prisma.producto.create({
      data: {
        codigo: definicion.codigo,
        nombre: definicion.nombre,
        nombreNormalizado: normalizarTexto(definicion.nombre),
        categoriaId: categorias[definicion.categoria]!,
        unidadMedidaId: unidades[definicion.unidad]!,
        // El mínimo es algo menos de un mes de consumo: así hay productos bajo mínimo y otros no (H1 · E8).
        stockMinimo: Math.round(definicion.base * 0.8),
        activo: true,
      },
    });
    productos.push({ id: creado.id, base: definicion.base, precio: definicion.precio, nombre: definicion.nombre });
  }

  const proveedores: number[] = [];
  for (const proveedor of PROVEEDORES) {
    const creado = await prisma.proveedor.create({ data: { ...proveedor, activo: true } });
    proveedores.push(creado.id);
  }

  const centro = await prisma.centroSalud.create({
    data: { nombre: CENTRO_SALUD, nombreNormalizado: normalizarTexto(CENTRO_SALUD), activo: true },
  });

  const representantes: number[] = [];
  for (const representante of REPRESENTANTES) {
    const creado = await prisma.representante.create({
      data: { ...representante, centroSaludId: centro.id, activo: true },
    });
    representantes.push(creado.id);
  }

  return { productos, proveedores, representantes };
}

/** Stock actual de cada producto, para no entregar más de lo que hay. */
async function stockPorProducto(ids: number[]): Promise<Map<number, number>> {
  const productos = await prisma.producto.findMany({ where: { id: { in: ids } }, select: { id: true, stockActual: true } });
  return new Map(productos.map((producto) => [producto.id, producto.stockActual]));
}

/**
 * Genera el histórico simulado completo.
 *
 * Recorre los meses en orden cronológico y en cada uno: compra lo que hace falta para sostener el
 * consumo del mes, registra un pedido por representante y lo atiende con distribuciones —enteras,
 * parciales o ninguna— y, de vez en cuando, anula una compra, una distribución o un pedido. Así quedan
 * pedidos en los cuatro estados (H1 · E5) y un kardex consistente (SC-004).
 */
export async function generarHistorico(opciones: OpcionesGenerador): Promise<ResumenGenerador> {
  const { meses = 36, productos: cantidadDeProductos = PRODUCTOS.length, semilla, alPaso = () => {}, ahora = new Date() } = opciones;

  // FR-022: el generador solo corre sobre una base sin documentos. No borra nada: se niega y avisa.
  const [compras, pedidos, distribuciones] = await Promise.all([
    prisma.compra.count(),
    prisma.pedido.count(),
    prisma.distribucion.count(),
  ]);
  if (compras + pedidos + distribuciones > 0) {
    throw new ErrorDeNegocio("El generador solo se ejecuta sobre una base sin compras, pedidos ni distribuciones");
  }

  const usuario = await prisma.usuario.findFirst({ where: { activo: true }, orderBy: { id: "asc" }, select: { id: true } });
  if (!usuario) throw new ErrorDeNegocio("No hay ningún usuario activo: carga la semilla antes de generar el histórico");
  const usuarioId = usuario.id;

  const aleatorio = generadorAleatorio(semilla);
  const catalogo = await crearCatalogo(Math.min(cantidadDeProductos, PRODUCTOS.length));
  alPaso(`Catálogo creado: ${catalogo.productos.length} productos, ${catalogo.proveedores.length} proveedores, ${catalogo.representantes.length} representantes.`);

  const listaDeMeses = mesesAGenerar(meses, ahora);
  const resumen: ResumenGenerador = {
    meses,
    productos: catalogo.productos.length,
    compras: 0,
    pedidos: 0,
    distribuciones: 0,
    comprasAnuladas: 0,
    distribucionesAnuladas: 0,
    pedidosAnulados: 0,
    movimientos: 0,
  };

  let numeroDeFactura = 10000;
  let numeroDeVale = 1000;
  const idsDeProductos = catalogo.productos.map((producto) => producto.id);

  for (const [indiceDelMes, mes] of listaDeMeses.entries()) {
    const numeroDelMes = Number(mes.slice(5, 7));
    const anios = indiceDelMes / 12;
    const ultimosMeses = indiceDelMes >= listaDeMeses.length - 2;

    // 1. Consumo objetivo del mes y compra para sostenerlo, con holgura.
    const objetivo = new Map<number, number>();
    for (const producto of catalogo.productos) {
      objetivo.set(producto.id, Math.max(1, Math.round(objetivoDeConsumo(producto.base, numeroDelMes, anios, aleatorio))));
    }

    const stock = await stockPorProducto(idsDeProductos);
    const porProveedor = new Map<number, { productoId: number; cantidad: number; precioUnitario: string }[]>();
    catalogo.productos.forEach((producto, indice) => {
      // Un quinto del catálogo deja de reponerse en los últimos meses y queda bajo mínimo; un tercio se
      // compra con mucha holgura y queda con stock de sobra. Así la demostración muestra las dos
      // situaciones (H1 · E8).
      if (ultimosMeses && indice % 5 === 0) return;
      const holgura = indice % 3 === 0 ? HOLGURA_AMPLIA : HOLGURA_NORMAL;
      const meta = Math.ceil((objetivo.get(producto.id) ?? 0) * holgura);
      const faltante = meta - (stock.get(producto.id) ?? 0);
      if (faltante <= 0) return;
      const proveedorId = catalogo.proveedores[indice % catalogo.proveedores.length]!;
      const lineas = porProveedor.get(proveedorId) ?? [];
      lineas.push({ productoId: producto.id, cantidad: faltante, precioUnitario: producto.precio });
      porProveedor.set(proveedorId, lineas);
    });

    let diaDeCompra = 2;
    for (const [proveedorId, lineas] of porProveedor) {
      numeroDeFactura += 1;
      await registrarCompra(
        { proveedorId, nroFactura: String(numeroDeFactura), fecha: diaDelMes(mes, diaDeCompra), observacion: undefined, lineas },
        usuarioId,
      );
      resumen.compras += 1;
      diaDeCompra += 1;
    }

    // 2. Una compra chica se anula cada tanto: un error de carga que el sistema corrige anulando,
    //    nunca editando (principio IV). Se anula recién comprada, así nunca falta stock (RN-25).
    if (indiceDelMes % 7 === 3 && catalogo.productos.length > 0) {
      const producto = elegirDe(aleatorio, catalogo.productos);
      numeroDeFactura += 1;
      const { id } = await registrarCompra(
        {
          proveedorId: catalogo.proveedores[0]!,
          nroFactura: String(numeroDeFactura),
          fecha: diaDelMes(mes, 6),
          observacion: undefined,
          lineas: [{ productoId: producto.id, cantidad: enteroEntre(aleatorio, 1, 5), precioUnitario: producto.precio }],
        },
        usuarioId,
      );
      resumen.compras += 1;
      await anularCompra(id, elegirDe(aleatorio, MOTIVOS_ANULACION_COMPRA), usuarioId);
      resumen.comprasAnuladas += 1;
    }

    // 3. Un pedido por representante. Cada producto lo pide un solo servicio, por su consumo del mes: así
    //    lo distribuido sigue la forma del consumo objetivo (estación, tendencia y ruido).
    const disponible = await stockPorProducto(idsDeProductos);
    const pedidosDelMes: { id: number; representanteIndice: number }[] = [];
    for (const [indiceRepresentante, representanteId] of catalogo.representantes.entries()) {
      const lineas = catalogo.productos
        .filter((_, indice) => (indice + indiceRepresentante) % catalogo.representantes.length === 0)
        .map((producto) => ({
          productoId: producto.id,
          cantidadSolicitada: objetivo.get(producto.id) ?? 1,
        }));
      if (lineas.length === 0) continue;

      const { id } = await registrarPedido(
        { representanteId, fecha: diaDelMes(mes, 8 + indiceRepresentante), observacion: undefined, lineas },
        usuarioId,
      );
      resumen.pedidos += 1;
      pedidosDelMes.push({ id, representanteIndice: indiceRepresentante });
    }

    // 4. Atención de los pedidos del mes: casi todos completos y algunos parciales (PARCIAL).
    //    Lo entregado es el consumo que verá el pronóstico, así que ningún pedido principal se deja sin
    //    atender ni se anula: eso pondría meses en 0 que el almacén real no tuvo.
    let ultimaDistribucion: { id: number; pedidoId: number; dia: number; lineas: { pedidoDetalleId: number; cantidad?: number }[] } | null = null;
    for (const [indicePedido, pedido] of pedidosDelMes.entries()) {
      const suerte = aleatorio();
      // Entregas parciales: al menos una cada semestre.
      const parcial = suerte < 0.15 || (indiceDelMes % 6 === 1 && indicePedido === 0);
      const proporcion = parcial ? 0.8 : 1;
      const lineasDelPedido = await prisma.pedidoDetalle.findMany({
        where: { pedidoId: pedido.id },
        select: { id: true, productoId: true, cantidadSolicitada: true, cantidadEntregada: true },
        orderBy: { id: "asc" },
      });

      const lineas = lineasDelPedido.map((linea) => {
        const pendiente = linea.cantidadSolicitada - linea.cantidadEntregada;
        const enStock = disponible.get(linea.productoId) ?? 0;
        // Nunca se entrega más de lo que hay: el servicio lo rechazaría y con razón (RN-32).
        const cantidad = Math.min(Math.floor(pendiente * proporcion), pendiente, enStock);
        if (cantidad > 0) disponible.set(linea.productoId, enStock - cantidad);
        return { pedidoDetalleId: linea.id, cantidad: cantidad > 0 ? cantidad : undefined };
      });
      if (!lineas.some((linea) => linea.cantidad !== undefined)) continue;

      const dia = 14 + indicePedido * 2;
      numeroDeVale += 1;
      const { id } = await registrarDistribucion(
        { pedidoId: pedido.id, nroVale: String(numeroDeVale), fecha: diaDelMes(mes, dia), observacion: undefined, lineas },
        usuarioId,
      );
      resumen.distribuciones += 1;
      ultimaDistribucion = { id, pedidoId: pedido.id, dia, lineas };
    }

    // 5. Cada tanto una distribución se registró mal: se anula y se vuelve a registrar corregida con otro
    //    vale, como se hace en el almacén (principio IV). El consumo del mes no cambia.
    if (indiceDelMes % 5 === 2 && ultimaDistribucion !== null) {
      await anularDistribucion(ultimaDistribucion.id, elegirDe(aleatorio, MOTIVOS_ANULACION_DISTRIBUCION), usuarioId);
      resumen.distribucionesAnuladas += 1;
      numeroDeVale += 1;
      await registrarDistribucion(
        {
          pedidoId: ultimaDistribucion.pedidoId,
          nroVale: String(numeroDeVale),
          fecha: diaDelMes(mes, ultimaDistribucion.dia + 1),
          observacion: "Reemplaza al vale anulado",
          lineas: ultimaDistribucion.lineas,
        },
        usuarioId,
      );
      resumen.distribuciones += 1;
    }

    // 6. Pedidos adicionales que no forman parte del consumo del mes:
    //    - cada semestre, uno cargado dos veces se anula (ANULADO);
    //    - en el último mes, dos servicios hicieron un pedido que todavía no se atendió (PENDIENTE).
    const producto = elegirDe(aleatorio, catalogo.productos);
    if (indiceDelMes % 6 === 4) {
      const { id } = await registrarPedido(
        {
          representanteId: catalogo.representantes[0]!,
          fecha: diaDelMes(mes, 20),
          observacion: undefined,
          lineas: [{ productoId: producto.id, cantidadSolicitada: enteroEntre(aleatorio, 2, 6) }],
        },
        usuarioId,
      );
      resumen.pedidos += 1;
      await anularPedido(id, elegirDe(aleatorio, MOTIVOS_ANULACION_PEDIDO), usuarioId);
      resumen.pedidosAnulados += 1;
    }
    if (indiceDelMes === listaDeMeses.length - 1) {
      for (const representanteId of catalogo.representantes.slice(0, 2)) {
        await registrarPedido(
          {
            representanteId,
            fecha: diaDelMes(mes, 27),
            observacion: "Pedido para el mes siguiente",
            lineas: [{ productoId: elegirDe(aleatorio, catalogo.productos).id, cantidadSolicitada: enteroEntre(aleatorio, 3, 10) }],
          },
          usuarioId,
        );
        resumen.pedidos += 1;
      }
    }

    alPaso(`${mes}: ${resumen.compras} compras, ${resumen.pedidos} pedidos y ${resumen.distribuciones} distribuciones acumuladas.`);
  }

  resumen.movimientos = await prisma.movimientoInventario.count();

  // FR-021: la base queda marcada como de demostración, con la fecha y la semilla con que se generó.
  // La marca la ve todo el sistema (F-006): ninguna pantalla puede confundirse con datos reales.
  await prisma.configuracion.upsert({
    where: { id: 1 },
    update: { modoDemostracion: true, datosSimuladosEn: new Date(), semillaSimulacion: semilla },
    create: { id: 1, modoDemostracion: true, datosSimuladosEn: new Date(), semillaSimulacion: semilla },
  });

  return resumen;
}

/** Primer día del primer mes generado; lo usa el comando para informar el período cubierto. */
export function primerMesGenerado(meses: number, ahora: Date = new Date()): string {
  return primerDiaDelMes(mesesAGenerar(meses, ahora)[0] ?? mesSiguiente(mesEnCurso(ahora)));
}

