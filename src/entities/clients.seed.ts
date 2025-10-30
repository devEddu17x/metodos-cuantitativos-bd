import { pool } from "../config";
import { faker } from "@faker-js/faker";
import { RowDataPacket } from "mysql2/promise";

export async function seedClients() {
  const connection = await pool.getConnection();

  try {
    console.log("🌱 Seeding clientes...");

    // Generar fechas únicas desde 2018 (máximo 10 por mes)
    const generateUniqueDates = (count: number) => {
      const dates = [];
      const startYear = 2018;
      const endYear = 2024;

      for (let year = startYear; year <= endYear && dates.length < count; year++) {
        for (let month = 1; month <= 12 && dates.length < count; month++) {
          const daysInMonth = new Date(year, month, 0).getDate();
          const datesInThisMonth = Math.min(10, count - dates.length);

          const usedDays = new Set();
          for (let i = 0; i < datesInThisMonth; i++) {
            let day;
            do {
              day = faker.number.int({ min: 1, max: daysInMonth });
            } while (usedDays.has(day));

            usedDays.add(day);
            dates.push(new Date(year, month - 1, day));
          }
        }
      }

      // Mezclar las fechas para distribuirlas aleatoriamente
      return faker.helpers.shuffle(dates);
    };

    const uniqueDates = generateUniqueDates(200);
    const clients = [];

    // Tipos de descripciones para identificar clientes (válido para natural y jurídico)
    const descriptionTypes = [
      () => `Cliente recomendado por ${faker.person.firstName()}`,
      () => `Referido por ${faker.company.name()}`,
      () => `Cliente del banco ${faker.company.name()}`,
      () => `Proveedor de ${faker.company.name()}`,
      () => `Socio comercial de ${faker.company.name()}`,
      () => `Cliente corporativo de ${faker.location.city()}`,
      () => `Empresa del sector ${faker.commerce.department()}`,
      () => `Negocio ubicado en ${faker.location.streetAddress()}`,
      () => `Cliente desde ${faker.date.past({ years: 3 }).getFullYear()}`,
      () => `Contacto comercial de ${faker.person.firstName()}`,
      () => `Cliente mayorista de ${faker.location.city()}`,
      () => `Distribuidor autorizado`,
      () => `Cliente frecuente del local`,
      () => `Empresa asociada a ${faker.company.name()}`,
      () => `Cliente del área comercial`,
      () => `Referido por publicidad online`,
      () => `Cliente walk-in`,
      () => `Contacto de ferias comerciales`,
      () => `Cliente de ${faker.location.city()}`,
      () => `Referido por redes sociales`,
      () => `Cliente corporativo premium`,
      () => `Contacto directo de ventas`,
      () => `Cliente del sector empresarial`
    ];

    for (let i = 0; i < 200; i++) {
      // Generar referido (70% de probabilidad de tener referido)
      const hasReferral = faker.datatype.boolean({ probability: 0.7 });
      const referral = hasReferral ? 
        `${faker.person.firstName()} ${faker.person.lastName()}` :
        null;

      // Seleccionar tipo de descripción aleatoriamente
      const descriptionGenerator = faker.helpers.arrayElement(descriptionTypes);

      clients.push([
        `+51 9${faker.string.numeric(8)}`, // telefono
        descriptionGenerator(), // descripcion
        referral, // referido
        uniqueDates[i].toISOString().split('T')[0] // fecha_primer_compra
      ]);
    }

    await connection.query(
      `INSERT INTO cliente (telefono, descripcion, referido, fecha_primer_compra) VALUES ?`,
      [clients]
    );

    console.log("✅ 200 clientes insertados!");
  
    console.log("🌱 Asignando clientes naturales y jurídicos...");

    const [availableClients] = await connection.query<(RowDataPacket & { id: number })[]>(`
      SELECT id FROM cliente 
      WHERE id NOT IN (SELECT cliente_id FROM cliente_natural) 
      AND id NOT IN (SELECT cliente_id FROM cliente_juridico)
      LIMIT 200
    `);

    if (!Array.isArray(availableClients) || availableClients.length < 200) {
      console.log("⚠️ No se encontraron suficientes clientes base para asignar. Se encontraron:", availableClients.length);
      throw new Error("No hay suficientes clientes base para continuar el seeding.");
    }

    // --- PASO 3: Preparar datos para Naturales y Jurídicos ---

    const naturalClientIds = availableClients.slice(0, 100);
    const juridicoClientIds = availableClients.slice(100, 200);

    const clientsNatural = [];
    const clientsJuridico = [];

    // Generar datos para 100 clientes naturales
    for (const client of naturalClientIds) {
      clientsNatural.push([
        faker.number.int({ min: 10000000, max: 99999999 }).toString(), // DNI
        faker.person.firstName(), // Nombre
        faker.person.lastName(), // Apellido
        client.id // ID del cliente
      ]);
    }

    // Generar datos para 100 clientes jurídicos
    for (const client of juridicoClientIds) {
      clientsJuridico.push([
        faker.string.numeric(11), // RUC
        faker.company.name(), // Razón Social
        faker.helpers.maybe(() => faker.person.fullName(), { probability: 0.8 }), // Delegado
        client.id // ID del cliente
      ]);
    }

    // --- PASO 4: Insertar 100 Clientes Naturales ---
    await connection.query(
      `INSERT INTO cliente_natural (dni, nombre, apellido, cliente_id) VALUES ?`,
      [clientsNatural]
    );
    console.log(`✅ ${clientsNatural.length} clientes naturales insertados!`);

    // --- PASO 5: Insertar 100 Clientes Jurídicos ---
    await connection.query(
      `INSERT INTO cliente_juridico (ruc, razon_social, delegado, cliente_id) VALUES ?`,
      [clientsJuridico]
    );
    console.log(`✅ ${clientsJuridico.length} clientes jurídicos insertados!`);

  } catch (error) {
    console.error("❌ Error seeding clientes (combinado):", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Permite ejecutar: pnpm tsx src/entities/clients.seed.ts
if (require.main === module) {
  seedClients()
    .then(() => {
      console.log("Seeding de clientes (combinado) completado.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding de clientes (combinado) falló:", error);
      process.exit(1);
    });
}
