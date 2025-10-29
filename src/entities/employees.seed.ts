import { pool } from "../config";
import { faker } from "@faker-js/faker";

export async function seedEmployees() {
  const connection = await pool.getConnection();

  try {
    console.log("🌱 Seeding empleados...");

    const employees = [];
    for (let i = 0; i < 100; i++) {
      employees.push([
        faker.person.firstName(),
        faker.person.lastName(),
        faker.internet.email(),
      ]);
    }

    await connection.query(
      `INSERT INTO empleado (nombres, apellidos, email) VALUES ?`,
      [employees]
    );

    console.log("✅ 100 empleados insertados!");
  } catch (error) {
    console.error("❌ Error seeding empleados:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Permite ejecutar: pnpm tsx src/entities/employees.seed.ts
if (require.main === module) {
  seedEmployees()
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}
