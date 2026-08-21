export type Prioridad = "critica" | "media" | "baja";
export type EstadoVehiculo = "diagnosticando" | "en_cola" | "completado";

export interface Vehiculo {
  id: string;
  patente: string;
  vin: string;
  modelo: string;
  bahia: string;
  kilometraje: number;
  sintoma: string;
  prioridad: Prioridad;
  estado: EstadoVehiculo;
}

export interface Hipotesis {
  nombre: string;
  probabilidad: number; // 0-100
}

export interface PreOT {
  id: string;
  vehiculoId: string;
  generada: string;
  prioridad: Prioridad;
  sintomaPrincipal: string;
  hipotesis: Hipotesis[];
  herramientas: string[];
  tiempoEstimado: string;
}

export interface OTHistorial {
  id: string;
  descripcion: string;
  fecha: string;
}

export interface HistorialVehiculo {
  vehiculo: Vehiculo;
  ultimaVisita: string;
  ots: OTHistorial[];
}
