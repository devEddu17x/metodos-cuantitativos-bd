import { pool } from "../config";
import { faker } from "@faker-js/faker";

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

    const uniqueDates = generateUniqueDates(100);
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
    
    for (let i = 0; i < 100; i++) {
      // Generar referido (70% de probabilidad de tener referido)
      const hasReferral = faker.datatype.boolean({ probability: 0.7 });
      const referral = hasReferral ? 
        `${faker.person.firstName()} ${faker.person.lastName()}` : 
        null;

      // Seleccionar tipo de descripción aleatoriamente
      const descriptionGenerator = faker.helpers.arrayElement(descriptionTypes);

      // Generar número de teléfono de 9 dígitos usando faker
      const phoneNumber = faker.number.int({ min: 100000000, max: 999999999 }).toString();
      clients.push([
        phoneNumber, // telefono
        descriptionGenerator(), // descripcion
        referral, // referido
        uniqueDates[i].toISOString().split('T')[0] // fecha_primer_compra
      ]);
    }

    await connection.query(
      `INSERT INTO cliente (telefono, descripcion, referido, fecha_primer_compra) VALUES ?`,
      [clients]
    );

    console.log("✅ 100 clientes insertados!");
  } catch (error) {
    console.error("❌ Error seeding clientes:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Permite ejecutar: pnpm tsx src/entities/employees.seed.ts
if (require.main === module) {
  seedClients()
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}
