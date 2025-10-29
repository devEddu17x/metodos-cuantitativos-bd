import { pool } from "../config";
import { faker } from "@faker-js/faker";
import { RowDataPacket } from "mysql2/promise";

export async function seedClientsJuridico() {
  const connection = await pool.getConnection();

  try {
    console.log("🌱 Seeding clientes jurídicos...");

    // Obtener IDs de clientes que no están asignados
    const [availableClients] = await connection.query<(RowDataPacket & { id: number })[]>(`
      SELECT id FROM cliente 
      WHERE id NOT IN (SELECT cliente_id FROM cliente_natural) 
      AND id NOT IN (SELECT cliente_id FROM cliente_juridico)
      LIMIT 50
    `);

    if (!Array.isArray(availableClients) || availableClients.length === 0) {
      console.log("⚠️ No hay clientes disponibles para asignar como clientes jurídicos");
      return;
    }

    const clientsJuridico = [];

    for (const client of availableClients) {
      clientsJuridico.push([
        // RUC: 11 dígitos
        faker.string.numeric(11),
        // Razón Social
        faker.company.name(),
        // Delegado (puede ser null en algunos casos)
        faker.helpers.maybe(() => faker.person.fullName(), { probability: 0.8 }),
        // ID del cliente
        client.id
      ]);
    }

    await connection.query(
      `INSERT INTO cliente_juridico (ruc, razon_social, delegado, cliente_id) VALUES ?`,
      [clientsJuridico]
    );

    console.log(`✅ ${clientsJuridico.length} clientes jurídicos insertados!`);
  } catch (error) {
    console.error("❌ Error seeding clientes jurídicos:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Permite ejecutar: pnpm tsx src/entities/cliente_juridico.seed.ts
if (require.main === module) {
  seedClientsJuridico()
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}