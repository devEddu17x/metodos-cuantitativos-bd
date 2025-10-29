import { pool } from "../config";
import { faker } from "@faker-js/faker";
import { RowDataPacket } from "mysql2/promise";

export async function seedClientsNatural() {
  const connection = await pool.getConnection();

  try {
    console.log("🌱 Seeding clientes naturales...");

    // Obtener IDs de clientes que no están asignados
    const [availableClients] = await connection.query<(RowDataPacket & { id: number })[]>(`
      SELECT id FROM cliente 
      WHERE id NOT IN (SELECT cliente_id FROM cliente_natural) 
      AND id NOT IN (SELECT cliente_id FROM cliente_juridico)
      LIMIT 50
    `);

    if (!Array.isArray(availableClients) || availableClients.length === 0) {
      console.log("⚠️ No hay clientes disponibles para asignar como clientes naturales");
      return;
    }

    const clientsNatural = [];

    for (const client of availableClients) {
      clientsNatural.push([
        // DNI: 8 dígitos
        faker.number.int({ min: 10000000, max: 99999999 }).toString(),
        // Nombre
        faker.person.firstName(),
        // Apellido
        faker.person.lastName(),
        // ID del cliente
        client.id
      ]);
    }

    await connection.query(
      `INSERT INTO cliente_natural (dni, nombre, apellido, cliente_id) VALUES ?`,
      [clientsNatural]
    );

    console.log(`✅ ${clientsNatural.length} clientes naturales insertados!`);
  } catch (error) {
    console.error("❌ Error seeding clientes naturales:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Permite ejecutar: pnpm tsx src/entities/cliente_natural.seed.ts
if (require.main === module) {
  seedClientsNatural()
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}