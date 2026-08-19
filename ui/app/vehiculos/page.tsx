import { getVehiculos } from "@/lib/services/vehiculos";
import { Panel, Badge } from "@/components/ui";

export default async function VehiculosPage() {
  const vehiculos = await getVehiculos();

  return (
    <div className="h-full overflow-auto p-7">
      <h2 className="text-2xl mb-5">Vehículos</h2>

      {vehiculos.length === 0 ? (
        <p className="text-text-lo">Todavía no hay vehículos cargados.</p>
      ) : (
        <Panel>
          {vehiculos.map((v) => (
            <div
              key={v.id}
              className="flex justify-between items-center px-4 py-3.5 border-b border-line-soft last:border-b-0"
            >
              <div>
                <span className="font-mono font-bold text-text-hi">{v.patente}</span>{" "}
                <span className="text-text-md">{v.modelo}</span>
              </div>
              <Badge
                status={
                  v.prioridad === "CRITICA" ? "critica" : v.prioridad === "MEDIA" ? "media" : "baja"
                }
              />
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
