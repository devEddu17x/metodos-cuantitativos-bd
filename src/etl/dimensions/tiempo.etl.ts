import { pool } from "../../config";
import { starSchemaPool } from "../../star-schema.config";

/**
 * ETL para d_tiempo
 * Extrae fechas únicas del ER y genera atributos derivados
 * Fuentes: pago.fecha, cotizacion.fecha_cotizacion, pedido.fecha_emision,
 *          pedido.fecha_entrega_estimada, pedido.fecha_entrega_real
 */
export async function loadDimensionTiempo() {
    const erConnection = await pool.getConnection();
    const starConnection = await starSchemaPool.getConnection();
    console.log("⏰ Cargando dimensión d_tiempo...");

    try {
        // 1. Extraer TODAS las fechas únicas del ER
        const [rows] = await erConnection.query<any[]>(`
            SELECT DISTINCT fecha_completa
            FROM (
                SELECT fecha as fecha_completa FROM pago WHERE fecha IS NOT NULL
                UNION
                SELECT fecha_cotizacion as fecha_completa FROM cotizacion WHERE fecha_cotizacion IS NOT NULL
                UNION
                SELECT fecha_emision as fecha_completa FROM pedido WHERE fecha_emision IS NOT NULL
                UNION
                SELECT fecha_entrega_estimada as fecha_completa FROM pedido WHERE fecha_entrega_estimada IS NOT NULL
                UNION
                SELECT fecha_entrega_real as fecha_completa FROM pedido WHERE fecha_entrega_real IS NOT NULL
            ) as fechas_unicas
            ORDER BY fecha_completa
        `);

        if (rows.length === 0) {
            console.log("   ⚠️  No se encontraron fechas en el ER");
            return;
        }

        // 2. Generar atributos derivados para cada fecha
        const tiempoRecords = rows.map((row: any) => {
            const date = new Date(row.fecha_completa);

            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado

            // Calcular trimestre
            const quarter = Math.ceil(month / 3);

            // Calcular semana del año
            const firstDayOfYear = new Date(year, 0, 1);
            const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
            const weekOfYear = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

            // Nombres de meses
            const monthNames = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];

            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            return [
                date.toISOString().split('T')[0], // fecha_completa (YYYY-MM-DD)
                year,
                quarter,
                month,
                monthNames[month - 1],
                day,
                dayOfWeek,
                weekOfYear,
                isWeekend ? 1 : 0
            ];
        });

        // 3. Insertar en lotes
        const batchSize = 500;
        for (let i = 0; i < tiempoRecords.length; i += batchSize) {
            const batch = tiempoRecords.slice(i, i + batchSize);
            await starConnection.query(
                `INSERT INTO d_tiempo 
                (fecha_completa, ano, trimestre, mes, nombre_mes, dia_del_mes, 
                 dia_de_la_semana, semana_del_ano, es_fin_de_semana)
                VALUES ?`,
                [batch]
            );
        }

        console.log(`   ✅ ${tiempoRecords.length} fechas únicas insertadas en d_tiempo`);
    } catch (error) {
        console.error("   ❌ Error cargando d_tiempo:", error);
        throw error;
    } finally {
        erConnection.release();
        starConnection.release();
    }
}
