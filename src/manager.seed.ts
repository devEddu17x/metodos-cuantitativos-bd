// This file is responsible for seeding all database entities using individual seed files.
import { seedEmployees } from "./entities/employees.seed";
import { seedClients } from "./entities/clients.seed";
import { seedSuppliers } from "./entities/suppliers.seed";
import { seedAddresses } from "./entities/address.seed";
import { seedGarments } from "./entities/garments.seed";
import { seedSizes } from "./entities/sizes.seed";
import { seedMaterials } from "./entities/materials.seed";
import { seedSupplierMaterial } from "./entities/supplier_material.seed";
import { seedGarmentSize } from "./entities/garment_size.seed";
import { seedGarmentSizeMaterial } from "./entities/garment_size_material.seed";
import { seedQuotation } from "./entities/quotation.seed";
import { seedOrder } from "./entities/order.seed";
import { seedPayment } from "./entities/payment.seed";
import { generatePricesPerGarmentSize } from "./entities/helpers/generate-prices-per-garment-size";


async function runAllSeeders() {
  try {
    console.log("🚀 Starting all seeders...\n");

    // Sembrar en orden de dependencias
    await seedEmployees();
    await seedClients();
    await seedSuppliers();
    await seedAddresses();
    await seedGarments();
    await seedSizes();
    await seedMaterials();
    await seedSupplierMaterial();
    await seedGarmentSize();
    await seedGarmentSizeMaterial();
    await generatePricesPerGarmentSize(); //  prices per size
    await seedQuotation();
    // await seedOrder();   
    // await seedPayment();


    console.log("\n✅ All seeders completed successfully!");
  } catch (error) {
    console.error("\n❌ Seeding process failed:", error);
    process.exit(1);
  }
}

runAllSeeders().then(() => process.exit(0));