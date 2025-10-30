import { pool } from "../config";
import { faker } from "@faker-js/faker";
import { RowDataPacket } from "mysql2/promise";

// Interfaces for IDs
interface GarmentSizePacket extends RowDataPacket {
  prenda_id: number;
  talla_id: number;
}
interface MaterialPacket extends RowDataPacket {
  id: number;
}

export async function seedGarmentSizeMaterial() {
  const connection = await pool.getConnection();
  console.log("🌱 Seeding garment_size_material...");

  try {
    // 1. Get all garment_size combinations and materials
    const [garmentSizes] = await connection.query<GarmentSizePacket[]>("SELECT prenda_id, talla_id FROM prenda_talla");
    const [materials] = await connection.query<MaterialPacket[]>("SELECT id FROM material");

    if (garmentSizes.length === 0 || materials.length === 0) {
      console.log("⚠️ Cannot seed garment_size_material without garment_size and materials.");
      return;
    }

    const gsmLinks = [];
    const uniqueLinks = new Set<string>();

    // 2. Assign 1 or 2 materials to each garment_size combination
    for (const gs of garmentSizes) {
      const numMaterials = faker.number.int({ min: 1, max: 2 });
      const assignedMaterials = faker.helpers.arrayElements(materials, numMaterials);

      for (const material of assignedMaterials) {
        const linkKey = `${gs.prenda_id}-${gs.talla_id}-${material.id}`;
        if (!uniqueLinks.has(linkKey)) {
          uniqueLinks.add(linkKey);
          
          // Amount of material used (e.g., 0.1 to 1.5 units)
          const quantity = faker.number.float({ min: 0.1, max: 1.5, fractionDigits: 2 });
          
          gsmLinks.push([
            gs.prenda_id,
            gs.talla_id,
            material.id,
            quantity
          ]);
        }
      }
    }

    // 3. Bulk insert
    await connection.query(
      `INSERT INTO prenda_talla_material (prenda_id, talla_id, material_id, cantidad) VALUES ?`,
      [gsmLinks]
    );

    console.log(`✅ ${gsmLinks.length} garment-size-material links inserted!`);
  } catch (error) {
    console.error("❌ Error seeding garment_size_material:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Allow independent execution
if (require.main === module) {
  seedGarmentSizeMaterial()
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}
