import { pool } from "../config";
import { faker } from "@faker-js/faker";
import { RowDataPacket } from "mysql2/promise";

// Interfaces
interface QuotationPacket extends RowDataPacket {
  id: number;
  total: number;
  fecha_cotizacion: Date;
}
interface AddressPacket extends RowDataPacket {
  id: number;
}

export async function seedOrder() {
  const connection = await pool.getConnection();
  console.log("🌱 Seeding orders...");

  try {
    // 1. Find "Accepted" quotations that don't have an order
    const [acceptedQuotations] = await connection.query<QuotationPacket[]>(`
      SELECT c.id, c.total, c.fecha_cotizacion 
      FROM cotizacion c
      LEFT JOIN pedido p ON c.id = p.cotizacion_id
      WHERE c.estado = 'Aceptada' AND p.id IS NULL
    `);

    const [addresses] = await connection.query<AddressPacket[]>("SELECT id FROM direccion");

    if (acceptedQuotations.length === 0) {
      console.log("⚠️ No accepted quotations found to create orders.");
      return;
    }
    if (addresses.length === 0) {
      console.log("⚠️ Cannot create orders without addresses.");
      return;
    }

    const orders = [];
    for (const coti of acceptedQuotations) {
      const issueDate = faker.date.soon({ days: 2, refDate: coti.fecha_cotizacion });
      const deliveryDate = faker.date.soon({ days: 15, refDate: issueDate });
      const address = faker.helpers.arrayElement(addresses);

      orders.push([
        faker.helpers.maybe(() => faker.commerce.productAdjective(), { probability: 0.3 }), // courtesy
        coti.total,
        'En Producción', // Initial status
        issueDate,
        deliveryDate,
        coti.id, // cotizacion_id
        address.id
      ]);
    }

    // 2. Bulk insert orders
    await connection.query(
      `INSERT INTO pedido (cortesia, total, estado, fecha_emision, fecha_entrega, cotizacion_id, direccion_id) VALUES ?`,
      [orders]
    );

    console.log(`✅ ${orders.length} orders created!`);
  } catch (error) {
    console.error("❌ Error seeding order:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Allow independent execution
if (require.main === module) {
  seedOrder()
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}
