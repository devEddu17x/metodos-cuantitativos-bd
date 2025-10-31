import { starSchemaPool } from "./star-schema.config";

async function cleanStarSchema() {
    const connection = await starSchemaPool.getConnection();
    const dbName = process.env.MYSQL_STAR_SCHEMA;
    console.log("🧹 Iniciando limpieza del modelo estrella...\n");

    try {
        await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);

        console.log("\n✅ Modelo estrella limpiado exitosamente");

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
