import { starSchemaPool, ensureStarSchemaDatabaseExists } from "./star-schema.config";

async function createStarSchema() {
  // First, ensure the star schema database exists
  await ensureStarSchemaDatabaseExists();

  // Now get a connection from the pool
  const connection = await starSchemaPool.getConnection();

  try {
    console.log("Creating star schema database...");

    // Drop tables if they exist (in reverse order of dependencies)
    await connection.query("DROP TABLE IF EXISTS h_venta");
    await connection.query("DROP TABLE IF EXISTS d_tiempo");
    await connection.query("DROP TABLE IF EXISTS d_proveedor");
    await connection.query("DROP TABLE IF EXISTS d_empleado");
    await connection.query("DROP TABLE IF EXISTS d_direccion");
    await connection.query("DROP TABLE IF EXISTS d_cliente");
    await connection.query("DROP TABLE IF EXISTS d_prenda");
    await connection.query("DROP TABLE IF EXISTS d_material");
    await connection.query("DROP TABLE IF EXISTS d_metodo_pago");
    await connection.query("DROP TABLE IF EXISTS d_estado_pedido");

    // Create dimension tables

    // Dimension: d_tiempo
    await connection.query(`
      CREATE TABLE d_tiempo (
        tiempo_id INT AUTO_INCREMENT PRIMARY KEY,
        fecha_completa DATE NOT NULL,
        ano INT NOT NULL,
        trimestre INT NOT NULL,
        mes INT NOT NULL,
        nombre_mes VARCHAR(20) NOT NULL,
        dia_del_mes INT NOT NULL,
        dia_de_la_semana INT NOT NULL,
        semana_del_ano INT NOT NULL,
        es_fin_de_semana BOOLEAN NOT NULL
      )
    `);
    console.log("Table 'd_tiempo' created");

    // Dimension: d_cliente
    await connection.query(`
      CREATE TABLE d_cliente (
        cliente_id INT PRIMARY KEY,
        nombre_completo_cliente VARCHAR(255) NOT NULL,
        tipo_cliente VARCHAR(50) NOT NULL,
        documento_identidad VARCHAR(20) NOT NULL,
        telefono VARCHAR(20),
        referido_por VARCHAR(100),
        fecha_primer_compra DATE
      )
    `);
    console.log("Table 'd_cliente' created");

    // Dimension: d_direccion
    await connection.query(`
      CREATE TABLE d_direccion (
        direccion_id INT PRIMARY KEY,
        departamento VARCHAR(255) NOT NULL,
        provincia VARCHAR(255) NOT NULL,
        distrito VARCHAR(255) NOT NULL,
        calle_direccion VARCHAR(255) NOT NULL
      )
    `);
    console.log("Table 'd_direccion' created");

    // Dimension: d_empleado
    await connection.query(`
      CREATE TABLE d_empleado (
        empleado_id INT PRIMARY KEY,
        nombre_completo_empleado VARCHAR(255) NOT NULL,
        email_empleado VARCHAR(100) NOT NULL
      )
    `);
    console.log("Table 'd_empleado' created");

    // Dimension: d_prenda
    await connection.query(`
      CREATE TABLE d_prenda (
        prenda_id VARCHAR(20) PRIMARY KEY,
        nombre_prenda VARCHAR(100) NOT NULL,
        descripcion_prenda TEXT,
        diseno_prenda VARCHAR(255),
        talla_prenda VARCHAR(30) NOT NULL
      )
    `);
    console.log("Table 'd_prenda' created");

    // Dimension: d_material
    await connection.query(`
      CREATE TABLE d_material (
        material_id INT PRIMARY KEY,
        nombre_material VARCHAR(100) NOT NULL,
        categoria_material VARCHAR(100),
        unidad_medida VARCHAR(20) NOT NULL,
        precio_compra_material DECIMAL(10, 2) NOT NULL,
        cantidad_base DECIMAL(10, 2) NOT NULL
      )
    `);
    console.log("Table 'd_material' created");

    // Dimension: d_proveedor
    await connection.query(`
      CREATE TABLE d_proveedor (
        proveedor_id INT PRIMARY KEY,
        razon_social_proveedor VARCHAR(255) NOT NULL,
        representante_proveedor VARCHAR(100),
        telefono_proveedor VARCHAR(20)
      )
    `);
    console.log("Table 'd_proveedor' created");

    // Dimension: d_metodo_pago
    await connection.query(`
      CREATE TABLE d_metodo_pago (
        metodo_pago_id VARCHAR(20) PRIMARY KEY,
        descripcion VARCHAR(50) NOT NULL
      )
    `);
    console.log("Table 'd_metodo_pago' created");

    // Dimension: d_estado_pedido
    await connection.query(`
      CREATE TABLE d_estado_pedido (
        estado_pedido_id INT AUTO_INCREMENT PRIMARY KEY,
        descripcion_estado VARCHAR(100) NOT NULL,
        tipo_estado VARCHAR(50) NOT NULL
      )
    `);
    console.log("Table 'd_estado_pedido' created");

    // Create fact table: h_venta
    await connection.query(`
      CREATE TABLE h_venta (
        venta_id INT AUTO_INCREMENT PRIMARY KEY,
        cotizacion_empleado_id INT NOT NULL,
        tiempo_cotizacion_id INT NOT NULL,
        tiempo_pedido_id INT NOT NULL,
        tiempo_entrega_estimado_id INT NOT NULL,
        tiempo_entrega_real_id INT NOT NULL,
        tiempo_primer_pago_id INT NOT NULL,
        tiempo_segundo_pago_id INT NOT NULL,
        metodo_primer_pago_id VARCHAR(20) NOT NULL,
        metodo_segundo_pago_id VARCHAR(20) NOT NULL,
        primer_pago_empleado_id INT NOT NULL,
        segundo_pago_empleado_id INT NOT NULL,
        cliente_id INT NOT NULL,
        prenda_id VARCHAR(20) NOT NULL,
        direccion_id INT NOT NULL,
        estado_pedido_id INT NOT NULL,
        proveedor_id INT NOT NULL,
        material_id INT NOT NULL,
        cantidad INT NOT NULL,
        precio_unitario DECIMAL(10, 2) NOT NULL,
        monto_total_linea DECIMAL(10, 2) NOT NULL,
        monto_primer_pago_prorrateado DECIMAL(10, 2) NOT NULL,
        monto_segundo_pago_prorrateado DECIMAL(10, 2) NOT NULL,
        costo_unitario_material DECIMAL(10, 2) NOT NULL,
        margen_bruto DECIMAL(10, 2) NOT NULL,
        dias_cotizacion_a_pedido INT NOT NULL,
        dias_pedido_a_entrega INT NOT NULL,
        FOREIGN KEY (cotizacion_empleado_id) REFERENCES d_empleado(empleado_id),
        FOREIGN KEY (tiempo_cotizacion_id) REFERENCES d_tiempo(tiempo_id),
        FOREIGN KEY (tiempo_pedido_id) REFERENCES d_tiempo(tiempo_id),
        FOREIGN KEY (tiempo_entrega_estimado_id) REFERENCES d_tiempo(tiempo_id),
        FOREIGN KEY (tiempo_entrega_real_id) REFERENCES d_tiempo(tiempo_id),
        FOREIGN KEY (tiempo_primer_pago_id) REFERENCES d_tiempo(tiempo_id),
        FOREIGN KEY (tiempo_segundo_pago_id) REFERENCES d_tiempo(tiempo_id),
        FOREIGN KEY (metodo_primer_pago_id) REFERENCES d_metodo_pago(metodo_pago_id),
        FOREIGN KEY (metodo_segundo_pago_id) REFERENCES d_metodo_pago(metodo_pago_id),
        FOREIGN KEY (primer_pago_empleado_id) REFERENCES d_empleado(empleado_id),
        FOREIGN KEY (segundo_pago_empleado_id) REFERENCES d_empleado(empleado_id),
        FOREIGN KEY (cliente_id) REFERENCES d_cliente(cliente_id),
        FOREIGN KEY (prenda_id) REFERENCES d_prenda(prenda_id),
        FOREIGN KEY (direccion_id) REFERENCES d_direccion(direccion_id),
        FOREIGN KEY (estado_pedido_id) REFERENCES d_estado_pedido(estado_pedido_id),
        FOREIGN KEY (proveedor_id) REFERENCES d_proveedor(proveedor_id),
        FOREIGN KEY (material_id) REFERENCES d_material(material_id)
      )
    `);
    console.log("Table 'h_venta' (fact table) created");

    console.log("✅ Star schema database created successfully!");
  } catch (error) {
    console.error("❌ Error creating star schema:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Execute the star schema creation
createStarSchema()
  .then(() => {
    console.log("Star schema creation completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Star schema creation failed:", error);
    process.exit(1);
  });
