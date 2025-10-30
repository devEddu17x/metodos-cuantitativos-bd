import { pool } from "../../config";
import { faker } from "@faker-js/faker";
import { RowDataPacket } from "mysql2/promise";

// Interfaces
interface GarmentSizePacket extends RowDataPacket {
    prenda_id: number;
    talla_id: number;
}

interface MaterialCostPacket extends RowDataPacket {
    prenda_id: number;
    talla_id: number;
    material_id: number;
    cantidad: number;
    precio: number;
    unidad_medida: string;
    cantidad_base: number;
}

export async function generatePricesPerGarmentSize() {
    const connection = await pool.getConnection();
    console.log("💰 Generando precios para cada prenda-talla...");

    try {
        // 1. Obtener TODOS los materiales con sus costos en UNA SOLA CONSULTA
        console.log("   📥 Obteniendo todos los materiales y costos...");
        const [allMaterialsData] = await connection.query<MaterialCostPacket[]>(
            `
            SELECT 
              ptm.prenda_id,
              ptm.talla_id,
              ptm.material_id,
              ptm.cantidad,
              m.precio,
              m.unidad_medida,
              m.cantidad_base
            FROM prenda_talla_material ptm
            INNER JOIN material m ON ptm.material_id = m.id
            ORDER BY ptm.prenda_id, ptm.talla_id
            `
        );

        if (allMaterialsData.length === 0) {
            console.log("⚠️ No hay materiales asignados a las prendas-talla.");
            return;
        }

        console.log(`   ✓ ${allMaterialsData.length} registros obtenidos`);

        // 2. Agrupar materiales por prenda_id y talla_id
        console.log("   🔄 Agrupando y calculando costos...");
        const garmentSizeCosts = new Map<string, { prenda_id: number, talla_id: number, costo: number }>();

        for (const material of allMaterialsData) {
            const key = `${material.prenda_id}-${material.talla_id}`;

            // Precio unitario = precio / cantidad_base
            const precioUnitario = material.precio / material.cantidad_base;

            // Costo del material = precio_unitario × cantidad_usada
            const costoMaterial = precioUnitario * material.cantidad;

            // Acumular costo para esta prenda-talla
            if (garmentSizeCosts.has(key)) {
                garmentSizeCosts.get(key)!.costo += costoMaterial;
            } else {
                garmentSizeCosts.set(key, {
                    prenda_id: material.prenda_id,
                    talla_id: material.talla_id,
                    costo: costoMaterial
                });
            }
        }

        console.log(`   ✓ ${garmentSizeCosts.size} combinaciones prenda-talla procesadas`);

        // 3. Generar los precios finales y preparar UPDATE masivo
        console.log("   💰 Generando precios con margen de ganancia...");
        const updateValues: [number, number, number][] = [];
        let costoTotalAcumulado = 0;
        let precioTotalAcumulado = 0;

        for (const [key, data] of garmentSizeCosts.entries()) {
            // Agregar margen de ganancia entre 5 y 15 soles
            const margenGanancia = faker.number.float({ min: 5, max: 15, fractionDigits: 2 });

            // Precio final = costo_materiales + margen_ganancia
            const precioFinal = parseFloat((data.costo + margenGanancia).toFixed(2));

            updateValues.push([precioFinal, data.prenda_id, data.talla_id]);

            costoTotalAcumulado += data.costo;
            precioTotalAcumulado += precioFinal;
        }

        // 4. Actualizar TODOS los precios en una sola transacción
        console.log("   📝 Actualizando precios en la base de datos...");

        // Usar transacción para mayor velocidad
        await connection.beginTransaction();

        try {
            // Actualizar en lotes de 500 para evitar límites de SQL
            const batchSize = 500;
            for (let i = 0; i < updateValues.length; i += batchSize) {
                const batch = updateValues.slice(i, i + batchSize);

                // Generar consulta con CASE para actualización masiva
                const caseStatements = batch.map(() =>
                    'WHEN prenda_id = ? AND talla_id = ? THEN ?'
                ).join(' ');

                const values: any[] = [];
                batch.forEach(([precio, prenda_id, talla_id]) => {
                    values.push(prenda_id, talla_id, precio);
                });

                await connection.query(
                    `UPDATE prenda_talla 
                     SET precio = CASE ${caseStatements} ELSE precio END
                     WHERE (prenda_id, talla_id) IN (${batch.map(() => '(?, ?)').join(', ')})`,
                    [...values, ...batch.map(([, p, t]) => [p, t]).flat()]
                );
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        }

        const preciosActualizados = updateValues.length;
        const margenPromedioAcumulado = precioTotalAcumulado - costoTotalAcumulado;

        console.log(`✅ ${preciosActualizados} precios generados y actualizados!`);
        console.log(`\n📊 Estadísticas:`);
        console.log(`   • Costo promedio de materiales: S/ ${(costoTotalAcumulado / preciosActualizados).toFixed(2)}`);
        console.log(`   • Precio promedio final: S/ ${(precioTotalAcumulado / preciosActualizados).toFixed(2)}`);
        console.log(`   • Margen promedio de ganancia: S/ ${(margenPromedioAcumulado / preciosActualizados).toFixed(2)}`);

        // Mostrar algunos ejemplos
        const [ejemplos] = await connection.query<RowDataPacket[]>(
            `
      SELECT 
        p.nombre_prenda,
        t.talla,
        pt.precio
      FROM prenda_talla pt
      INNER JOIN prenda p ON pt.prenda_id = p.id
      INNER JOIN talla t ON pt.talla_id = t.id
      WHERE pt.precio IS NOT NULL
      ORDER BY RAND()
      LIMIT 5
      `
        );

        console.log(`\n💡 Ejemplos de precios generados:`);
        ejemplos.forEach((ejemplo: any) => {
            console.log(`   • ${ejemplo.nombre_prenda} - Talla ${ejemplo.talla}: S/ ${parseFloat(ejemplo.precio).toFixed(2)}`);
        });

    } catch (error) {
        console.error("❌ Error generando precios:", error);
        throw error;
    } finally {
        connection.release();
    }
}

// Permite ejecutar: pnpm tsx src/entities/generate-prices-per-garment-size.ts
if (require.main === module) {
    generatePricesPerGarmentSize()
        .then(() => {
            console.log("Generación de precios completada");
            process.exit(0);
        })
        .catch((error) => {
            console.error("Generación de precios falló:", error);
            process.exit(1);
        });
}
