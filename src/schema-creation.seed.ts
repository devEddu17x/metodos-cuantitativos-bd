import { pool, ensureDatabaseExists } from "./config";

async function createSchema() {
  // First, ensure the database exists
  await ensureDatabaseExists();

  // Now get a connection from the pool
  const connection = await pool.getConnection();

  try {
    console.log("Creating database schema...");

    // Drop tables if they exist (in reverse order of dependencies)
    await connection.query("DROP TABLE IF EXISTS detalle_cotizacion");
    await connection.query("DROP TABLE IF EXISTS cliente_juridico");
    await connection.query("DROP TABLE IF EXISTS cliente_natural");
    await connection.query("DROP TABLE IF EXISTS pago");
    await connection.query("DROP TABLE IF EXISTS proveedor_material");
    await connection.query("DROP TABLE IF EXISTS prenda_talla_material");
    await connection.query("DROP TABLE IF EXISTS material");
    await connection.query("DROP TABLE IF EXISTS proveedor");
    await connection.query("DROP TABLE IF EXISTS prenda_talla");
    await connection.query("DROP TABLE IF EXISTS prenda");
    await connection.query("DROP TABLE IF EXISTS talla");
    await connection.query("DROP TABLE IF EXISTS pedido");
    await connection.query("DROP TABLE IF EXISTS cotizacion");
    await connection.query("DROP TABLE IF EXISTS cliente");
    await connection.query("DROP TABLE IF EXISTS empleado");
    await connection.query("DROP TABLE IF EXISTS direccion");

    // Create table: direccion
    await connection.query(`
      CREATE TABLE direccion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        departamento VARCHAR(255) NOT NULL,
        provincia VARCHAR(255) NOT NULL,
        distrito VARCHAR(255) NOT NULL,
        calle VARCHAR(255) NOT NULL
      )
    `);
    console.log("Table 'direccion' created");

    // Create table: empleado
    await connection.query(`
      CREATE TABLE empleado (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombres VARCHAR(100) NOT NULL,
        apellidos VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL
      )
    `);
    console.log("Table 'empleado' created");

    // Create table: pago
    await connection.query(`
      CREATE TABLE pago (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fecha DATE NOT NULL,
        monto DECIMAL(10, 2) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        metodo_pago VARCHAR(50) NOT NULL,
        numero_pago_pedido TINYINT,
        pedido_id INT,
        empleado_id INT NOT NULL,
        FOREIGN KEY (empleado_id) REFERENCES empleado(id)
      )
    `);
    console.log("Table 'pago' created");

    // Create table: cliente
    await connection.query(`
      CREATE TABLE cliente (
        id INT AUTO_INCREMENT PRIMARY KEY,
        telefono VARCHAR(20) NOT NULL,
        descripcion TEXT,
        referido VARCHAR(100),
        fecha_primer_compra DATE
      )
    `);
    console.log("Table 'cliente' created");

    // Create table: cliente_juridico
    await connection.query(`
      CREATE TABLE cliente_juridico (
        ruc VARCHAR(20) PRIMARY KEY,
        razon_social VARCHAR(255) NOT NULL,
        delegado VARCHAR(100),
        cliente_id INT NOT NULL,
        FOREIGN KEY (cliente_id) REFERENCES cliente(id)
      )
    `);
    console.log("Table 'cliente_juridico' created");

    // Create table: cliente_natural
    await connection.query(`
      CREATE TABLE cliente_natural (
        dni VARCHAR(20) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        cliente_id INT NOT NULL,
        FOREIGN KEY (cliente_id) REFERENCES cliente(id)
      )
    `);
    console.log("Table 'cliente_natural' created");

    // Create table: cotizacion
    await connection.query(`
      CREATE TABLE cotizacion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fecha_cotizacion DATE NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        estado VARCHAR(50) NOT NULL,
        cliente_id INT NOT NULL,
        empleado_id INT NOT NULL,
        FOREIGN KEY (cliente_id) REFERENCES cliente(id),
        FOREIGN KEY (empleado_id) REFERENCES empleado(id)
      )
    `);
    console.log("Table 'cotizacion' created");

    // Create table: pedido
    await connection.query(`
      CREATE TABLE pedido (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cortesia VARCHAR(255),
        total DECIMAL(10, 2) NOT NULL,
        estado VARCHAR(50) NOT NULL,
        fecha_emision DATE NOT NULL,
        fecha_entrega DATE,
        cotizacion_id INT NOT NULL,
        direccion_id INT NOT NULL,
        FOREIGN KEY (cotizacion_id) REFERENCES cotizacion(id),
        FOREIGN KEY (direccion_id) REFERENCES direccion(id)
      )
    `);
    console.log("Table 'pedido' created");

    // Update pago table to add foreign key to pedido
    await connection.query(`
      ALTER TABLE pago
      ADD FOREIGN KEY (pedido_id) REFERENCES pedido(id)
    `);
    console.log("Foreign key added to 'pago' table");

    // Create table: prenda
    await connection.query(`
      CREATE TABLE prenda (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre_prenda VARCHAR(100) NOT NULL,
        descripcion TEXT,
        diseno VARCHAR(255)
      )
    `);
    console.log("Table 'prenda' created");

    // Create table: talla
    await connection.query(`
      CREATE TABLE talla (
        id INT AUTO_INCREMENT PRIMARY KEY,
        talla VARCHAR(30) NOT NULL
      )
    `);
    console.log("Table 'talla' created");

    // Create table: prenda_talla
    await connection.query(`
      CREATE TABLE prenda_talla (
        prenda_id INT NOT NULL,
        talla_id INT NOT NULL,
        PRIMARY KEY (prenda_id, talla_id),
        FOREIGN KEY (prenda_id) REFERENCES prenda(id),
        FOREIGN KEY (talla_id) REFERENCES talla(id)
      )
    `);
    console.log("Table 'prenda_talla' created");

    // Create table: material
    await connection.query(`
      CREATE TABLE material (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        categoria VARCHAR(100),
        precio DECIMAL(10, 2) NOT NULL,
        unidad_medida VARCHAR(20) NOT NULL,
        cantidad_base DECIMAL(10, 2) NOT NULL
      )
    `);
    console.log("Table 'material' created");

    // Create table: proveedor
    await connection.query(`
      CREATE TABLE proveedor (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ruc VARCHAR(11),
        razon_social VARCHAR(255) NOT NULL,
        representante VARCHAR(100),
        telefono VARCHAR(20)
      )
    `);
    console.log("Table 'proveedor' created");

    // Create table: proveedor_material
    await connection.query(`
      CREATE TABLE proveedor_material (
        proveedor_id INT NOT NULL,
        material_id INT NOT NULL,
        PRIMARY KEY (proveedor_id, material_id),
        FOREIGN KEY (proveedor_id) REFERENCES proveedor(id),
        FOREIGN KEY (material_id) REFERENCES material(id)
      )
    `);
    console.log("Table 'proveedor_material' created");

    // Create table: prenda_talla_material
    await connection.query(`
      CREATE TABLE prenda_talla_material (
        prenda_id INT NOT NULL,
        talla_id INT NOT NULL,
        material_id INT NOT NULL,
        cantidad DECIMAL(10, 2) NOT NULL,
        PRIMARY KEY (prenda_id, talla_id, material_id),
        FOREIGN KEY (prenda_id) REFERENCES prenda(id),
        FOREIGN KEY (talla_id) REFERENCES talla(id),
        FOREIGN KEY (material_id) REFERENCES material(id)
      )
    `);
    console.log("Table 'prenda_talla_material' created");

    // Create table: detalle_cotizacion
    await connection.query(`
      CREATE TABLE detalle_cotizacion (
        unitario DECIMAL(10, 2) NOT NULL,
        cantidad INT NOT NULL,
        cotizacion_id INT NOT NULL,
        prenda_id INT NOT NULL,
        talla_id INT NOT NULL,
        PRIMARY KEY (cotizacion_id, prenda_id, talla_id),
        FOREIGN KEY (cotizacion_id) REFERENCES cotizacion(id),
        FOREIGN KEY (prenda_id, talla_id) REFERENCES prenda_talla(prenda_id, talla_id)
      )
    `);
    console.log("Table 'detalle_cotizacion' created");

    console.log("✅ Database schema created successfully!");
  } catch (error) {
    console.error("❌ Error creating schema:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Execute the schema creation
createSchema()
  .then(() => {
    console.log("Schema creation completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Schema creation failed:", error);
    process.exit(1);
  });
