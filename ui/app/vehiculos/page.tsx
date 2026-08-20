import { getVehiculos } from "@/lib/services/vehiculos";
import { Panel, Badge } from "@/components/ui";

// Esta página depende de la base de datos en cada visita — nunca debe
// prerenderizarse en build time. Sin esto, Next.js intenta generarla como
// página estática durante `next build`, y si DATABASE_URL no está disponible
// en ese momento (CI, build local sin .env, etc.) el build entero falla.
export const dynamic = "force-dynamic";

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
