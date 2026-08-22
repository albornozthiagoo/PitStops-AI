/*
  Warnings:

  - A unique constraint covering the columns `[telefono]` on the table `clientes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[waMessageId]` on the table `mensajes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clienteId` to the `conversaciones` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "AutorMensaje" ADD VALUE 'CLIENTE';

-- DropForeignKey
ALTER TABLE "conversaciones" DROP CONSTRAINT "conversaciones_tecnicoId_fkey";

-- DropForeignKey
ALTER TABLE "conversaciones" DROP CONSTRAINT "conversaciones_vehiculoId_fkey";

-- AlterTable
ALTER TABLE "conversaciones" ADD COLUMN     "clienteId" TEXT NOT NULL,
ALTER COLUMN "vehiculoId" DROP NOT NULL,
ALTER COLUMN "tecnicoId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "mensajes" ADD COLUMN     "waMessageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "clientes_telefono_key" ON "clientes"("telefono");

-- CreateIndex
CREATE INDEX "conversaciones_clienteId_idx" ON "conversaciones"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "mensajes_waMessageId_key" ON "mensajes"("waMessageId");

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "vehiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "tecnicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
