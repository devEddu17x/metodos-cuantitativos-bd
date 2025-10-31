import { pool } from "../config";
import { faker } from "@faker-js/faker";
import { RowDataPacket } from "mysql2/promise";

// Interfaces
interface OrderPacket extends RowDataPacket {
  id: number;
  total: number;
  fecha_emision: Date;
  fecha_entrega_real: Date;
}

interface EmployeePacket extends RowDataPacket {
  id: number;
}

export async function seedPayment() {
  const connection = await pool.getConnection();
  console.log("🌱 Seeding pagos...");

  try {
    // 1. Obtener todos los pedidos y empleados
    console.log("   📥 Obteniendo pedidos y empleados...");
    const [orders] = await connection.query<OrderPacket[]>(
      `SELECT id, total, fecha_emision, fecha_entrega_real FROM pedido`
    );

    const [employees] = await connection.query<EmployeePacket[]>(
      "SELECT id FROM empleado"
    );

    if (orders.length === 0) {
      console.log("⚠️ No hay pedidos para crear pagos.");
      return;
    }
    if (employees.length === 0) {
      console.log("⚠️ No se pueden registrar pagos sin empleados.");
      return;
    }

    console.log(`   ✓ ${orders.length} pedidos, ${employees.length} empleados disponibles`);

    // 2. Métodos de pago disponibles
    const metodosPago = ['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA', 'TARJETA'];

    // 3. Rastrear pagos por empleado para garantizar al menos 2 por empleado
    const pagosPorEmpleado = new Map<number, number>();
    employees.forEach(e => pagosPorEmpleado.set(e.id, 0));

    const payments: any[] = [];

    // 4. Crear 2 pagos por cada pedido
    console.log("   💰 Generando 2 pagos por pedido (50% + 50%)...");

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];

      // Seleccionar empleado (garantizar distribución)
      let empleado: EmployeePacket;

      // Si aún quedan empleados sin alcanzar el mínimo de 2 pagos, priorizar esos
      const empleadosSinMinimo = employees.filter(e => (pagosPorEmpleado.get(e.id) || 0) < 2);
      if (empleadosSinMinimo.length > 0) {
        empleado = faker.helpers.arrayElement(empleadosSinMinimo);
      } else {
        empleado = faker.helpers.arrayElement(employees);
      }

      const metodoPago = faker.helpers.arrayElement(metodosPago);

      // Calcular montos (50% cada uno)
      const montoPrimerPago = parseFloat((order.total * 0.5).toFixed(2));
      const montoSegundoPago = parseFloat((order.total - montoPrimerPago).toFixed(2)); // Ajuste por redondeo

      // PRIMER PAGO: 50% en fecha de emisión
      payments.push([
        order.fecha_emision,
        montoPrimerPago,
        'ADELANTO',
        metodoPago,
        1, // numero_pago_pedido
        order.id,
        empleado.id
      ]);

      pagosPorEmpleado.set(empleado.id, (pagosPorEmpleado.get(empleado.id) || 0) + 1);

      // SEGUNDO PAGO: 50% en fecha de entrega real
      payments.push([
        order.fecha_entrega_real,
        montoSegundoPago,
        'CANCELACIÓN',
        metodoPago,
        2, // numero_pago_pedido
        order.id,
        empleado.id
      ]);

      pagosPorEmpleado.set(empleado.id, (pagosPorEmpleado.get(empleado.id) || 0) + 1);
    }

    // 5. Verificar que todos los empleados tengan al menos 2 pagos
    const empleadosSinMinimo = Array.from(pagosPorEmpleado.entries())
      .filter(([_, count]) => count < 2);

    if (empleadosSinMinimo.length > 0) {
      console.log(`   ⚠️ Advertencia: ${empleadosSinMinimo.length} empleados tienen menos de 2 pagos`);
      console.log(`   📝 Esto puede ocurrir si hay más empleados que pedidos`);
    }

    // 6. Insertar todos los pagos
    console.log("   💾 Insertando pagos en la base de datos...");
    await connection.query(
      `INSERT INTO pago (fecha, monto, tipo, metodo_pago, numero_pago_pedido, pedido_id, empleado_id) 
       VALUES ?`,
      [payments]
    );

    // 7. Estadísticas
    const empleadosConMinimo = Array.from(pagosPorEmpleado.values())
      .filter(count => count >= 2).length;

    const totalPrimerPago = payments.filter(p => p[4] === 1).length;
    const totalSegundoPago = payments.filter(p => p[4] === 2).length;

    // Contar por método de pago
    const pagosPorMetodo: { [key: string]: number } = {};
    metodosPago.forEach(metodo => {
      pagosPorMetodo[metodo] = payments.filter(p => p[3] === metodo).length;
    });

    console.log(`\n✅ Pagos generados exitosamente!`);
    console.log(`\n📊 Resumen:`);
    console.log(`   • Total pagos: ${payments.length}`);
    console.log(`   • Primer pago (50% - Adelanto): ${totalPrimerPago}`);
    console.log(`   • Segundo pago (50% - Cancelación): ${totalSegundoPago}`);
    console.log(`   • Empleados con al menos 2 pagos: ${empleadosConMinimo}/${employees.length}`);
    console.log(`   • Cada pedido tiene exactamente 2 pagos ✓`);

    console.log(`\n💳 Distribución por método de pago:`);
    Object.entries(pagosPorMetodo).forEach(([metodo, count]) => {
      console.log(`   • ${metodo}: ${count} (${((count / payments.length) * 100).toFixed(1)}%)`);
    });

  } catch (error) {
    console.error("❌ Error seeding pagos:", error);
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
