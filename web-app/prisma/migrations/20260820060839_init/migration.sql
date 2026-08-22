-- CreateEnum
CREATE TYPE "Prioridad" AS ENUM ('CRITICA', 'MEDIA', 'BAJA');

-- CreateEnum
CREATE TYPE "EstadoVehiculo" AS ENUM ('DIAGNOSTICANDO', 'EN_COLA', 'COMPLETADO');

-- CreateEnum
CREATE TYPE "AutorMensaje" AS ENUM ('TECNICO', 'SISTEMA');

-- CreateEnum
CREATE TYPE "RolTecnico" AS ENUM ('TECNICO', 'SUPERVISOR', 'ADMIN');

-- CreateTable
CREATE TABLE "talleres" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "talleres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tecnicos" (
    "id" TEXT NOT NULL,
    "legajo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "iniciales" TEXT NOT NULL,
    "rol" "RolTecnico" NOT NULL DEFAULT 'TECNICO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tallerId" TEXT NOT NULL,

    CONSTRAINT "tecnicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehiculos" (
    "id" TEXT NOT NULL,
    "patente" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "bahia" TEXT,
    "kilometraje" INTEGER NOT NULL,
    "sintoma" TEXT NOT NULL,
    "prioridad" "Prioridad" NOT NULL DEFAULT 'MEDIA',
    "estado" "EstadoVehiculo" NOT NULL DEFAULT 'EN_COLA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,

    CONSTRAINT "vehiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversaciones" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "subtitulo" TEXT NOT NULL,
    "estado" "EstadoVehiculo" NOT NULL DEFAULT 'EN_COLA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vehiculoId" TEXT NOT NULL,
    "tecnicoId" TEXT NOT NULL,

    CONSTRAINT "conversaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" TEXT NOT NULL,
    "autor" "AutorMensaje" NOT NULL,
    "texto" TEXT NOT NULL,
    "tag" TEXT,
    "scanPct" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversacionId" TEXT NOT NULL,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_ots" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "generada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prioridad" "Prioridad" NOT NULL,
    "sintomaPrincipal" TEXT NOT NULL,
    "tiempoEstimado" TEXT NOT NULL,
    "aprobada" BOOLEAN NOT NULL DEFAULT false,
    "vehiculoId" TEXT NOT NULL,
    "conversacionId" TEXT NOT NULL,

    CONSTRAINT "pre_ots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hipotesis" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "probabilidad" INTEGER NOT NULL,
    "preOtId" TEXT NOT NULL,

    CONSTRAINT "hipotesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "herramientas_sugeridas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "preOtId" TEXT NOT NULL,

    CONSTRAINT "herramientas_sugeridas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_trabajo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehiculoId" TEXT NOT NULL,
    "preOtId" TEXT,
    "aprobadaPorId" TEXT,

    CONSTRAINT "ordenes_trabajo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tecnicos_legajo_key" ON "tecnicos"("legajo");

-- CreateIndex
CREATE UNIQUE INDEX "tecnicos_email_key" ON "tecnicos"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vehiculos_patente_key" ON "vehiculos"("patente");

-- CreateIndex
CREATE UNIQUE INDEX "vehiculos_vin_key" ON "vehiculos"("vin");

-- CreateIndex
CREATE INDEX "vehiculos_tallerId_estado_idx" ON "vehiculos"("tallerId", "estado");

-- CreateIndex
CREATE INDEX "conversaciones_vehiculoId_idx" ON "conversaciones"("vehiculoId");

-- CreateIndex
CREATE INDEX "mensajes_conversacionId_createdAt_idx" ON "mensajes"("conversacionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "pre_ots_codigo_key" ON "pre_ots"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "pre_ots_conversacionId_key" ON "pre_ots"("conversacionId");

-- CreateIndex
CREATE INDEX "pre_ots_vehiculoId_idx" ON "pre_ots"("vehiculoId");

-- CreateIndex
CREATE INDEX "hipotesis_preOtId_idx" ON "hipotesis"("preOtId");

-- CreateIndex
CREATE INDEX "herramientas_sugeridas_preOtId_idx" ON "herramientas_sugeridas"("preOtId");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_trabajo_codigo_key" ON "ordenes_trabajo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_trabajo_preOtId_key" ON "ordenes_trabajo"("preOtId");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_vehiculoId_fecha_idx" ON "ordenes_trabajo"("vehiculoId", "fecha");

-- AddForeignKey
ALTER TABLE "tecnicos" ADD CONSTRAINT "tecnicos_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "vehiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "tecnicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "conversaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_ots" ADD CONSTRAINT "pre_ots_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "vehiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_ots" ADD CONSTRAINT "pre_ots_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "conversaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hipotesis" ADD CONSTRAINT "hipotesis_preOtId_fkey" FOREIGN KEY ("preOtId") REFERENCES "pre_ots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "herramientas_sugeridas" ADD CONSTRAINT "herramientas_sugeridas_preOtId_fkey" FOREIGN KEY ("preOtId") REFERENCES "pre_ots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "vehiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_preOtId_fkey" FOREIGN KEY ("preOtId") REFERENCES "pre_ots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_aprobadaPorId_fkey" FOREIGN KEY ("aprobadaPorId") REFERENCES "tecnicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
