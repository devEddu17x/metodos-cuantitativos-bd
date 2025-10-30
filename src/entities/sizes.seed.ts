import { pool } from "../config";

export async function seedSizes() {
  const connection = await pool.getConnection();

  try {
    console.log("🌱 Seeding tallas...");

    const tallas = [];

    // Tallas numéricas (2-16) - no distinguen géneros
    const tallasNumericas = [2, 4, 6, 8, 10, 12, 14, 16];
    
    for (const talla of tallasNumericas) {
      tallas.push([talla.toString()]);
    }

    // XS - exclusivamente mujer
    tallas.push(["XS"]);

    // S, M, L, XL - se dividen en unisex, hombre y mujer
    const tallasBasicas = ["S", "M", "L", "XL"];
    const generos = ["Unisex", "Hombre", "Mujer"];
    
    for (const talla of tallasBasicas) {
      for (const genero of generos) {
        tallas.push([`${talla} ${genero}`]);
      }
    }

    // XXL, XXXL - menos frecuentes, también se dividen en unisex, hombre y mujer
    const tallasGrandes = ["XXL", "XXXL"];
    
    for (const talla of tallasGrandes) {
      for (const genero of generos) {
        tallas.push([`${talla} ${genero}`]);
      }
    }

    await connection.query(
      `INSERT INTO talla (talla) VALUES ?`,
      [tallas]
    );

    console.log(`✅ ${tallas.length} tallas insertadas!`);
    console.log("📋 Distribución:");
    console.log("   • Tallas numéricas (2-16): 8 tallas");
    console.log("   • XS Mujer: 1 talla");
    console.log("   • S,M,L,XL (Unisex/Hombre/Mujer): 12 tallas");
    console.log("   • XXL,XXXL (Unisex/Hombre/Mujer): 6 tallas");
    console.log(`   🎯 Total: ${tallas.length} tallas`);
  } catch (error) {
    console.error("❌ Error seeding tallas:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Permite ejecutar: pnpm tsx src/entities/sizes.seed.ts
if (require.main === module) {
  seedSizes()
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}