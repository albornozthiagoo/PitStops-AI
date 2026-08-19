'use server';

import { createVehiculo, deleteVehiculo } from '@/lib/services/vehiculos';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

export async function addVehiculoAction(data: Prisma.VehiculoUncheckedCreateInput) {
  try {
    await createVehiculo(data);
    revalidatePath('/vehiculos');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'No se pudo registrar el vehículo' };
  }
}

export async function removeVehiculoAction(id: string) {
  try {
    await deleteVehiculo(id);
    revalidatePath('/vehiculos');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'No se pudo eliminar el vehículo' };
  }
}