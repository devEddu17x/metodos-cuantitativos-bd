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

    // Helper function to add a link
    const addLink = (supplierId: number, materialId: number) => {
      const linkKey = `${supplierId}-${materialId}`;
      if (!uniqueLinks.has(linkKey)) {
        uniqueLinks.add(linkKey);
        supplierMaterialLinks.push([supplierId, materialId]);
        return true;
      }
      return false;
    };

    // 2. PASO 1: Garantizar que TODOS los materiales tengan al menos 1 proveedor
    console.log("   📌 Asignando al menos 1 proveedor a cada material...");
    for (const material of materials) {
      const randomSupplier = faker.helpers.arrayElement(suppliers);
      addLink(randomSupplier.id, material.id);
    }

    // 3. PASO 2: Garantizar que TODOS los proveedores tengan al menos 1 material
    console.log("   📌 Asignando al menos 1 material a cada proveedor...");
    for (const supplier of suppliers) {
      const randomMaterial = faker.helpers.arrayElement(materials);
      addLink(supplier.id, randomMaterial.id);
    }

    // 4. PASO 3: Agregar relaciones adicionales para que cada proveedor tenga múltiples materiales (más realista)
    console.log("   📌 Agregando relaciones adicionales...");
    for (const supplier of suppliers) {
      // Cada proveedor tendrá entre 3 y 10 materiales (o menos si no hay suficientes)
      const numMaterials = faker.number.int({ min: 3, max: Math.min(10, materials.length) });
      const assignedMaterials = faker.helpers.arrayElements(materials, numMaterials);

      for (const material of assignedMaterials) {
        addLink(supplier.id, material.id);
      }
    }

    // 5. Bulk insert
    await connection.query(
      `INSERT INTO proveedor_material (proveedor_id, material_id) VALUES ?`,
      [supplierMaterialLinks]
    );

    console.log(`✅ ${supplierMaterialLinks.length} supplier-material links inserted!`);
    console.log(`   • ${materials.length} materiales tienen al menos 1 proveedor`);
    console.log(`   • ${suppliers.length} proveedores tienen al menos 1 material`);
    console.log(`   • Promedio: ${(supplierMaterialLinks.length / suppliers.length).toFixed(2)} materiales por proveedor`);
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