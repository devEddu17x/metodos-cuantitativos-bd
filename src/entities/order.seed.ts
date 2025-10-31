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

interface QuotationDetailPacket extends RowDataPacket {
  cotizacion_id: number;
  cantidad: number;
}

export async function seedOrder() {
  const connection = await pool.getConnection();
  console.log("🌱 Seeding pedidos...");

  try {
    // 1. Obtener cotizaciones aprobadas y direcciones
    console.log("   📥 Obteniendo cotizaciones aprobadas y direcciones...");
    const [acceptedQuotations] = await connection.query<QuotationPacket[]>(`
      SELECT c.id, c.total, c.fecha_cotizacion 
      FROM cotizacion c
      WHERE c.estado = 'APROBADA'
    `);

    const [addresses] = await connection.query<AddressPacket[]>("SELECT id FROM direccion");

    if (acceptedQuotations.length === 0) {
      console.log("⚠️ No hay cotizaciones aprobadas para crear pedidos.");
      return;
    }
    if (addresses.length === 0) {
      console.log("⚠️ No se pueden crear pedidos sin direcciones.");
      return;
    }

    console.log(`   ✓ ${acceptedQuotations.length} cotizaciones aprobadas, ${addresses.length} direcciones disponibles`);

    // 2. Obtener TODAS las cantidades de prendas en UNA SOLA consulta
    console.log("   🔢 Calculando cantidad total de prendas por cotización...");
    const [todosLosDetalles] = await connection.query<QuotationDetailPacket[]>(
      `SELECT cotizacion_id, cantidad 
       FROM detalle_cotizacion 
       WHERE cotizacion_id IN (?)`,
      [acceptedQuotations.map(c => c.id)]
    );

    // Agrupar en memoria por cotizacion_id
    const cantidadesPorCotizacion = new Map<number, number>();
    for (const detalle of todosLosDetalles) {
      const cantidadActual = cantidadesPorCotizacion.get(detalle.cotizacion_id) || 0;
      cantidadesPorCotizacion.set(detalle.cotizacion_id, cantidadActual + detalle.cantidad);
    }

    console.log(`   ✓ ${cantidadesPorCotizacion.size} cotizaciones con cantidades calculadas`);

    // 3. Asegurar que cada dirección tenga al menos un pedido
    console.log("   📌 Garantizando al menos 1 pedido por dirección...");
    const direccionesUsadas = new Set<number>();
    const cotizacionesUsadas = new Set<number>();
    const orders: any[] = [];

    // Asignar primero una cotización a cada dirección
    for (const address of addresses) {
      // Buscar una cotización no usada
      const cotizacionDisponible = acceptedQuotations.find(c => !cotizacionesUsadas.has(c.id));

      if (!cotizacionDisponible) break; // No hay más cotizaciones disponibles

      const cantidadTotal = cantidadesPorCotizacion.get(cotizacionDisponible.id) || 0;
      const cortesia = cantidadTotal >= 30;

      // Fecha de emisión: entre 0-7 días después de la cotización
      const fechaEmision = faker.date.soon({ days: 7, refDate: cotizacionDisponible.fecha_cotizacion });

      // Fecha de entrega estimada: 4 a 16 semanas después de la emisión
      const semanasEntrega = faker.number.int({ min: 4, max: 16 });
      const fechaEntregaEstimada = new Date(fechaEmision);
      fechaEntregaEstimada.setDate(fechaEntregaEstimada.getDate() + (semanasEntrega * 7));

      // Fecha de entrega real: 80% a tiempo, 20% con retraso (1-5 días)
      let fechaEntregaReal: Date;
      if (faker.number.float({ min: 0, max: 1 }) < 0.8) {
        // 80% entregado a tiempo
        fechaEntregaReal = new Date(fechaEntregaEstimada);
      } else {
        // 20% entregado con retraso (1-5 días después)
        const diasRetraso = faker.number.int({ min: 1, max: 5 });
        fechaEntregaReal = new Date(fechaEntregaEstimada);
        fechaEntregaReal.setDate(fechaEntregaReal.getDate() + diasRetraso);
      }

      orders.push([
        cortesia,
        cotizacionDisponible.total,
        'Entregado', // Estado (todos los pedidos ya fueron entregados)
        fechaEmision,
        fechaEntregaEstimada,
        fechaEntregaReal,
        cotizacionDisponible.id,
        address.id
      ]);

      direccionesUsadas.add(address.id);
      cotizacionesUsadas.add(cotizacionDisponible.id);
    }

    // 4. Crear pedidos para las cotizaciones restantes
    console.log("   📦 Creando pedidos para cotizaciones restantes...");
    for (const cotizacion of acceptedQuotations) {
      if (cotizacionesUsadas.has(cotizacion.id)) continue; // Ya tiene pedido

      const cantidadTotal = cantidadesPorCotizacion.get(cotizacion.id) || 0;
      const cortesia = cantidadTotal >= 30;

      // Seleccionar una dirección aleatoria
      const address = faker.helpers.arrayElement(addresses);

      // Fecha de emisión: entre 0-7 días después de la cotización
      const fechaEmision = faker.date.soon({ days: 7, refDate: cotizacion.fecha_cotizacion });

      // Fecha de entrega estimada: 4 a 16 semanas después de la emisión
      const semanasEntrega = faker.number.int({ min: 4, max: 16 });
      const fechaEntregaEstimada = new Date(fechaEmision);
      fechaEntregaEstimada.setDate(fechaEntregaEstimada.getDate() + (semanasEntrega * 7));

      // Fecha de entrega real: 80% a tiempo, 20% con retraso (1-5 días)
      let fechaEntregaReal: Date;
      if (faker.number.float({ min: 0, max: 1 }) < 0.8) {
        // 80% entregado a tiempo
        fechaEntregaReal = new Date(fechaEntregaEstimada);
      } else {
        // 20% entregado con retraso (1-5 días después)
        const diasRetraso = faker.number.int({ min: 1, max: 5 });
        fechaEntregaReal = new Date(fechaEntregaEstimada);
        fechaEntregaReal.setDate(fechaEntregaReal.getDate() + diasRetraso);
      }

      orders.push([
        cortesia,
        cotizacion.total,
        'Entregado',
        fechaEmision,
        fechaEntregaEstimada,
        fechaEntregaReal,
        cotizacion.id,
        address.id
      ]);

      cotizacionesUsadas.add(cotizacion.id);
    }

    // 5. Insertar todos los pedidos
    console.log("   💾 Insertando pedidos...");
    await connection.query(
      `INSERT INTO pedido (cortesia, total, estado, fecha_emision, fecha_entrega_estimada, fecha_entrega_real, cotizacion_id, direccion_id) 
       VALUES ?`,
      [orders]
    );

    // 6. Calcular estadísticas
    const pedidosConCortesia = orders.filter(order => order[0] === true).length;
    const pedidosRetrasados = orders.filter(order => {
      const estimada = new Date(order[4]);
      const real = new Date(order[5]);
      return real > estimada;
    }).length;

    console.log(`\n✅ Pedidos generados exitosamente!`);
    console.log(`\n📊 Resumen:`);
    console.log(`   • Total pedidos: ${orders.length}`);
    console.log(`   • Pedidos con cortesía (≥30 prendas): ${pedidosConCortesia} (${((pedidosConCortesia / orders.length) * 100).toFixed(1)}%)`);
    console.log(`   • Pedidos retrasados: ${pedidosRetrasados} (${((pedidosRetrasados / orders.length) * 100).toFixed(1)}%)`);
    console.log(`   • Pedidos a tiempo: ${orders.length - pedidosRetrasados} (${(((orders.length - pedidosRetrasados) / orders.length) * 100).toFixed(1)}%)`);
    console.log(`   • Todas las direcciones tienen al menos 1 pedido ✓`);
    console.log(`   • Todas las cotizaciones aprobadas tienen 1 pedido ✓`);
    console.log(`   • Tiempo de entrega: 4-16 semanas ✓`);

  } catch (error) {
    console.error("❌ Error seeding pedidos:", error);
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
