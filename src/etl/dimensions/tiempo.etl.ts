import { starSchemaPool } from "../../star-schema.config";

export async function loadDimensionTiempo() {
    const connection = await starSchemaPool.getConnection();
    console.log("⏰ Cargando dimensión d_tiempo...");

    try {
        // Generar calendario desde 2020 hasta 2030
        const startDate = new Date('2020-01-01');
        const endDate = new Date('2030-12-31');

        const tiempoRecords = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const day = currentDate.getDate();
            const dayOfWeek = currentDate.getDay(); // 0 = Domingo, 6 = Sábado

            // Calcular trimestre
            const quarter = Math.ceil(month / 3);

            // Calcular semana del año
            const firstDayOfYear = new Date(year, 0, 1);
            const pastDaysOfYear = (currentDate.getTime() - firstDayOfYear.getTime()) / 86400000;
            const weekOfYear = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

            // Nombres de meses
            const monthNames = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];

            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            tiempoRecords.push([
                currentDate.toISOString().split('T')[0], // fecha_completa
                year,
                quarter,
                month,
                monthNames[month - 1],
                day,
                dayOfWeek,
                weekOfYear,
                isWeekend
            ]);

            // Siguiente día
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Insertar en lotes de 1000
        const batchSize = 1000;
        for (let i = 0; i < tiempoRecords.length; i += batchSize) {
            const batch = tiempoRecords.slice(i, i + batchSize);
            await connection.query(
                `INSERT INTO d_tiempo (fecha_completa, ano, trimestre, mes, nombre_mes, dia_del_mes, dia_de_la_semana, semana_del_ano, es_fin_de_semana)
         VALUES ?`,
                [batch]
            );
        }

        console.log(`   ✅ ${tiempoRecords.length} registros de tiempo insertados (2020-2030)`);
    } catch (error) {
        console.error("   ❌ Error cargando d_tiempo:", error);
        throw error;
    } finally {
        connection.release();
    }
}
