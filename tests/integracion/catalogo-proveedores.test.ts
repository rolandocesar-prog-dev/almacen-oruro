// Historia 3 · Proveedores (FR-008, FR-019, RN-11, RN-14).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ErrorDeNegocio } from "@/lib/errores";
import {
  desactivarProveedor,
  listarProveedores,
  listarProveedoresParaSelector,
  modificarProveedor,
  reactivarProveedor,
  registrarProveedor,
} from "@/servicios/catalogos/proveedores";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProveedorDePrueba } from "../ayudantes/catalogos";

async function errorDe(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return error as ErrorDeNegocio;
}

const datosBase = { razonSocial: "Distribuidora Andina S.R.L.", nit: "1020304050" };

describe("registrar y modificar proveedores", () => {
  beforeEach(vaciarTablas);

  it("guarda los datos con los opcionales vacíos como null", async () => {
    const { id } = await registrarProveedor({ ...datosBase, razonSocial: " Distribuidora   Andina S.R.L. ", correo: "ventas@andina.bo" });
    const guardado = await prisma.proveedor.findUniqueOrThrow({ where: { id } });
    expect(guardado).toMatchObject({
      razonSocial: "Distribuidora Andina S.R.L.",
      nit: "1020304050",
      correo: "ventas@andina.bo",
      telefono: null,
      contactoNombre: null,
      direccion: null,
      activo: true,
    });
  });

  it("rechaza un NIT repetido aunque la razón social sea otra", async () => {
    await crearProveedorDePrueba({ nit: "1020304050", razonSocial: "Otra empresa" });
    const error = await errorDe(registrarProveedor(datosBase));
    expect(error.message).toBe("Ya existe un proveedor con el NIT '1020304050'");
    expect(error.campo).toBe("nit");
    expect(error.enlace).toBeUndefined();
  });

  it("si el proveedor repetido está inactivo, lo dice y ofrece el enlace", async () => {
    const existente = await crearProveedorDePrueba({ nit: "1020304050", activo: false });
    const error = await errorDe(registrarProveedor(datosBase));
    expect(error.message).toBe("Ya existe un proveedor inactivo con el NIT '1020304050'");
    expect(error.enlace).toEqual({ texto: "Ver y reactivar", ruta: `/proveedores/${existente.id}` });
  });

  it("acepta dos proveedores con la misma razón social y distinto NIT (FR-019)", async () => {
    await registrarProveedor(datosBase);
    await expect(registrarProveedor({ ...datosBase, nit: "5556667" })).resolves.toHaveProperty("id");
  });

  it("al modificar rechaza el NIT de otro proveedor, pero no el propio", async () => {
    const proveedor = await crearProveedorDePrueba({ nit: "111" });
    await crearProveedorDePrueba({ nit: "222" });

    expect((await errorDe(modificarProveedor(proveedor.id, { ...datosBase, nit: "222" }))).message).toBe(
      "Ya existe un proveedor con el NIT '222'",
    );
    await modificarProveedor(proveedor.id, { ...datosBase, nit: "111", telefono: "5251234" });
    expect((await prisma.proveedor.findUniqueOrThrow({ where: { id: proveedor.id } })).telefono).toBe("5251234");
  });
});

describe("estado y consultas de proveedores", () => {
  beforeEach(vaciarTablas);

  it("desactivar y reactivar se permiten siempre", async () => {
    const proveedor = await crearProveedorDePrueba();
    await desactivarProveedor(proveedor.id);
    expect((await prisma.proveedor.findUniqueOrThrow({ where: { id: proveedor.id } })).activo).toBe(false);
    expect((await errorDe(desactivarProveedor(proveedor.id))).message).toBe("El proveedor ya está inactivo");
    await reactivarProveedor(proveedor.id);
    expect((await prisma.proveedor.findUniqueOrThrow({ where: { id: proveedor.id } })).activo).toBe(true);
  });

  it("el selector solo ofrece activos como 'Razón social (NIT)'", async () => {
    const activo = await crearProveedorDePrueba({ razonSocial: "Distribuidora Andina", nit: "1020304050" });
    await crearProveedorDePrueba({ razonSocial: "Antiguo", activo: false });

    expect(await listarProveedoresParaSelector()).toEqual([
      { id: activo.id, etiqueta: "Distribuidora Andina (1020304050)", activo: true },
    ]);
  });

  it("lista por estado ordenado por razón social", async () => {
    await crearProveedorDePrueba({ razonSocial: "Zeta Limpieza" });
    await crearProveedorDePrueba({ razonSocial: "Andina" });
    await crearProveedorDePrueba({ razonSocial: "Inactivo", activo: false });

    expect((await listarProveedores({ estado: "activos" })).map((p) => p.razonSocial)).toEqual(["Andina", "Zeta Limpieza"]);
    expect((await listarProveedores({ estado: "inactivos" })).map((p) => p.razonSocial)).toEqual(["Inactivo"]);
  });
});
