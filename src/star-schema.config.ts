import { createPool, Pool, createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

export const starSchemaPool: Pool = createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    database: process.env.MYSQL_STAR_SCHEMA,
    password: process.env.MYSQL_PASSWORD,
});

// Function to create star schema database if it doesn't exist
export async function ensureStarSchemaDatabaseExists() {
    const connection = await createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
    });

    try {
        const dbName = process.env.MYSQL_STAR_SCHEMA;
        console.log(`Creating star schema database '${dbName}' if it doesn't exist...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`✅ Star schema database '${dbName}' is ready`);
    } finally {
        await connection.end();
    }
}
