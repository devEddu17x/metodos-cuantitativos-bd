import { starSchemaPool } from "./star-schema.config";

async function cleanStarSchema() {
    const connection = await starSchemaPool.getConnection();

    console.log("🧹 Iniciando limpieza del modelo estrella...\n");

    try {
        // Deshabilitar foreign key checks para eliminar en cualquier orden
        await connection.query("SET FOREIGN_KEY_CHECKS = 0");

        // FASE 1: Limpiar tabla de hechos
        console.log("📊 Limpiando tabla de hechos...");
        await connection.query("TRUNCATE TABLE h_venta");
        console.log("   ✅ h_venta limpiada");

        // FASE 2: Limpiar dimensiones
        console.log("\n📋 Limpiando dimensiones...");

        const dimensions = [
            "d_tiempo",
            "d_empleado",
            "d_cliente",
            "d_proveedor",
            "d_material",
            "d_prenda",
            "d_direccion",
            "d_metodo_pago",
            "d_estado_pedido"
        ];

        for (const dimension of dimensions) {
            await connection.query(`TRUNCATE TABLE ${dimension}`);
            console.log(`   ✅ ${dimension} limpiada`);
        }

        // Rehabilitar foreign key checks
        await connection.query("SET FOREIGN_KEY_CHECKS = 1");

        console.log("\n✅ Modelo estrella limpiado exitosamente");
        console.log("💡 Ahora puedes ejecutar: pnpm etl");

    } catch (error) {
        console.error("❌ Error durante la limpieza:", error);
        throw error;
    } finally {
        connection.release();
        await starSchemaPool.end();
    }
}

cleanStarSchema().catch((error) => {
    console.error("Error fatal:", error);
    process.exit(1);
});
