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
        // 1. Obtener todas las combinaciones prenda-talla
        const [garmentSizes] = await connection.query<GarmentSizePacket[]>(
            "SELECT prenda_id, talla_id FROM prenda_talla"
        );

        if (garmentSizes.length === 0) {
            console.log("⚠️ No hay combinaciones prenda-talla para procesar.");
            return;
        }

        let preciosActualizados = 0;
        let costoTotalAcumulado = 0;
        let precioTotalAcumulado = 0;

        // 2. Para cada combinación prenda-talla, calcular el costo total de materiales
        for (const gs of garmentSizes) {
            // Obtener todos los materiales usados en esta prenda-talla
            const [materialsUsed] = await connection.query<MaterialCostPacket[]>(
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
        WHERE ptm.prenda_id = ? AND ptm.talla_id = ?
        `,
                [gs.prenda_id, gs.talla_id]
            );

            if (materialsUsed.length === 0) {
                // Si no tiene materiales asignados, no se puede calcular el precio
                continue;
            }

            // Calcular el costo total de los materiales
            let costoTotalMateriales = 0;

            for (const material of materialsUsed) {
                // Precio unitario = precio / cantidad_base
                const precioUnitario = material.precio / material.cantidad_base;

                // Costo del material = precio_unitario × cantidad_usada
                const costoMaterial = precioUnitario * material.cantidad;

                costoTotalMateriales += costoMaterial;
            }

            // Agregar margen de ganancia entre 5 y 15 soles
            const margenGanancia = faker.number.float({ min: 5, max: 15, fractionDigits: 2 });

            // Precio final = costo_materiales + margen_ganancia
            const precioFinal = costoTotalMateriales + margenGanancia;

            // Actualizar el precio en la tabla prenda_talla
            await connection.query(
                `
        UPDATE prenda_talla 
        SET precio = ? 
        WHERE prenda_id = ? AND talla_id = ?
        `,
                [precioFinal, gs.prenda_id, gs.talla_id]
            );

            preciosActualizados++;
            costoTotalAcumulado += costoTotalMateriales;
            precioTotalAcumulado += precioFinal;
        }

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
