import { pool } from "../config";
import { faker } from "@faker-js/faker";
import { RowDataPacket, OkPacket } from "mysql2/promise";

// Interfaces
interface IdPacket extends RowDataPacket { id: number; }
interface GarmentSizePacket extends RowDataPacket { prenda_id: number; talla_id: number; }

export async function seedQuotation() {
  const connection = await pool.getConnection();
  console.log("🌱 Seeding quotation and quotation_detail...");

  try {
    // 1. Get necessary IDs
    const [clients] = await connection.query<IdPacket[]>("SELECT id FROM cliente");
    const [employees] = await connection.query<IdPacket[]>("SELECT id FROM empleado");
    const [garmentSizes] = await connection.query<GarmentSizePacket[]>("SELECT prenda_id, talla_id FROM prenda_talla");

    if (clients.length === 0 || employees.length === 0 || garmentSizes.length === 0) {
      console.log("⚠️ Cannot seed quotations without clients, employees, and garment_size.");
      return;
    }

    let insertedQuotations = 0;
    let insertedDetails = 0;
    const quotationDetails = [];

    // --- ✅ MODIFICACIÓN 1: Definir el total ---
    const totalQuotations = 120; // Generar 120 en total
    const acceptedQuotations = 100; // Forzar 100 aceptadas

    // 2. Generate 120 quotations
    for (let i = 0; i < totalQuotations; i++) {
      const client = faker.helpers.arrayElement(clients);
      const employee = faker.helpers.arrayElement(employees); // Salesperson
      const quotationDate = faker.date.past({ years: 2 });
      
      // --- ✅ MODIFICACIÓN 2: Lógica de estado forzada ---
      // Las primeras 100 (0-99) serán 'Aceptada', las 20 restantes 'Rechazada'
      const status = (i < acceptedQuotations) ? 'Aceptada' : 'Rechazada';

      const [result] = await connection.query<OkPacket>(
        `INSERT INTO cotizacion (fecha_cotizacion, total, estado, cliente_id, empleado_id) VALUES (?, ?, ?, ?, ?)`,
        [quotationDate, 0, status, client.id, employee.id]
      );
      
      const quotationId = result.insertId;
      insertedQuotations++;
      let quotationTotal = 0;

      // 3. Generate details for this quotation (1 to 5 details)
      const numDetails = faker.number.int({ min: 1, max: 5 });
      const itemsEnEstaCotizacion = new Set<string>();

      for (let j = 0; j < numDetails; j++) {
        let garmentSize;
        let itemKey;
        do {
          garmentSize = faker.helpers.arrayElement(garmentSizes);
          itemKey = `${garmentSize.prenda_id}-${garmentSize.talla_id}`;
        } while (itemsEnEstaCotizacion.has(itemKey));
        itemsEnEstaCotizacion.add(itemKey);

        const unitPrice = parseFloat(faker.commerce.price({ min: 15, max: 150 }));
        const quantity = faker.number.int({ min: 1, max: 20 });
        
        quotationDetails.push([
          unitPrice,
          quantity,
          quotationId,
          garmentSize.prenda_id,
          garmentSize.talla_id
        ]);
        
        quotationTotal += (unitPrice * quantity);
        insertedDetails++;
      }
      
      // 4. Update the quotation's total
      await connection.query(
        `UPDATE cotizacion SET total = ? WHERE id = ?`,
        [quotationTotal, quotationId]
      );
    }

    // 5. Bulk insert all details
    await connection.query(
      `INSERT INTO detalle_cotizacion (unitario, cantidad, cotizacion_id, prenda_id, talla_id) VALUES ?`,
      [quotationDetails]
    );

    // --- ✅ MODIFICACIÓN 3: Log actualizado ---
    const rejectedQuotations = totalQuotations - acceptedQuotations;
    console.log(`✅ ${insertedQuotations} quotations (${acceptedQuotations} Aceptada, ${rejectedQuotations} Rechazada) and ${insertedDetails} details inserted!`);

  } catch (error) {
    console.error("❌ Error seeding quotation:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Allow independent execution
if (require.main === module) {
  seedQuotation()
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}