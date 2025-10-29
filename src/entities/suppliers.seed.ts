import { pool } from "../config";
import { faker } from "@faker-js/faker";

export async function seedSuppliers() {
    const connection = await pool.getConnection();

    try {
        console.log("🌱 Seeding proveedores...");

        const suppliers = [];

        // Generar 100 proveedores del Perú
        for (let i = 0; i < 100; i++) {
            // RUC peruano (11 dígitos, comienza con 10 o 20)
            const rucPrefix = faker.helpers.arrayElement(['10', '20']);
            const ruc = `${rucPrefix}${faker.string.numeric(9)}`;

            // Razón social de empresas peruanas
            const razonSocial = `${faker.company.name()} ${faker.helpers.arrayElement([
                'S.A.C.',
                'S.R.L.',
                'E.I.R.L.',
                'S.A.',
                'S.A.A.'
            ])}`;

            // Representante legal
            const representante = faker.person.fullName();

            // Teléfono peruano
            const telefono = `+51 9${faker.string.numeric(8)}`;

            suppliers.push([
                razonSocial,
                representante,
                telefono,
                ruc,
            ]);
        }

        // Insertar proveedores en la base de datos
        const query = `
      INSERT INTO proveedor (razon_social, representante, telefono, ruc)
      VALUES ?
    `;

        await connection.query(query, [suppliers]);
        console.log(`✅ ${suppliers.length} proveedores insertados exitosamente`);
    } catch (error) {
        console.error("❌ Error al insertar proveedores:", error);
        throw error;
    } finally {
        connection.release();
    }
}
