import { pool } from "../config";
import { faker } from "@faker-js/faker";
import { RowDataPacket } from "mysql2/promise";

// Interface for ID
interface IdPacket extends RowDataPacket {
  id: number;
}

export async function seedGarmentSize() {
  const connection = await pool.getConnection();
  console.log("🌱 Seeding garment_size...");

  try {
    // 1. Get all garment and size IDs
    const [garments] = await connection.query<IdPacket[]>("SELECT id FROM prenda");
    const [sizes] = await connection.query<IdPacket[]>("SELECT id FROM talla");

    if (garments.length === 0 || sizes.length === 0) {
      console.log("⚠️ Cannot seed garment_size without garments and sizes.");
      return;
    }

    const garmentSizeLinks = [];
    const uniqueLinks = new Set<string>();

    // 2. Assign sizes to garments
    for (const garment of garments) {
      // Each garment will have a random number of sizes (e.g., 2 to 5 sizes)
      const numSizes = faker.number.int({ min: 2, max: Math.min(5, sizes.length) });
      const assignedSizes = faker.helpers.arrayElements(sizes, numSizes);

      for (const size of assignedSizes) {
        const linkKey = `${garment.id}-${size.id}`;
        if (!uniqueLinks.has(linkKey)) {
          uniqueLinks.add(linkKey);
          garmentSizeLinks.push([garment.id, size.id]);
        }
      }
    }

    console.log(`Generating ${garmentSizeLinks.length} garment-size combinations...`);

    // 3. Bulk insert
    await connection.query(
      `INSERT INTO prenda_talla (prenda_id, talla_id) VALUES ?`,
      [garmentSizeLinks]
    );

    console.log(`✅ ${garmentSizeLinks.length} garment-size links inserted!`);
  } catch (error) {
    console.error("❌ Error seeding garment_size:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Allow independent execution
if (require.main === module) {
  seedGarmentSize()
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}