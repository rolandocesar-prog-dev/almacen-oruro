-- CreateEnum
CREATE TYPE "motivo_cierre_sesion" AS ENUM ('USUARIO', 'EXPIRADA', 'DESACTIVACION', 'RESTABLECIMIENTO');

-- CreateEnum
CREATE TYPE "estado_documento" AS ENUM ('REGISTRADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "estado_pedido" AS ENUM ('PENDIENTE', 'PARCIAL', 'ATENDIDO', 'ANULADO');

-- CreateEnum
CREATE TYPE "tipo_movimiento" AS ENUM ('ENTRADA_COMPRA', 'SALIDA_DISTRIBUCION', 'ANULACION_COMPRA', 'ANULACION_DISTRIBUCION');

-- CreateEnum
CREATE TYPE "tipo_informe" AS ENUM ('COMPRAS', 'DISTRIBUCIONES');

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "apellido" VARCHAR(60) NOT NULL,
    "cargo" VARCHAR(60) NOT NULL,
    "direccion" VARCHAR(150),
    "telefono" VARCHAR(20),
    "nombre_usuario" VARCHAR(30) NOT NULL,
    "contrasena_hash" VARCHAR(100) NOT NULL,
    "debe_cambiar_contrasena" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesion" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "inicio" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fin" TIMESTAMPTZ(3),
    "motivo_cierre" "motivo_cierre_sesion",
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "nombre_normalizado" VARCHAR(60) NOT NULL,
    "descripcion" VARCHAR(200),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidad_medida" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(40) NOT NULL,
    "nombre_normalizado" VARCHAR(40) NOT NULL,
    "abreviatura" VARCHAR(10) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "unidad_medida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "nombre_normalizado" VARCHAR(80) NOT NULL,
    "descripcion" VARCHAR(200),
    "categoria_id" INTEGER NOT NULL,
    "unidad_medida_id" INTEGER NOT NULL,
    "stock_actual" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedor" (
    "id" SERIAL NOT NULL,
    "razon_social" VARCHAR(100) NOT NULL,
    "nit" VARCHAR(20) NOT NULL,
    "contacto_nombre" VARCHAR(80),
    "telefono" VARCHAR(20),
    "correo" VARCHAR(100),
    "direccion" VARCHAR(150),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedor_producto" (
    "id" SERIAL NOT NULL,
    "proveedor_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "precio_referencial" DECIMAL(12,2),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "proveedor_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centro_salud" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "nombre_normalizado" VARCHAR(100) NOT NULL,
    "telefono" VARCHAR(20),
    "direccion" VARCHAR(150),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "centro_salud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "representante" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "apellido" VARCHAR(60) NOT NULL,
    "ci" VARCHAR(15) NOT NULL,
    "servicio" VARCHAR(60) NOT NULL,
    "telefono" VARCHAR(20),
    "centro_salud_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "representante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compra" (
    "id" SERIAL NOT NULL,
    "proveedor_id" INTEGER NOT NULL,
    "nro_factura" VARCHAR(20) NOT NULL,
    "fecha" DATE NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "observacion" VARCHAR(200),
    "estado" "estado_documento" NOT NULL DEFAULT 'REGISTRADA',
    "motivo_anulacion" VARCHAR(200),
    "anulada_en" TIMESTAMPTZ(3),
    "anulada_por_id" INTEGER,
    "usuario_id" INTEGER NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compra_detalle" (
    "id" SERIAL NOT NULL,
    "compra_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "compra_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido" (
    "id" SERIAL NOT NULL,
    "representante_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "observacion" VARCHAR(200),
    "estado" "estado_pedido" NOT NULL DEFAULT 'PENDIENTE',
    "motivo_anulacion" VARCHAR(200),
    "anulada_en" TIMESTAMPTZ(3),
    "anulada_por_id" INTEGER,
    "usuario_id" INTEGER NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_detalle" (
    "id" SERIAL NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad_solicitada" INTEGER NOT NULL,
    "cantidad_entregada" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pedido_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribucion" (
    "id" SERIAL NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "nro_vale" VARCHAR(20) NOT NULL,
    "fecha" DATE NOT NULL,
    "observacion" VARCHAR(200),
    "estado" "estado_documento" NOT NULL DEFAULT 'REGISTRADA',
    "motivo_anulacion" VARCHAR(200),
    "anulada_en" TIMESTAMPTZ(3),
    "anulada_por_id" INTEGER,
    "usuario_id" INTEGER NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "distribucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribucion_detalle" (
    "id" SERIAL NOT NULL,
    "distribucion_id" INTEGER NOT NULL,
    "pedido_detalle_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "distribucion_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento_inventario" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "fecha_documento" DATE NOT NULL,
    "registrado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "tipo_movimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "saldo_resultante" INTEGER NOT NULL,
    "compra_id" INTEGER,
    "distribucion_id" INTEGER,
    "usuario_id" INTEGER NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "movimiento_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "informe_ia" (
    "id" SERIAL NOT NULL,
    "tipo" "tipo_informe" NOT NULL,
    "desde" DATE NOT NULL,
    "hasta" DATE NOT NULL,
    "datos_entrada" JSONB NOT NULL,
    "texto" TEXT NOT NULL,
    "modelo" VARCHAR(60) NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "informe_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "modo_demostracion" BOOLEAN NOT NULL DEFAULT false,
    "datos_simulados_en" TIMESTAMPTZ(3),
    "semilla_simulacion" INTEGER,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_nombre_usuario_key" ON "usuario"("nombre_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "sesion_token_hash_key" ON "sesion"("token_hash");

-- CreateIndex
CREATE INDEX "sesion_usuario_id_inicio_idx" ON "sesion"("usuario_id", "inicio");

-- CreateIndex
CREATE INDEX "sesion_inicio_idx" ON "sesion"("inicio");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_nombre_normalizado_key" ON "categoria"("nombre_normalizado");

-- CreateIndex
CREATE UNIQUE INDEX "unidad_medida_nombre_normalizado_key" ON "unidad_medida"("nombre_normalizado");

-- CreateIndex
CREATE UNIQUE INDEX "producto_codigo_key" ON "producto"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "producto_nombre_normalizado_key" ON "producto"("nombre_normalizado");

-- CreateIndex
CREATE INDEX "producto_categoria_id_idx" ON "producto"("categoria_id");

-- CreateIndex
CREATE UNIQUE INDEX "proveedor_nit_key" ON "proveedor"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "proveedor_producto_proveedor_id_producto_id_key" ON "proveedor_producto"("proveedor_id", "producto_id");

-- CreateIndex
CREATE UNIQUE INDEX "centro_salud_nombre_normalizado_key" ON "centro_salud"("nombre_normalizado");

-- CreateIndex
CREATE UNIQUE INDEX "representante_ci_key" ON "representante"("ci");

-- CreateIndex
CREATE INDEX "representante_centro_salud_id_idx" ON "representante"("centro_salud_id");

-- CreateIndex
CREATE INDEX "compra_fecha_idx" ON "compra"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "compra_factura_vigente_unica" ON "compra"("proveedor_id", "nro_factura") WHERE (estado = 'REGISTRADA');

-- CreateIndex
CREATE UNIQUE INDEX "compra_detalle_compra_id_producto_id_key" ON "compra_detalle"("compra_id", "producto_id");

-- CreateIndex
CREATE INDEX "pedido_estado_fecha_idx" ON "pedido"("estado", "fecha");

-- CreateIndex
CREATE INDEX "pedido_representante_id_idx" ON "pedido"("representante_id");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_detalle_pedido_id_producto_id_key" ON "pedido_detalle"("pedido_id", "producto_id");

-- CreateIndex
CREATE INDEX "distribucion_fecha_idx" ON "distribucion"("fecha");

-- CreateIndex
CREATE INDEX "distribucion_pedido_id_idx" ON "distribucion"("pedido_id");

-- CreateIndex
CREATE UNIQUE INDEX "distribucion_vale_vigente_unico" ON "distribucion"("nro_vale") WHERE (estado = 'REGISTRADA');

-- CreateIndex
CREATE UNIQUE INDEX "distribucion_detalle_distribucion_id_pedido_detalle_id_key" ON "distribucion_detalle"("distribucion_id", "pedido_detalle_id");

-- CreateIndex
CREATE INDEX "movimiento_inventario_producto_id_id_idx" ON "movimiento_inventario"("producto_id", "id");

-- CreateIndex
CREATE INDEX "movimiento_inventario_producto_id_fecha_documento_idx" ON "movimiento_inventario"("producto_id", "fecha_documento");

-- CreateIndex
CREATE INDEX "movimiento_inventario_fecha_documento_idx" ON "movimiento_inventario"("fecha_documento");

-- CreateIndex
CREATE INDEX "informe_ia_tipo_creado_en_idx" ON "informe_ia"("tipo", "creado_en");

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_unidad_medida_id_fkey" FOREIGN KEY ("unidad_medida_id") REFERENCES "unidad_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_producto" ADD CONSTRAINT "proveedor_producto_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_producto" ADD CONSTRAINT "proveedor_producto_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "representante" ADD CONSTRAINT "representante_centro_salud_id_fkey" FOREIGN KEY ("centro_salud_id") REFERENCES "centro_salud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_anulada_por_id_fkey" FOREIGN KEY ("anulada_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_detalle" ADD CONSTRAINT "compra_detalle_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_detalle" ADD CONSTRAINT "compra_detalle_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_representante_id_fkey" FOREIGN KEY ("representante_id") REFERENCES "representante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_anulada_por_id_fkey" FOREIGN KEY ("anulada_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_detalle" ADD CONSTRAINT "pedido_detalle_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_detalle" ADD CONSTRAINT "pedido_detalle_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribucion" ADD CONSTRAINT "distribucion_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribucion" ADD CONSTRAINT "distribucion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribucion" ADD CONSTRAINT "distribucion_anulada_por_id_fkey" FOREIGN KEY ("anulada_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribucion_detalle" ADD CONSTRAINT "distribucion_detalle_distribucion_id_fkey" FOREIGN KEY ("distribucion_id") REFERENCES "distribucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribucion_detalle" ADD CONSTRAINT "distribucion_detalle_pedido_detalle_id_fkey" FOREIGN KEY ("pedido_detalle_id") REFERENCES "pedido_detalle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_distribucion_id_fkey" FOREIGN KEY ("distribucion_id") REFERENCES "distribucion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informe_ia" ADD CONSTRAINT "informe_ia_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
