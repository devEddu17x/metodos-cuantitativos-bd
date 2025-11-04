import { pool } from "../../config";
import { starSchemaPool } from "../../star-schema.config";
import { RowDataPacket } from "mysql2/promise";

interface PrendaMaterialPacket extends RowDataPacket {
    prenda_id: number;
    talla_id: number;
    material_id: number;
    cantidad: number;
}

export async function loadDimensionPrendaMaterial() {
    const oltp = await pool.getConnection();
    const olap = await starSchemaPool.getConnection();
    console.log("🧵👕 Cargando tabla intermedia d_prenda_material...");

    try {
        const [prendaMateriales] = await oltp.query<PrendaMaterialPacket[]>(
            `SELECT 
                prenda_id,
                talla_id,
                material_id,
                cantidad
             FROM prenda_talla_material
             ORDER BY prenda_id, talla_id, material_id`
        );

        if (prendaMateriales.length === 0) {
            console.log("   ⚠️ No hay relaciones prenda-material para cargar");
            return;
        }

        // Convertir prenda_id + talla_id al formato compuesto VARCHAR "prenda_id-talla_id"
        const records = prendaMateriales.map(pm => [
            `${pm.prenda_id}-${pm.talla_id}`, // prenda_id compuesto
            pm.material_id,
            pm.cantidad
        ]);

        await olap.query(
            `INSERT INTO d_prenda_material 
             (prenda_id, material_id, cantidad_material)
             VALUES ?`,
            [records]
        );

        console.log(`   ✅ ${records.length} relaciones prenda-material insertadas`);
    } catch (error) {
        console.error("   ❌ Error cargando d_prenda_material:", error);
        throw error;
    } finally {
        oltp.release();
        olap.release();
    }
}
