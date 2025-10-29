// This file is responsible for seeding all database entities using individual seed files.
import { seedEmployees } from "./entities/employees.seed";
import { seedClients } from "./entities/clients.seed";

async function runAllSeeders() {
  try {
    console.log("🚀 Starting all seeders...\n");

    // Sembrar en orden de dependencias
    await seedEmployees();
    await seedClients();

    console.log("\n✅ All seeders completed successfully!");
  } catch (error) {
    console.error("\n❌ Seeding process failed:", error);
    process.exit(1);
  }
}

runAllSeeders();