-- CreateEnum
CREATE TYPE "ControladoPor" AS ENUM ('IA', 'TECNICO');

-- AlterTable
ALTER TABLE "conversaciones" ADD COLUMN     "controladoPor" "ControladoPor" NOT NULL DEFAULT 'IA';
