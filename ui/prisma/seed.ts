import { PrismaClient, Prioridad, EstadoVehiculo, AutorMensaje } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// prisma db seed corre como script aparte del resto de la app — necesita su
// propia instancia con adapter, igual que lib/prisma.ts. Usa DIRECT_URL
// (la misma que prisma.config.ts) porque es la que corre en el mismo
// contexto que las migraciones.
const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Sembrando datos de PitStop AI...");

  const taller = await prisma.taller.create({
    data: { nombre: "Central Motors — Bahía 4", direccion: "Av. Siempre Viva 1234" },
  });

  const tecnico = await prisma.tecnico.create({
    data: {
      legajo: "tecnico.garcia",
      nombre: "María García",
      email: "mgarcia@centralmotors.com",
      // En producción: hashear con bcrypt/argon2 antes de guardar. Nunca texto plano.
      passwordHash: "REEMPLAZAR_POR_HASH_REAL",
      iniciales: "MG",
      tallerId: taller.id,
    },
  });

  const clienteAmarok = await prisma.cliente.create({
    data: { nombre: "Roberto Sosa", telefono: "+54 11 5555-0101" },
  });
  const clienteHilux = await prisma.cliente.create({
    data: { nombre: "Fabiana Ruiz", telefono: "+54 11 5555-0102" },
  });
  const clienteRanger = await prisma.cliente.create({
    data: { nombre: "Diego Paz", telefono: "+54 11 5555-0103" },
  });
  const clienteS10 = await prisma.cliente.create({
    data: { nombre: "Lucía Ferrari", telefono: "+54 11 5555-0104" },
  });

  const amarok = await prisma.vehiculo.create({
    data: {
      patente: "AB183CD",
      vin: "9BWZZZ377VT004251",
      modelo: "VW Amarok 2021",
      bahia: "B-02",
      kilometraje: 64320,
      sintoma: "Ruido en frenado",
      prioridad: Prioridad.CRITICA,
      estado: EstadoVehiculo.DIAGNOSTICANDO,
      clienteId: clienteAmarok.id,
      tallerId: taller.id,
    },
  });

  const hilux = await prisma.vehiculo.create({
    data: {
      patente: "JX902QR",
      vin: "8AJNB3F19KJ118820",
      modelo: "Toyota Hilux 2019",
      bahia: "B-04",
      kilometraje: 88010,
      sintoma: "Falla de encendido",
      prioridad: Prioridad.MEDIA,
      estado: EstadoVehiculo.EN_COLA,
      clienteId: clienteHilux.id,
      tallerId: taller.id,
    },
  });

  const ranger = await prisma.vehiculo.create({
    data: {
      patente: "PL221ZT",
      vin: "1FTFW1E5XNK123456",
      modelo: "Ford Ranger 2022",
      bahia: "B-06",
      kilometraje: 21870,
      sintoma: "Sobrecalentamiento",
      prioridad: Prioridad.CRITICA,
      estado: EstadoVehiculo.DIAGNOSTICANDO,
      clienteId: clienteRanger.id,
      tallerId: taller.id,
    },
  });

  const s10 = await prisma.vehiculo.create({
    data: {
      patente: "GT445LM",
      vin: "8GGCS19X6YV098765",
      modelo: "Chevrolet S10 2020",
      bahia: "B-01",
      kilometraje: 51200,
      sintoma: "Vibración al frenar",
      prioridad: Prioridad.BAJA,
      estado: EstadoVehiculo.COMPLETADO,
      clienteId: clienteS10.id,
      tallerId: taller.id,
    },
  });

  // ---- Conversación + mensajes del Amarok (la que se ve en el chat) ----
  const conv = await prisma.conversacion.create({
    data: {
      titulo: "VW Amarok · B-02",
      subtitulo: "Ruido metálico en frenado",
      estado: EstadoVehiculo.DIAGNOSTICANDO,
      clienteId: clienteAmarok.id,
      vehiculoId: amarok.id,
      tecnicoId: tecnico.id,
      mensajes: {
        create: [
          {
            autor: AutorMensaje.TECNICO,
            texto:
              "Buenas, el cliente reporta un ruido metálico al frenar, más fuerte en frío. ¿Con qué empiezo?",
          },
          {
            autor: AutorMensaje.SISTEMA,
            tag: "PitStop AI",
            texto:
              "Empecemos por descartar lo más frecuente. ¿El ruido es tipo chirrido agudo o golpeteo grave? Y decime, ¿aparece con el pedal firme o se siente esponjoso?",
          },
          {
            autor: AutorMensaje.TECNICO,
            texto: "Chirrido agudo, constante. Pedal firme, sin juego.",
          },
          {
            autor: AutorMensaje.SISTEMA,
            tag: "PitStop AI · analizando patrón",
            texto:
              "Con pedal firme y chirrido agudo constante, la hipótesis principal apunta a desgaste de pastillas con indicador metálico en contacto. Voy a correr el diagnóstico contra el historial de la unidad.",
            scanPct: 70,
          },
        ],
      },
    },
  });

  // Conversaciones simples para Hilux y Ranger (sin Pre-OT todavía)
  await prisma.conversacion.create({
    data: {
      titulo: "Toyota Hilux · B-04",
      subtitulo: "Arranque intermitente",
      estado: EstadoVehiculo.EN_COLA,
      clienteId: clienteHilux.id,
      vehiculoId: hilux.id,
      tecnicoId: tecnico.id,
      mensajes: {
        create: [
          {
            autor: AutorMensaje.TECNICO,
            texto: "El vehículo no arranca en frío, a veces necesita 3 o 4 intentos.",
          },
        ],
      },
    },
  });

  await prisma.conversacion.create({
    data: {
      titulo: "Ford Ranger · B-06",
      subtitulo: "Temperatura elevada",
      estado: EstadoVehiculo.DIAGNOSTICANDO,
      clienteId: clienteRanger.id,
      vehiculoId: ranger.id,
      tecnicoId: tecnico.id,
      mensajes: {
        create: [
          {
            autor: AutorMensaje.TECNICO,
            texto: "La aguja de temperatura sube por encima de lo normal en ruta.",
          },
        ],
      },
    },
  });

  // ---- Pre-OT del Amarok, con hipótesis y herramientas ----
  await prisma.preOT.create({
    data: {
      codigo: "PRE-OT #4471",
      prioridad: Prioridad.CRITICA,
      sintomaPrincipal:
        "Ruido metálico agudo tipo chirrido al frenar, más pronunciado con el sistema en frío. Pedal firme, sin pérdida de eficacia percibida por el cliente.",
      tiempoEstimado: "45–60 min",
      vehiculoId: amarok.id,
      conversacionId: conv.id,
      hipotesis: {
        create: [
          { nombre: "Desgaste de pastillas delanteras", probabilidad: 82 },
          { nombre: "Disco con rayado profundo", probabilidad: 41 },
          { nombre: "Guía de caliper trabada", probabilidad: 23 },
        ],
      },
      herramientas: {
        create: [
          { nombre: "Calibre de espesor" },
          { nombre: "Elevador de 2 columnas" },
          { nombre: "Torquímetro 80-120 Nm" },
          { nombre: "Kit pastillas OEM" },
        ],
      },
    },
  });

  // ---- Historial de OTs ya completadas ----
  await prisma.ordenTrabajo.createMany({
    data: [
      { codigo: "OT #4108", descripcion: "Cambio de aceite y filtros", vehiculoId: amarok.id, fecha: new Date("2026-05-02") },
      { codigo: "OT #3877", descripcion: "Alineación y balanceo", vehiculoId: amarok.id, fecha: new Date("2026-01-14") },
      { codigo: "OT #4465", descripcion: "Sistema de arranque", vehiculoId: hilux.id, fecha: new Date("2026-08-18") },
      { codigo: "OT #3990", descripcion: "Batería y alternador", vehiculoId: hilux.id, fecha: new Date("2026-03-22") },
      { codigo: "OT #4440", descripcion: "Rectificado de discos", vehiculoId: s10.id, fecha: new Date("2026-08-15") },
      { codigo: "OT #4201", descripcion: "Service completo 60.000km", vehiculoId: ranger.id, fecha: new Date("2026-05-30") },
    ],
  });

  console.log("Listo. Datos cargados en:", taller.nombre);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
