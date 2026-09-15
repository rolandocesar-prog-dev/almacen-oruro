// Historia 2 · Ver los pedidos por atender (FR-013, research P-07).
// Los pedidos se crean con crearPedidoDePrueba, sin depender del registro (US1).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { listarPedidos, PEDIDOS_POR_PAGINA } from "@/servicios/pedidos";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProductoDePrueba, crearRepresentanteDePrueba } from "../ayudantes/catalogos";
import { fechaDeDocumento } from "../ayudantes/inventario";
import { crearPedidoDePrueba } from "../ayudantes/pedidos";

const filtroBase = { estado: "por-atender" as const, pagina: 1 };

describe("listarPedidos", () => {
  beforeEach(vaciarTablas);

  async function preparar() {
    const quispe = await crearRepresentanteDePrueba({ nombre: "Ana", apellido: "Quispe", servicio: "Emergencias" });
    const mamani = await crearRepresentanteDePrueba({ nombre: "Luis", apellido: "Mamani", servicio: "Pediatría" });
    const a = await crearProductoDePrueba();
    const b = await crearProductoDePrueba();

    const pendiente = await crearPedidoDePrueba({ representanteId: quispe.id, fecha: "2026-09-05", lineas: [{ productoId: a.id, solicitada: 10 }, { productoId: b.id, solicitada: 2 }] });
    const parcial = await crearPedidoDePrueba({ representanteId: mamani.id, fecha: "2026-09-02", lineas: [{ productoId: a.id, solicitada: 6, entregada: 3 }, { productoId: b.id, solicitada: 4, entregada: 1 }] });
    const atendido = await crearPedidoDePrueba({ representanteId: quispe.id, fecha: "2026-09-01", lineas: [{ productoId: a.id, solicitada: 5, entregada: 5 }] });
    const anulado = await crearPedidoDePrueba({ representanteId: mamani.id, fecha: "2026-09-03", estado: "ANULADO", lineas: [{ productoId: a.id, solicitada: 8, entregada: 2 }] });
    // Misma fecha que el PENDIENTE: se ordena por número.
    const pendiente2 = await crearPedidoDePrueba({ representanteId: mamani.id, fecha: "2026-09-05", lineas: [{ productoId: b.id, solicitada: 1 }] });
    return { quispe, mamani, pendiente, parcial, atendido, anulado, pendiente2 };
  }

  it("por defecto muestra solo PENDIENTE y PARCIAL, del más antiguo al más reciente, con sus columnas (E1)", async () => {
    const { parcial, pendiente, pendiente2, mamani } = await preparar();

    const { pedidos, total } = await listarPedidos(filtroBase);

    expect(total).toBe(3);
    expect(pedidos.map((p) => p.id)).toEqual([parcial.id, pendiente.id, pendiente2.id]);
    expect(pedidos[0]).toEqual({
      id: parcial.id,
      fecha: "2026-09-02",
      representante: "Mamani, Luis",
      representanteId: mamani.id,
      servicio: "Pediatría",
      productos: 2,
      porcentajeAtendido: 40,
      estado: "PARCIAL",
    });
  });

  it("filtra por cada estado concreto y por todos (E2)", async () => {
    const p = await preparar();
    const ids = async (estado: Parameters<typeof listarPedidos>[0]["estado"]) => (await listarPedidos({ ...filtroBase, estado })).pedidos.map((x) => x.id);

    expect(await ids("pendientes")).toEqual([p.pendiente.id, p.pendiente2.id]);
    expect(await ids("parciales")).toEqual([p.parcial.id]);
    expect(await ids("atendidos")).toEqual([p.atendido.id]);
    expect(await ids("anulados")).toEqual([p.anulado.id]);
    expect(await ids("todos")).toEqual([p.atendido.id, p.parcial.id, p.anulado.id, p.pendiente.id, p.pendiente2.id]);
  });

  it("combina representante y rango de fechas con el estado (E3)", async () => {
    const p = await preparar();

    const deQuispe = await listarPedidos({ ...filtroBase, estado: "todos", representanteId: p.quispe.id });
    expect(deQuispe.pedidos.map((x) => x.id)).toEqual([p.atendido.id, p.pendiente.id]);

    const rango = await listarPedidos({ ...filtroBase, estado: "todos", desde: "2026-09-02", hasta: "2026-09-03" });
    expect(rango.pedidos.map((x) => x.id)).toEqual([p.parcial.id, p.anulado.id]);

    const combinado = await listarPedidos({ estado: "por-atender", representanteId: p.mamani.id, desde: "2026-09-04", pagina: 1 });
    expect(combinado.pedidos.map((x) => x.id)).toEqual([p.pendiente2.id]);
  });

  it("porcentaje atendido: unidades entregadas sobre solicitadas, redondeado hacia abajo (E4)", async () => {
    const producto = await crearProductoDePrueba();
    const otro = await crearProductoDePrueba();
    const cuarenta = await crearPedidoDePrueba({ lineas: [{ productoId: producto.id, solicitada: 6, entregada: 4 }, { productoId: otro.id, solicitada: 4 }] });
    const casiTodo = await crearPedidoDePrueba({ lineas: [{ productoId: producto.id, solicitada: 200, entregada: 199 }] });
    const nada = await crearPedidoDePrueba({ lineas: [{ productoId: producto.id, solicitada: 3 }] });
    const todo = await crearPedidoDePrueba({ lineas: [{ productoId: producto.id, solicitada: 3, entregada: 3 }] });

    const { pedidos } = await listarPedidos({ ...filtroBase, estado: "todos" });
    const porcentaje = new Map(pedidos.map((p) => [p.id, p.porcentajeAtendido]));
    expect(porcentaje.get(cuarenta.id)).toBe(40);
    expect(porcentaje.get(casiTodo.id)).toBe(99);
    expect(porcentaje.get(nada.id)).toBe(0);
    expect(porcentaje.get(todo.id)).toBe(100);
  });

  it(`pagina de a ${PEDIDOS_POR_PAGINA}`, async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const representante = await crearRepresentanteDePrueba();
    const producto = await crearProductoDePrueba();
    for (let i = 0; i < PEDIDOS_POR_PAGINA + 1; i += 1) {
      await prisma.pedido.create({
        data: { representanteId: representante.id, fecha: fechaDeDocumento("2026-09-01"), usuarioId: usuario.id, lineas: { create: [{ productoId: producto.id, cantidadSolicitada: 1 }] } },
      });
    }

    const primera = await listarPedidos(filtroBase);
    const segunda = await listarPedidos({ ...filtroBase, pagina: 2 });
    expect(primera.total).toBe(PEDIDOS_POR_PAGINA + 1);
    expect(primera.pedidos).toHaveLength(PEDIDOS_POR_PAGINA);
    expect(segunda.pedidos).toHaveLength(1);
  });
});
