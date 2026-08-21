import { prisma } from "@/lib/prisma";

export async function getUltimoPreOt() {
  return prisma.preOT.findFirst({
    orderBy: { generada: "desc" },
    include: { hipotesis: true, herramientas: true, vehiculo: true },
  });
}
