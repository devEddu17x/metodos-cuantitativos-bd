import { pool } from "../../config";
import { starSchemaPool } from "../../star-schema.config";
import { RowDataPacket } from "mysql2/promise";

interface PrendaTallaPacket extends RowDataPacket {
    prenda_id: number;
    talla_id: number;
    nombre_prenda: string;
    descripcion: string;
    diseno: string;
    talla: string;
}

export async function loadDimensionPrenda() {
    const oltp = await pool.getConnection();
    const olap = await starSchemaPool.getConnection();
    console.log("👕 Cargando dimensión d_prenda...");

    try {
        // JOIN prenda + prenda_talla + talla para combinar
        // prenda_id será la concatenación: prenda_id-talla_id (ej: "1-2")
        const [prendasTallas] = await oltp.query<PrendaTallaPacket[]>(
            `SELECT 
        pt.prenda_id,
        pt.talla_id,
        p.nombre_prenda,
        p.descripcion,
        p.diseno,
        t.talla
       FROM prenda_talla pt
       INNER JOIN prenda p ON pt.prenda_id = p.id
       INNER JOIN talla t ON pt.talla_id = t.id
       ORDER BY pt.prenda_id, pt.talla_id`
        );

        if (prendasTallas.length === 0) {
            console.log("   ⚠️ No hay prendas-tallas para cargar");
            return;
        }

        // Usar concatenación de IDs: "prenda_id-talla_id"
        const records = prendasTallas.map(pt => [
            `${pt.prenda_id}-${pt.talla_id}`, // prenda_id compuesto
            pt.nombre_prenda,
            pt.descripcion,
            pt.diseno,
            pt.talla
        ]);

        await olap.query(
            `INSERT INTO d_prenda 
       (prenda_id, nombre_prenda, descripcion_prenda, diseno_prenda, talla_prenda)
       VALUES ?`,
            [records]
        );

        console.log(`   ✅ ${records.length} prendas-tallas insertadas`);
    } catch (error) {
        console.error("   ❌ Error cargando d_prenda:", error);
        throw error;
    } finally {
        oltp.release();
        olap.release();
    }
}
