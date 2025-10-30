import { pool } from "../config";
import { faker } from "@faker-js/faker";
import { RowDataPacket, OkPacket } from "mysql2/promise";

// Interfaces
interface IdPacket extends RowDataPacket {
  id: number;
}

interface GarmentSizePricePacket extends RowDataPacket {
  prenda_id: number;
  talla_id: number;
  precio: number;
}

export async function seedQuotation() {
  const connection = await pool.getConnection();
  console.log("🌱 Seeding cotizacion y detalle_cotizacion...");

  try {
    // 1. Obtener datos necesarios
    console.log("   📥 Obteniendo clientes, empleados y prendas-talla...");
    const [clients] = await connection.query<IdPacket[]>("SELECT id FROM cliente");
    const [employees] = await connection.query<IdPacket[]>("SELECT id FROM empleado");
    const [garmentSizes] = await connection.query<GarmentSizePricePacket[]>(
      "SELECT prenda_id, talla_id, precio FROM prenda_talla WHERE precio IS NOT NULL"
    );

    if (clients.length === 0 || employees.length === 0 || garmentSizes.length === 0) {
      console.log("⚠️ No se pueden generar cotizaciones sin clientes, empleados o prendas-talla con precio.");
      return;
    }

    console.log(`   ✓ ${clients.length} clientes, ${employees.length} empleados, ${garmentSizes.length} prendas-talla disponibles`);

    // 2. Configuración de generación
    const totalCotizaciones = 480; // 2 años × 12 meses × 20 cotizaciones/mes
    const porcentajeDesaprobadas = 0.05; // 5%
    const numDesaprobadas = Math.floor(totalCotizaciones * porcentajeDesaprobadas);
    const numAprobadas = totalCotizaciones - numDesaprobadas;

    console.log(`   📊 Generando ${totalCotizaciones} cotizaciones (${numAprobadas} aprobadas, ${numDesaprobadas} desaprobadas)`);

    // 3. Generar fechas distribuidas en 2 años (20 por mes)
    const generarFechasDistribuidas = (total: number, años: number) => {
      const fechas: Date[] = [];
      const cotizacionesPorMes = Math.ceil(total / (años * 12));
      const fechaInicio = new Date();
      fechaInicio.setFullYear(fechaInicio.getFullYear() - años);

      for (let mes = 0; mes < años * 12 && fechas.length < total; mes++) {
        const año = fechaInicio.getFullYear() + Math.floor(mes / 12);
        const mesActual = (fechaInicio.getMonth() + mes) % 12;
        const diasEnMes = new Date(año, mesActual + 1, 0).getDate();

        for (let i = 0; i < cotizacionesPorMes && fechas.length < total; i++) {
          const dia = faker.number.int({ min: 1, max: diasEnMes });
          fechas.push(new Date(año, mesActual, dia));
        }
      }

      return faker.helpers.shuffle(fechas);
    };

    const fechasCotizaciones = generarFechasDistribuidas(totalCotizaciones, 2);

    // 4. Garantizar distribución: al menos 1 cotización por cliente y 10 por empleado
    const cotizacionesPorCliente = new Map<number, number>();
    const cotizacionesPorEmpleado = new Map<number, number>();

    clients.forEach(c => cotizacionesPorCliente.set(c.id, 0));
    employees.forEach(e => cotizacionesPorEmpleado.set(e.id, 0));

    const cotizacionesData: Array<{
      cliente_id: number;
      empleado_id: number;
      fecha: Date;
      estado: string;
    }> = [];

    // 4a. Asignar al menos 1 cotización por cliente
    console.log("   📌 Garantizando al menos 1 cotización por cliente...");
    clients.forEach((client, index) => {
      const empleado = faker.helpers.arrayElement(employees);
      const estado = index < numAprobadas ? "APROBADA" : "DESAPROBADA";

      cotizacionesData.push({
        cliente_id: client.id,
        empleado_id: empleado.id,
        fecha: fechasCotizaciones[index],
        estado
      });

      cotizacionesPorCliente.set(client.id, 1);
      cotizacionesPorEmpleado.set(empleado.id, (cotizacionesPorEmpleado.get(empleado.id) || 0) + 1);
    });

    // 4b. Asignar cotizaciones adicionales para garantizar 10 por empleado
    console.log("   📌 Garantizando al menos 10 cotizaciones por empleado...");
    employees.forEach(empleado => {
      const actual = cotizacionesPorEmpleado.get(empleado.id) || 0;
      const faltantes = Math.max(0, 10 - actual);

      for (let i = 0; i < faltantes; i++) {
        const indexCotizacion = cotizacionesData.length;
        if (indexCotizacion >= totalCotizaciones) break;

        const cliente = faker.helpers.arrayElement(clients);
        const estado = indexCotizacion < numAprobadas ? "APROBADA" : "DESAPROBADA";

        cotizacionesData.push({
          cliente_id: cliente.id,
          empleado_id: empleado.id,
          fecha: fechasCotizaciones[indexCotizacion],
          estado
        });

        cotizacionesPorCliente.set(cliente.id, (cotizacionesPorCliente.get(cliente.id) || 0) + 1);
        cotizacionesPorEmpleado.set(empleado.id, actual + i + 1);
      }
    });

    // 4c. Completar hasta totalCotizaciones con asignación aleatoria
    console.log("   📌 Completando cotizaciones restantes...");
    while (cotizacionesData.length < totalCotizaciones) {
      const indexCotizacion = cotizacionesData.length;
      const cliente = faker.helpers.arrayElement(clients);
      const empleado = faker.helpers.arrayElement(employees);
      const estado = indexCotizacion < numAprobadas ? "APROBADA" : "DESAPROBADA";

      cotizacionesData.push({
        cliente_id: cliente.id,
        empleado_id: empleado.id,
        fecha: fechasCotizaciones[indexCotizacion],
        estado
      });

      cotizacionesPorCliente.set(cliente.id, (cotizacionesPorCliente.get(cliente.id) || 0) + 1);
      cotizacionesPorEmpleado.set(empleado.id, (cotizacionesPorEmpleado.get(empleado.id) || 0) + 1);
    }

    // 5. Insertar cotizaciones y generar detalles
    console.log("   💾 Insertando cotizaciones y generando detalles...");
    let cotizacionesInsertadas = 0;
    let detallesInsertados = 0;
    const todosLosDetalles: any[] = [];

    for (const cotizacionData of cotizacionesData) {
      // Insertar cotización (total temporal en 0)
      const [result] = await connection.query<OkPacket>(
        `INSERT INTO cotizacion (fecha_cotizacion, total, estado, cliente_id, empleado_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [cotizacionData.fecha, 0, cotizacionData.estado, cotizacionData.cliente_id, cotizacionData.empleado_id]
      );

      const cotizacionId = result.insertId;
      cotizacionesInsertadas++;

      // Generar detalles para esta cotización (1 a 8 ítems diferentes)
      const numDetalles = faker.number.int({ min: 1, max: 8 });
      const prendasSeleccionadas = faker.helpers.arrayElements(garmentSizes, numDetalles);
      let totalCotizacion = 0;

      for (const prenda of prendasSeleccionadas) {
        const precioUnitario = prenda.precio;
        const cantidad = faker.number.int({ min: 10, max: 500 });
        const subtotal = precioUnitario * cantidad;

        todosLosDetalles.push([
          precioUnitario,
          cantidad,
          cotizacionId,
          prenda.prenda_id,
          prenda.talla_id
        ]);

        totalCotizacion += subtotal;
        detallesInsertados++;
      }

      // Actualizar el total de la cotización
      await connection.query(
        `UPDATE cotizacion SET total = ? WHERE id = ?`,
        [totalCotizacion, cotizacionId]
      );
    }

    // 6. Insertar todos los detalles en lote
    console.log("   📝 Insertando detalles en lote...");
    await connection.query(
      `INSERT INTO detalle_cotizacion (precio_unitario, cantidad, cotizacion_id, prenda_id, talla_id) VALUES ?`,
      [todosLosDetalles]
    );

    // 7. Estadísticas finales
    console.log(`\n✅ Cotizaciones y detalles generados exitosamente!`);
    console.log(`\n📊 Resumen:`);
    console.log(`   • Total cotizaciones: ${cotizacionesInsertadas}`);
    console.log(`   • Aprobadas: ${numAprobadas} (${(100 - porcentajeDesaprobadas * 100).toFixed(0)}%)`);
    console.log(`   • Desaprobadas: ${numDesaprobadas} (${(porcentajeDesaprobadas * 100).toFixed(0)}%)`);
    console.log(`   • Total detalles: ${detallesInsertados}`);
    console.log(`   • Promedio detalles por cotización: ${(detallesInsertados / cotizacionesInsertadas).toFixed(2)}`);
    console.log(`   • Todos los clientes tienen al menos 1 cotización ✓`);
    console.log(`   • Todos los empleados tienen al menos 10 cotizaciones ✓`);
    console.log(`   • Periodo: 2 años (~20 cotizaciones/mes) ✓`);

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