import { pool } from "../config";
import { faker } from "@faker-js/faker";
import { RowDataPacket } from "mysql2/promise";

// Interface for ID
interface IdPacket extends RowDataPacket {
  id: number;
}

export async function seedSupplierMaterial() {
  const connection = await pool.getConnection();
  console.log("🌱 Seeding supplier_material...");

  try {
    // 1. Get all supplier and material IDs
    const [suppliers] = await connection.query<IdPacket[]>("SELECT id FROM proveedor");
    const [materials] = await connection.query<IdPacket[]>("SELECT id FROM material");

    if (suppliers.length === 0 || materials.length === 0) {
      console.log("⚠️ Cannot seed supplier_material without suppliers and materials.");
      return;
    }

    const supplierMaterialLinks = [];
    const uniqueLinks = new Set<string>();

    // 2. Create at least 200 relationships
    while (supplierMaterialLinks.length < 200) {
      const supplier = faker.helpers.arrayElement(suppliers);
      const material = faker.helpers.arrayElement(materials);
      const linkKey = `${supplier.id}-${material.id}`;

      // Avoid duplicates
      if (!uniqueLinks.has(linkKey)) {
        uniqueLinks.add(linkKey);
        supplierMaterialLinks.push([supplier.id, material.id]);
      }
    }

    // 3. Bulk insert
    await connection.query(
      `INSERT INTO proveedor_material (proveedor_id, material_id) VALUES ?`,
      [supplierMaterialLinks]
    );

    console.log(`✅ ${supplierMaterialLinks.length} supplier-material links inserted!`);
  } catch (error) {
    console.error("❌ Error seeding supplier_material:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Allow independent execution
if (require.main === module) {
  seedSupplierMaterial()
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}