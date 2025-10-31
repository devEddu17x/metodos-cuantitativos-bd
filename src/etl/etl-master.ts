import { loadDimensionTiempo } from "./dimensions/tiempo.etl";
import { loadDimensionEmpleado } from "./dimensions/empleado.etl";
import { loadDimensionCliente } from "./dimensions/cliente.etl";
import { loadDimensionProveedor } from "./dimensions/proveedor.etl";
import { loadDimensionMaterial } from "./dimensions/material.etl";
import { loadDimensionPrenda } from "./dimensions/prenda.etl";
import { loadDimensionDireccion } from "./dimensions/direccion.etl";
import { loadDimensionMetodoPago } from "./dimensions/metodo-pago.etl";
import { loadDimensionEstadoPedido } from "./dimensions/estado-pedido.etl";
import { loadFactHVenta } from "./facts/h-venta.etl";
import { pool } from "../config";
import { starSchemaPool } from "../star-schema.config";

async function main() {
    console.log("🚀 Iniciando proceso ETL completo...\n");

    const startTime = Date.now();

    try {
        // FASE 1: Cargar dimensiones
        console.log("📊 FASE 1: Cargando dimensiones");
        console.log("=".repeat(50));

        // d_tiempo es especial: generación de calendario
        await loadDimensionTiempo();

        // Dimensiones con mapeo 1:1 (pueden ir en paralelo)
        await Promise.all([
            loadDimensionEmpleado(),
            loadDimensionProveedor(),
            loadDimensionMaterial(),
            loadDimensionDireccion(),
        ]);

        // Dimensiones con JOIN (pueden ir en paralelo)
        await Promise.all([
            loadDimensionCliente(),
            loadDimensionPrenda(),
        ]);

        // Dimensiones con DISTINCT (pueden ir en paralelo)
        await Promise.all([
            loadDimensionMetodoPago(),
            loadDimensionEstadoPedido(),
        ]);

        console.log("\n✅ Todas las dimensiones cargadas exitosamente\n");

        // FASE 2: Cargar tabla de hechos
        console.log("📈 FASE 2: Cargando tabla de hechos");
        console.log("=".repeat(50));

        await loadFactHVenta();

        console.log("\n✅ Tabla de hechos cargada exitosamente\n");

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log("=".repeat(50));
        console.log(`🎉 Proceso ETL completado exitosamente`);
        console.log(`⏱️  Tiempo total: ${duration} segundos`);
        console.log("=".repeat(50));

    } catch (error) {
        console.error("\n❌ Error durante el proceso ETL:", error);
        throw error;
    } finally {
        await pool.end();
        await starSchemaPool.end();
    }
}

main().catch((error) => {
    console.error("Error fatal:", error);
    process.exit(1);
});
