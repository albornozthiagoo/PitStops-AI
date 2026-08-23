import { PrismaClient, Prioridad, EstadoVehiculo, AutorMensaje } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/auth/password";

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
  console.log("Sembrando datos de PitStops AI...");

  const taller = await prisma.taller.create({
    data: { nombre: "Central Motors — Bahía 4", direccion: "Av. 4 de Julio 1234" },
  });

  // La password en texto plano nunca queda hardcodeada en el archivo — sale
  // de una env var, con un default de desarrollo si no está seteada (con
  // warning, para que no pase desapercibido en un ambiente real).
  const seedPassword = process.env.SEED_TECNICO_PASSWORD;
  if (!seedPassword) {
    console.warn(
      "[seed] SEED_TECNICO_PASSWORD no está seteada — usando password de desarrollo por default. " +
        "No dejar así fuera de un entorno local."
    );
  }
  const tecnico = await prisma.tecnico.create({
    data: {
      legajo: "tecnico.garcia",
      nombre: "María García",
      email: "mgarcia@centralmotors.com",
      passwordHash: await hashPassword(seedPassword ?? "cambiar-esta-password-dev"),
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
  const clienteTracker = await prisma.cliente.create({
    data: { nombre: "Francisco", telefono: "+54 11 5555-0105" },
  });
  const cliente308 = await prisma.cliente.create({
    data: { nombre: "Thiago", telefono: "+54 11 5555-0106" },
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

  const tracker = await prisma.vehiculo.create({
    data: {
      patente: "HT492VD",
      vin: "9GNAAP3H24C812345",
      modelo: "Chevrolet Tracker 2023",
      bahia: "B-03",
      kilometraje: 35400,
      sintoma: "Testigo de motor encendido",
      prioridad: Prioridad.MEDIA,
      // DIAGNOSTICANDO (no EN_COLA) porque le damos una conversación +
      // Pre-OT ya generada más abajo — EN_COLA es el estado de "todavía sin
      // arrancar el diagnóstico" (ver Hilux).
      estado: EstadoVehiculo.DIAGNOSTICANDO,
      clienteId: clienteTracker.id,
      tallerId: taller.id,
    },
  });

  const peugeot308 = await prisma.vehiculo.create({
    data: {
      patente: "KM317BS",
      vin: "VF3LCVXY32B678901",
      modelo: "Peugeot 308 2020",
      bahia: "B-05",
      kilometraje: 72150,
      sintoma: "Pérdida de potencia en subida",
      prioridad: Prioridad.BAJA,
      estado: EstadoVehiculo.DIAGNOSTICANDO,
      clienteId: cliente308.id,
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
            tag: "PitStops AI",
            texto:
              "Empecemos por descartar lo más frecuente. ¿El ruido es tipo chirrido agudo o golpeteo grave? Y decime, ¿aparece con el pedal firme o se siente esponjoso?",
          },
          {
            autor: AutorMensaje.TECNICO,
            texto: "Chirrido agudo, constante. Pedal firme, sin juego.",
          },
          {
            autor: AutorMensaje.SISTEMA,
            tag: "PitStops AI · analizando patrón",
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

  // ---- Conversación + Pre-OT del Tracker (Francisco) ----
  const convTracker = await prisma.conversacion.create({
    data: {
      titulo: "Chevrolet Tracker · B-03",
      subtitulo: "Testigo de motor encendido",
      estado: EstadoVehiculo.DIAGNOSTICANDO,
      clienteId: clienteTracker.id,
      vehiculoId: tracker.id,
      tecnicoId: tecnico.id,
      mensajes: {
        create: [
          {
            autor: AutorMensaje.TECNICO,
            texto:
              "El cliente dice que se le enciende el testigo de motor de vez en cuando, sobre todo en ruta, y después se apaga solo. ¿Empezamos?",
          },
          {
            autor: AutorMensaje.SISTEMA,
            tag: "PitStops AI",
            texto:
              "Dale. ¿Notó pérdida de potencia o consumo más alto cuando está encendido el testigo, o el auto anda igual?",
          },
          {
            autor: AutorMensaje.TECNICO,
            texto: "Dice que anda igual, no nota nada raro en el manejo.",
          },
          {
            autor: AutorMensaje.SISTEMA,
            tag: "PitStops AI · analizando patrón",
            texto:
              "Testigo intermitente sin síntomas de manejo suele apuntar a algo del lado de emisiones/sensores más que mecánico. Voy a escanear los códigos guardados.",
            scanPct: 55,
          },
        ],
      },
    },
  });

  await prisma.preOT.create({
    data: {
      codigo: "PRE-OT #4522",
      prioridad: Prioridad.MEDIA,
      sintomaPrincipal:
        "Testigo de check engine intermitente: se enciende en ruta y se apaga solo después de un rato. Sin pérdida de potencia ni ruidos percibidos por el cliente.",
      tiempoEstimado: "30–45 min",
      vehiculoId: tracker.id,
      conversacionId: convTracker.id,
      hipotesis: {
        create: [
          { nombre: "Sensor de oxígeno con lectura errática", probabilidad: 65 },
          { nombre: "Tapa de combustible mal sellada", probabilidad: 38 },
          { nombre: "Bobina de encendido con falla intermitente", probabilidad: 22 },
        ],
      },
      herramientas: {
        create: [
          { nombre: "Escáner OBD-II" },
          { nombre: "Multímetro" },
          { nombre: "Kit de bujías" },
        ],
      },
    },
  });

  // ---- Conversación + Pre-OT del Peugeot 308 (Thiago) ----
  const conv308 = await prisma.conversacion.create({
    data: {
      titulo: "Peugeot 308 · B-05",
      subtitulo: "Pérdida de potencia en subida",
      estado: EstadoVehiculo.DIAGNOSTICANDO,
      clienteId: cliente308.id,
      vehiculoId: peugeot308.id,
      tecnicoId: tecnico.id,
      mensajes: {
        create: [
          {
            autor: AutorMensaje.TECNICO,
            texto:
              "El cliente reporta que en subidas pronunciadas el auto pierde fuerza, como si no acompañara. En plano anda normal.",
          },
          {
            autor: AutorMensaje.SISTEMA,
            tag: "PitStops AI",
            texto: "¿Hay algún testigo encendido en el tablero, o algún ruido nuevo del motor?",
          },
          {
            autor: AutorMensaje.TECNICO,
            texto: "No, ningún testigo. Tampoco ruidos raros.",
          },
          {
            autor: AutorMensaje.SISTEMA,
            tag: "PitStops AI · analizando patrón",
            texto:
              "Pérdida de potencia solo en exigencia, sin testigos ni ruidos, apunta más a admisión/turbo que a algo eléctrico. Corriendo el diagnóstico contra el historial de la unidad.",
            scanPct: 60,
          },
        ],
      },
    },
  });

  await prisma.preOT.create({
    data: {
      codigo: "PRE-OT #4538",
      prioridad: Prioridad.BAJA,
      sintomaPrincipal:
        "Pérdida de potencia notoria en pendientes pronunciadas; el motor no responde igual en subida. Sin ruidos ni testigos encendidos, anda normal en plano.",
      tiempoEstimado: "40–55 min",
      vehiculoId: peugeot308.id,
      conversacionId: conv308.id,
      hipotesis: {
        create: [
          { nombre: "Filtro de aire obstruido", probabilidad: 58 },
          { nombre: "Presión de turbo insuficiente", probabilidad: 34 },
          { nombre: "Sensor MAP descalibrado", probabilidad: 19 },
        ],
      },
      herramientas: {
        create: [
          { nombre: "Escáner OBD-II" },
          { nombre: "Manómetro de presión de turbo" },
          { nombre: "Filtro de aire nuevo" },
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
