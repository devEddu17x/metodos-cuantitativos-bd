import { pool } from "../config";
import { faker } from "@faker-js/faker";
import { RowDataPacket } from "mysql2/promise";

// Interfaces
interface OrderPacket extends RowDataPacket {
  id: number;
  total: number;
  fecha_emision: Date;
  fecha_entrega: Date;
}
interface EmployeePacket extends RowDataPacket {
  id: number;
}

export async function seedPayment() {
  const connection = await pool.getConnection();
  console.log("🌱 Seeding payments...");

  try {
    // 1. Find "In Production" orders that have no payments
    const [pendingOrders] = await connection.query<OrderPacket[]>(`
      SELECT p.id, p.total, p.fecha_emision, p.fecha_entrega
      FROM pedido p
      LEFT JOIN pago pa ON p.id = pa.pedido_id
      WHERE p.estado = 'En Producción' AND pa.id IS NULL
    `);

    const [employees] = await connection.query<EmployeePacket[]>("SELECT id FROM empleado"); // Cashiers

    if (pendingOrders.length === 0) {
      console.log("⚠️ No pending orders found for payment.");
      return;
    }
    if (employees.length === 0) {
      console.log("⚠️ Cannot register payments without employees (cashiers).");
      return;
    }

    const payments = [];
    const ordersToUpdate = [];

    for (const order of pendingOrders) {
      const cashier = faker.helpers.arrayElement(employees);
      const method = faker.helpers.arrayElement(['Efectivo', 'Tarjeta', 'Yape', 'Plin']);
      const advanceAmount = order.total * 0.5;
      const finalAmount = order.total - advanceAmount;
      const advanceDate = faker.date.soon({ days: 1, refDate: order.fecha_emision });
      const finalDate = faker.date.between({
        from: advanceDate,
        to: order.fecha_entrega.getTime() <= advanceDate.getTime()
          ? faker.date.soon({ days: 7, refDate: advanceDate })
          : order.fecha_entrega
      });

      // 2. Create Payment 1 (Advance)
      payments.push([
        advanceDate,
        advanceAmount,
        'Adelanto', // Type
        method,
        1, // numero_pago_pedido
        order.id, // pedido_id
        cashier.id // empleado_id
      ]);

      // 3. Create Payment 2 (Cancellation)
      payments.push([
        finalDate,
        finalAmount,
        'Cancelación', // Type
        method,
        2, // numero_pago_pedido
        order.id, // pedido_id
        cashier.id // empleado_id
      ]);
      
      // 4. Mark order to be updated to 'Delivered'
      ordersToUpdate.push(order.id);
    }

    // 5. Bulk insert all payments
    await connection.query(
      `INSERT INTO pago (fecha, monto, tipo, metodo_pago, numero_pago_pedido, pedido_id, empleado_id) VALUES ?`,
      [payments]
    );

    // 6. Update order status to 'Delivered'
    if (ordersToUpdate.length > 0) {
      await connection.query(
        `UPDATE pedido SET estado = 'Entregado' WHERE id IN (?)`,
        [ordersToUpdate]
      );
    }

    console.log(`✅ ${payments.length} payments (for ${ordersToUpdate.length} orders) inserted!`);
  } catch (error) {
    console.error("❌ Error seeding payment:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Allow independent execution
if (require.main === module) {
  seedPayment()
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}
