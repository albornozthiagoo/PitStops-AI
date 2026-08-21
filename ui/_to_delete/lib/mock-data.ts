import type {
  Vehiculo,
  PreOT,
  HistorialVehiculo,
} from "./types";

// ============================================================
// Datos de ejemplo. Reemplazar por fetch a /api/* cuando el
// backend (Prisma + Postgres) esté conectado — la forma de los
// tipos en lib/types.ts ya está pensada para eso.
// ============================================================

export const vehiculos: Vehiculo[] = [
  {
    id: "veh-1",
    patente: "AB183CD",
    vin: "9BWZZZ377VT004251",
    modelo: "VW Amarok 2021",
    bahia: "B-02",
    kilometraje: 64320,
    sintoma: "Ruido en frenado",
    prioridad: "critica",
    estado: "diagnosticando",
  },
  {
    id: "veh-2",
    patente: "JX902QR",
    vin: "8AJNB3F19KJ118820",
    modelo: "Toyota Hilux 2019",
    bahia: "B-04",
    kilometraje: 88010,
    sintoma: "Falla de encendido",
    prioridad: "media",
    estado: "en_cola",
  },
  {
    id: "veh-3",
    patente: "PL221ZT",
    vin: "1FTFW1E5XNK123456",
    modelo: "Ford Ranger 2022",
    bahia: "B-06",
    kilometraje: 21870,
    sintoma: "Sobrecalentamiento",
    prioridad: "critica",
    estado: "diagnosticando",
  },
  {
    id: "veh-4",
    patente: "GT445LM",
    vin: "8GGCS19X6YV098765",
    modelo: "Chevrolet S10 2020",
    bahia: "B-01",
    kilometraje: 51200,
    sintoma: "Vibración al frenar",
    prioridad: "baja",
    estado: "completado",
  },
];

export const preOts: PreOT[] = [
  {
    id: "PRE-OT #4471",
    vehiculoId: "veh-1",
    generada: "18/08/2026 11:38",
    prioridad: "critica",
    sintomaPrincipal:
      "Ruido metálico agudo tipo chirrido al frenar, más pronunciado con el sistema en frío. Pedal firme, sin pérdida de eficacia percibida por el cliente.",
    hipotesis: [
      { nombre: "Desgaste de pastillas delanteras", probabilidad: 82 },
      { nombre: "Disco con rayado profundo", probabilidad: 41 },
      { nombre: "Guía de caliper trabada", probabilidad: 23 },
    ],
    herramientas: [
      "Calibre de espesor",
      "Elevador de 2 columnas",
      "Torquímetro 80-120 Nm",
      "Kit pastillas OEM",
    ],
    tiempoEstimado: "45–60 min",
  },
];

export const historial: HistorialVehiculo[] = [
  {
    vehiculo: vehiculos[0],
    ultimaVisita: "18/08/2026",
    ots: [
      { id: "OT #4471", descripcion: "Frenos delanteros", fecha: "18/08/2026" },
      { id: "OT #4108", descripcion: "Cambio de aceite y filtros", fecha: "02/05/2026" },
      { id: "OT #3877", descripcion: "Alineación y balanceo", fecha: "14/01/2026" },
    ],
  },
  {
    vehiculo: vehiculos[1],
    ultimaVisita: "18/08/2026",
    ots: [
      { id: "OT #4465", descripcion: "Sistema de arranque", fecha: "18/08/2026" },
      { id: "OT #3990", descripcion: "Batería y alternador", fecha: "22/03/2026" },
    ],
  },
  {
    vehiculo: vehiculos[3],
    ultimaVisita: "15/08/2026",
    ots: [{ id: "OT #4440", descripcion: "Rectificado de discos", fecha: "15/08/2026" }],
  },
  {
    vehiculo: vehiculos[2],
    ultimaVisita: "18/08/2026",
    ots: [
      { id: "OT #4472", descripcion: "Sistema de refrigeración", fecha: "18/08/2026" },
      { id: "OT #4201", descripcion: "Service completo 60.000km", fecha: "30/05/2026" },
    ],
  },
];
