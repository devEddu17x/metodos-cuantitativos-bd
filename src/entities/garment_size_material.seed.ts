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
  categoria: string;
  unidad_medida: string;
  cantidad_base: number;
}

export async function seedGarmentSizeMaterial() {
  const connection = await pool.getConnection();
  console.log("🌱 Seeding garment_size_material...");

  try {
    // 1. Get all garment_size combinations and materials
    const [garmentSizes] = await connection.query<GarmentSizePacket[]>("SELECT prenda_id, talla_id FROM prenda_talla");
    const [materials] = await connection.query<MaterialPacket[]>(
      "SELECT id, categoria, unidad_medida, cantidad_base FROM material"
    );

    if (garmentSizes.length === 0 || materials.length === 0) {
      console.log("⚠️ Cannot seed garment_size_material without garment_size and materials.");
      return;
    }

    const gsmLinks = [];
    const uniqueLinks = new Set<string>();

    // 2. Assign 2-5 materials to each garment_size combination
    for (const gs of garmentSizes) {
      const numMaterials = faker.number.int({ min: 2, max: 5 });
      const assignedMaterials = faker.helpers.arrayElements(materials, numMaterials);

      for (const material of assignedMaterials) {
        const linkKey = `${gs.prenda_id}-${gs.talla_id}-${material.id}`;
        if (!uniqueLinks.has(linkKey)) {
          uniqueLinks.add(linkKey);

          // Cantidad realista según la categoría y unidad de medida del material
          let cantidad: number;

          switch (material.categoria) {
            case "Tela":
              // Entre 0.5 y 2.5 metros de tela por prenda
              cantidad = faker.number.float({ min: 0.5, max: 2.5, fractionDigits: 2 });
              break;
            case "Hilo":
              // Entre 20 y 150 metros de hilo
              cantidad = faker.number.float({ min: 20, max: 150, fractionDigits: 1 });
              break;
            case "Tinta":
              // Entre 0.005 y 0.05 litros (5ml a 50ml)
              cantidad = faker.number.float({ min: 0.005, max: 0.05, fractionDigits: 3 });
              break;
            case "Aguja":
              // 1-3 agujas por prenda
              cantidad = faker.number.int({ min: 1, max: 3 });
              break;
            case "Botón":
              // 1-8 botones por prenda
              cantidad = faker.number.int({ min: 1, max: 8 });
              break;
            case "Cierre":
              // 1-2 cierres por prenda
              cantidad = faker.number.int({ min: 1, max: 2 });
              break;
            case "Elástico":
              // 0.2 a 1.5 metros de elástico
              cantidad = faker.number.float({ min: 0.2, max: 1.5, fractionDigits: 2 });
              break;
            case "Etiqueta":
              // 1-3 etiquetas por prenda
              cantidad = faker.number.int({ min: 1, max: 3 });
              break;
            case "Accesorio":
              // Depende de la unidad
              if (material.unidad_medida === "metro") {
                cantidad = faker.number.float({ min: 0.1, max: 2, fractionDigits: 2 });
              } else {
                cantidad = faker.number.int({ min: 1, max: 10 });
              }
              break;
            case "Adhesivo":
              // Depende de la unidad
              if (material.unidad_medida === "metro") {
                cantidad = faker.number.float({ min: 0.1, max: 1, fractionDigits: 2 });
              } else {
                cantidad = faker.number.float({ min: 0.01, max: 0.1, fractionDigits: 3 });
              }
              break;
            case "Químico":
              // 0.05 a 0.5 litros
              cantidad = faker.number.float({ min: 0.05, max: 0.5, fractionDigits: 2 });
              break;
            default:
              cantidad = faker.number.float({ min: 0.1, max: 2, fractionDigits: 2 });
          }

          gsmLinks.push([
            gs.prenda_id,
            gs.talla_id,
            material.id,
            cantidad
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
    console.log(`   • ${garmentSizes.length} combinaciones prenda-talla procesadas`);
    console.log(`   • Promedio: ${(gsmLinks.length / garmentSizes.length).toFixed(2)} materiales por prenda-talla`);
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
