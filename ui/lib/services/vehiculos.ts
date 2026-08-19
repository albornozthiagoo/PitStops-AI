// ui/lib/services/vehiculos.ts
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Tipo de retorno inferido si en el futuro agregas relaciones
export type VehiculoConRelaciones = Prisma.PromiseReturnType<typeof getVehiculos>[number];

// 1. Obtener todos los vehículos
export async function getVehiculos() {
  try {
    const vehiculos = await prisma.vehiculo.findMany({
      orderBy: { createdAt: 'desc' },
      // include: { cliente: true, taller: true },
    });
    return vehiculos;
  } catch (error) {
    console.error('Error al obtener vehículos:', error);
    throw new Error('No se pudieron cargar los vehículos');
  }
}

// 2. Crear un nuevo vehículo usando el tipo autogenerado por Prisma
export async function createVehiculo(data: Prisma.VehiculoUncheckedCreateInput) {
  try {
    return await prisma.vehiculo.create({
      data,
    });
  } catch (error) {
    console.error('Error al crear vehículo:', error);
    throw new Error('No se pudo crear el vehículo');
  }
}

// 3. Eliminar un vehículo por su ID
export async function deleteVehiculo(id: string) {
  try {
    return await prisma.vehiculo.delete({
      where: { id },
    });
  } catch (error) {
    console.error('Error al eliminar vehículo:', error);
    throw new Error('No se pudo eliminar el vehículo');
  }
}