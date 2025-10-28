import { pool } from "./config";

async function dropDatabase() {
  const connection = await pool.getConnection();

  try {
    const dbName = process.env.MYSQL_DATABASE;
    console.log(`🗑️  Dropping database '${dbName}'...`);

    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);

    console.log(`✅ Database '${dbName}' has been completely deleted!`);
  } catch (error) {
    console.error("❌ Error dropping database:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Execute the database deletion
dropDatabase()
  .then(() => {
    console.log("Database cleanup completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Database cleanup failed:", error);
    process.exit(1);
  });
