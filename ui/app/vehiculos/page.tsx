import { getVehiculos, VehiculoConRelaciones } from '@/lib/services/vehiculos';
import { VehiculoForm } from '@/components/vehiculos/vehiculo-form';

export default async function VehiculosPage() {
  const vehiculos = await getVehiculos();

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestión de Vehículos</h1>
      </div>

      {/* Formulario para registrar un nuevo vehículo */}
      {/* Nota: Usamos IDs temporales hasta integrar la selección dinámica de cliente y taller */}
      <VehiculoForm clienteId="temp-cliente-id" tallerId="temp-taller-id" />

      {/* Listado de vehículos */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Vehículos en Taller</h2>
        {vehiculos.length === 0 ? (
          <p className="text-gray-500">No hay vehículos registrados actualmente.</p>
        ) : (
          <div className="grid gap-4">
            {vehiculos.map((v: VehiculoConRelaciones) => (
              <div key={v.id} className="p-4 border rounded-lg shadow-sm flex justify-between items-center bg-white">
                <div>
                  <p className="font-bold text-lg">{v.patente} — {v.marca} {v.modelo}</p>
                  <p className="text-sm text-gray-600">Síntoma: {v.sintoma}</p>
                  <p className="text-xs text-gray-400">Km: {v.kilometraje} | VIN: {v.vin}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}