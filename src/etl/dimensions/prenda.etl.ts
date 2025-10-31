import { pool } from "../../config";
import { starSchemaPool } from "../../star-schema.config";
import { RowDataPacket } from "mysql2/promise";

interface PrendaTallaPacket extends RowDataPacket {
    nombre_prenda: string;
    descripcion: string;
    diseno: string;
    talla: string;
    precio: number;
}

export async function loadDimensionPrenda() {
    const oltp = await pool.getConnection();
    const olap = await starSchemaPool.getConnection();
    console.log("👕 Cargando dimensión d_prenda...");

    try {
        // JOIN prenda + prenda_talla + talla para combinar
        // Nota: prenda_talla no tiene ID, su PK es compuesta (prenda_id, talla_id)
        // En star schema, usamos ROW_NUMBER para generar IDs únicos
        const [prendasTallas] = await oltp.query<PrendaTallaPacket[]>(
            `SELECT 
        p.nombre_prenda,
        p.descripcion,
        p.diseno,
        t.talla,
        pt.precio
       FROM prenda_talla pt
       INNER JOIN prenda p ON pt.prenda_id = p.id
       INNER JOIN talla t ON pt.talla_id = t.id
       ORDER BY pt.prenda_id, pt.talla_id`
        );

        if (prendasTallas.length === 0) {
            console.log("   ⚠️ No hay prendas-tallas para cargar");
            return;
        }

        // Generar IDs secuenciales empezando desde 1
        const records = prendasTallas.map((pt, index) => [
            index + 1, // prenda_id secuencial
            pt.nombre_prenda,
            pt.descripcion,
            pt.diseno,
            pt.talla,
            null // categoria_prenda - no existe en schema ER actual
        ]); await olap.query(
            `INSERT INTO d_prenda 
       (prenda_id, nombre_prenda, descripcion_prenda, diseno_prenda, 
        talla_prenda, categoria_prenda)
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
