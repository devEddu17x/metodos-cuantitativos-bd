import { pool } from "../config";
import { faker } from "@faker-js/faker";

export async function seedGarments() {
  const connection = await pool.getConnection();

  try {
    console.log("🌱 Seeding prendas...");

    // Tipos de prendas específicas del rubro textil (sin cuero, calzado, ni ropa de boda)
    const tiposPrendas = [
      // Polos y camisetas
      "Polo básico",
      "Polo con diseño personalizado",
      "Camiseta cuello redondo",
      "Camiseta cuello V",
      "Polo deportivo",
      "Polo manga larga",
      "Camiseta oversize",
      "Polo pique",
      
      // Camisas
      "Camisa manga corta",
      "Camisa manga larga",
      "Camisa casual",
      "Camisa de trabajo",
      "Camisa estampada",
      
      // Pantalones
      "Pantalón jeans",
      "Pantalón de vestir",
      "Pantalón cargo",
      "Pantalón deportivo",
      "Short deportivo",
      "Short casual",
      "Pantalón chino",
      
      // Prendas deportivas
      "Buzo deportivo",
      "Casaca deportiva",
      "Polera deportiva",
      "Short de entrenamiento",
      "Conjunto deportivo",
      
      // Ropa casual/urbana
      "Hoodie",
      "Sudadera",
      "Chompa básica",
      "Cardigan",
      "Chaleco",
      
      // Ropa de trabajo/uniformes
      "Uniforme escolar",
      "Polo empresarial",
      "Delantal",
      "Overol de trabajo",
      "Chaleco corporativo",
      
      // Ropa interior y básicos
      "Camiseta interior",
      "Boxer",
      "Pijama",
      "Ropa de dormir",
      
      // Accesorios textiles
      "Gorra",
      "Bufanda",
      "Guantes de tela",
      "Bandana"
    ];

    // Materiales comunes en el rubro textil
    const materiales = [
      "100% Algodón",
      "Algodón + Poliéster",
      "Pique de algodón",
      "Jersey de algodón",
      "Denim",
      "Gabardina",
      "Drill",
      "Popelina",
      "Lycra",
      "Microfibra",
      "Franela",
      "Polar"
    ];

    // Colores populares
    const colores = [
      "Blanco", "Negro", "Azul marino", "Gris", "Rojo",
      "Verde", "Amarillo", "Rosado", "Celeste", "Morado",
      "Naranja", "Beige", "Marrón", "Turquesa", "Coral"
    ];

    const prendas = [];
    
    for (let i = 0; i < 100; i++) {
      const tipoPrenda = faker.helpers.arrayElement(tiposPrendas);
      const material = faker.helpers.arrayElement(materiales);
      const color = faker.helpers.arrayElement(colores);
      
      // Crear nombre de prenda combinando tipo y características
      const nombrePrenda = `${tipoPrenda} ${color}`.trim();
      
      // Descripción detallada
      const descripciones = [
        `${tipoPrenda} confeccionado en ${material}. Ideal para uso diario.`,
        `${tipoPrenda} de alta calidad en ${material}. Cómodo y duradero.`,
        `${tipoPrenda} en ${material}, perfecto para cualquier ocasión.`,
        `${tipoPrenda} premium en ${material}. Diseño moderno y funcional.`,
        `${tipoPrenda} clásico en ${material}. Estilo versátil y elegante.`
      ];
      
      const descripcion = faker.helpers.arrayElement(descripciones);
      
      // Diseño (especialmente importante para polos personalizados)
      const diseños = [
        "Diseño básico",
        "Logo bordado",
        "Estampado serigrafía",
        "Diseño personalizado",
        "Logo empresarial",
        "Diseño sublimado",
        "Bordado personalizado",
        "Estampado digital",
        "Diseño minimalista",
        "Logo institucional"
      ];
      
      const diseño = faker.helpers.arrayElement(diseños);

      prendas.push([
        nombrePrenda,
        descripcion,
        diseño
      ]);
    }

    await connection.query(
      `INSERT INTO prenda (nombre_prenda, descripcion, diseno) VALUES ?`,
      [prendas]
    );

    console.log("✅ 100 prendas insertadas!");
  } catch (error) {
    console.error("❌ Error seeding prendas:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Permite ejecutar: pnpm tsx src/entities/garments.seed.ts
if (require.main === module) {
  seedGarments()
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}