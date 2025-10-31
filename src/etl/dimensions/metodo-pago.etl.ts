import { pool } from "../../config";
import { starSchemaPool } from "../../star-schema.config";
import { RowDataPacket } from "mysql2/promise";

interface MetodoPagoPacket extends RowDataPacket {
    id: number;
    numero_pago_pedido: number;
    metodo_pago: string;
}

export async function loadDimensionMetodoPago() {
    const oltp = await pool.getConnection();
    const olap = await starSchemaPool.getConnection();
    console.log("💳 Cargando dimensión d_metodo_pago...");

    try {
        // Obtener todos los pagos con su ID y número de pago
        // metodo_pago_id será: "pago_id-numero_pago_pedido" (ej: "1-1", "1-2")
        const [metodos] = await oltp.query<MetodoPagoPacket[]>(
            `SELECT id, numero_pago_pedido, metodo_pago 
             FROM pago 
             ORDER BY id, numero_pago_pedido`
        );

        if (metodos.length === 0) {
            console.log("   ⚠️ No hay métodos de pago para cargar");
            return;
        }

        // Crear ID compuesto: "pago_id-numero_pago_pedido"
        const records = metodos.map(m => [
            `${m.id}-${m.numero_pago_pedido}`, // metodo_pago_id
            m.metodo_pago                       // descripcion
        ]);

        console.log('   🔄 Procesando registros de métodos de pago...', records.length);

        await olap.query(
            `INSERT INTO d_metodo_pago (metodo_pago_id, descripcion) VALUES ?`,
            [records]
        );

        console.log(`   ✅ ${records.length} métodos de pago insertados`);
    } catch (error) {
        console.error("   ❌ Error cargando d_metodo_pago:", error);
        throw error;
    } finally {
        oltp.release();
        olap.release();
    }
}
