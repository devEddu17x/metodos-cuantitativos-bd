import { pool } from "../config";
import * as fs from "fs";
import * as path from "path";

export async function seedAddresses() {
    const connection = await pool.getConnection();

    try {
        console.log("🌱 Seeding direcciones desde CSV...");

        // Leer el archivo CSV
        const csvPath = path.join(__dirname, "../../direcciones.csv");
        const csvContent = fs.readFileSync(csvPath, "utf-8");

        // Parsear el CSV
        const lines = csvContent.split("\n");
        const addresses = [];

        // Saltar la primera línea (encabezado) y procesar el resto
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Saltar líneas vacías

            // Dividir por coma, teniendo en cuenta que puede haber comas dentro de comillas
            const values = line.split(",");

            // Extraer los valores necesarios
            // Formato: Código,Nombre,Dirección,Departamento,Provincia,Distrito
            const direccion = values[1]?.trim();
            const departamento = values[2]?.trim();
            const provincia = values[3]?.trim();
            const distrito = values[4]?.trim();

            // Validar que los campos requeridos existan
            if (departamento && provincia && distrito && direccion) {
                addresses.push([
                    departamento,
                    provincia,
                    distrito,
                    direccion
                ]);
            }
        }

        if (addresses.length === 0) {
            console.log("⚠️ No se encontraron direcciones válidas en el CSV");
            return;
        }

        // Insertar direcciones en la base de datos
        const query = `
      INSERT INTO direccion (departamento, provincia, distrito, calle)
      VALUES ?
    `;

        const [result] = await connection.query(query, [addresses]);

        console.log(`✅ ${addresses.length} direcciones insertadas exitosamente desde el CSV`);
    } catch (error) {
        console.error("❌ Error al insertar direcciones:", error);
        throw error;
    } finally {
        connection.release();
    }
}
