import { pool } from "../config";
import { faker } from "@faker-js/faker";

export async function seedMaterials() {
  const connection = await pool.getConnection();

  try {
    console.log("🌱 Seeding materiales...");

    // Categorías de materiales para confección textil
    const categoriasMateriales = {
      "Tela": [
        "Algodón 20/1", "Algodón 30/1", "Algodón 40/1", "Algodón Peinado",
        "Jersey 100% Algodón", "Jersey Algodón/Poliéster", "Pique de Algodón",
        "Popelina", "Gabardina", "Drill", "Denim 12 oz", "Denim 14 oz",
        "Lycra", "Spandex", "Poliéster", "Microfibra", "Franela",
        "Polar", "Fleece", "Rib 1x1", "Rib 2x2", "Interlock"
      ],
      "Hilo": [
        "Hilo Poliéster 40/2", "Hilo Poliéster 40/3", "Hilo Algodón 40/2",
        "Hilo Algodón 20/2", "Hilo Nylon", "Hilo Elástico", "Hilo Overlock",
        "Hilo Bordado Poliéster", "Hilo Bordado Rayón", "Hilo Metalizado"
      ],
      "Tinta": [
        "Tinta Serigrafía Base Agua", "Tinta Serigrafía Plastisol",
        "Tinta Sublimación", "Tinta Pigmento Textil", "Tinta Discharge",
        "Tinta Glitter", "Tinta Goma", "Tinta Transfer"
      ],
      "Aguja": [
        "Aguja Universal 80/12", "Aguja Universal 90/14", "Aguja Universal 100/16",
        "Aguja Jersey 70/10", "Aguja Jersey 80/12", "Aguja Stretch 75/11",
        "Aguja Denim 100/16", "Aguja Bordado 75/11", "Aguja Overlock"
      ],
      "Botón": [
        "Botón Plástico 2 Huecos", "Botón Plástico 4 Huecos", "Botón Metal",
        "Botón Madera", "Botón Nácar", "Botón Snap", "Botón Magnético"
      ],
      "Cierre": [
        "Cierre Metálico 15cm", "Cierre Metálico 20cm", "Cierre Plástico 15cm",
        "Cierre Plástico 20cm", "Cierre Invisible 20cm", "Cierre Separable"
      ],
      "Elástico": [
        "Elástico Plano 1cm", "Elástico Plano 2cm", "Elástico Redondo 3mm",
        "Elástico Redondo 5mm", "Elástico Boxer", "Elástico Breteles"
      ],
      "Etiqueta": [
        "Etiqueta Tela Blanca", "Etiqueta Tela Negra", "Etiqueta Satén",
        "Etiqueta Transfer", "Etiqueta Cuidado", "Etiqueta Talla"
      ],
      "Accesorio": [
        "Rivets Metálicos", "Ojales Metálicos", "Velcro 2cm", "Velcro 5cm",
        "Sesgo Algodón", "Sesgo Satén", "Cinta Bies", "Cordón"
      ],
      "Adhesivo": [
        "Entretela Fusible", "Adhesivo Termofusible", "Pegamento Textil",
        "Spray Adhesivo", "Cinta Doble Faz"
      ],
      "Químico": [
        "Suavizante Textil", "Fijador Color", "Blanqueador Textil",
        "Enzyme Wash", "Stone Wash", "Removedor Manchas"
      ]
    };

    const materiales = [];
    const totalPorCategoria = Math.ceil(100 / Object.keys(categoriasMateriales).length);

    for (const [categoria, nombres] of Object.entries(categoriasMateriales)) {
      let count = 0;

      // Generar materiales para cada categoría
      while (count < totalPorCategoria && materiales.length < 100) {
        const nombre = faker.helpers.arrayElement(nombres);

        // Generar precios realistas según la categoría con unidad de medida y cantidad base
        let precio, unidadMedida, cantidadBase;
        switch (categoria) {
          case "Tela":
            precio = faker.number.float({ min: 8.50, max: 45.00, fractionDigits: 2 }); // Por rollo/paquete
            unidadMedida = "metro";
            cantidadBase = faker.number.float({ min: 20, max: 100, fractionDigits: 1 }); // Rollo de 20-100 metros
            break;
          case "Hilo":
            precio = faker.number.float({ min: 2.50, max: 8.00, fractionDigits: 2 }); // Por cono
            unidadMedida = "metro";
            cantidadBase = faker.number.int({ min: 200, max: 1000 }); // Cono de 200-1000 metros
            break;
          case "Tinta":
            precio = faker.number.float({ min: 15.00, max: 85.00, fractionDigits: 2 }); // Por frasco/galón
            unidadMedida = "litro";
            cantidadBase = faker.helpers.arrayElement([0.25, 0.5, 1, 3.785]); // 250ml, 500ml, 1L, 1 galón
            break;
          case "Aguja":
            precio = faker.number.float({ min: 5.00, max: 25.00, fractionDigits: 2 }); // Por paquete
            unidadMedida = "unidad";
            cantidadBase = faker.helpers.arrayElement([10, 25, 50, 100]); // Paquete de agujas
            break;
          case "Botón":
            precio = faker.number.float({ min: 5.00, max: 50.00, fractionDigits: 2 }); // Por bolsa/caja
            unidadMedida = "unidad";
            cantidadBase = faker.helpers.arrayElement([50, 100, 144, 500]); // Caja de botones (144 = 1 gruesa)
            break;
          case "Cierre":
            precio = faker.number.float({ min: 12.00, max: 60.00, fractionDigits: 2 }); // Por paquete
            unidadMedida = "unidad";
            cantidadBase = faker.helpers.arrayElement([10, 25, 50, 100]); // Paquete de cierres
            break;
          case "Elástico":
            precio = faker.number.float({ min: 8.00, max: 35.00, fractionDigits: 2 }); // Por rollo
            unidadMedida = "metro";
            cantidadBase = faker.helpers.arrayElement([10, 25, 50, 100]); // Rollo de elástico
            break;
          case "Etiqueta":
            precio = faker.number.float({ min: 10.00, max: 80.00, fractionDigits: 2 }); // Por paquete
            unidadMedida = "unidad";
            cantidadBase = faker.helpers.arrayElement([100, 250, 500, 1000]); // Rollo de etiquetas
            break;
          case "Accesorio":
            precio = faker.number.float({ min: 5.00, max: 60.00, fractionDigits: 2 }); // Por paquete/rollo
            unidadMedida = faker.helpers.arrayElement(["unidad", "metro"]); // Depende del accesorio
            cantidadBase = unidadMedida === "metro"
              ? faker.helpers.arrayElement([10, 25, 50])
              : faker.helpers.arrayElement([50, 100, 200]);
            break;
          case "Adhesivo":
            precio = faker.number.float({ min: 8.00, max: 45.00, fractionDigits: 2 }); // Por rollo/frasco
            unidadMedida = faker.helpers.arrayElement(["metro", "litro"]); // Entretela en metros, pegamento en litros
            cantidadBase = unidadMedida === "metro"
              ? faker.helpers.arrayElement([25, 50, 100])
              : faker.helpers.arrayElement([0.25, 0.5, 1]);
            break;
          case "Químico":
            precio = faker.number.float({ min: 15.00, max: 80.00, fractionDigits: 2 }); // Por galón/bidón
            unidadMedida = "litro";
            cantidadBase = faker.helpers.arrayElement([1, 3.785, 5, 20]); // 1L, 1 galón, 5L, 20L
            break;
          default:
            precio = faker.number.float({ min: 5.00, max: 50.00, fractionDigits: 2 });
            unidadMedida = "unidad";
            cantidadBase = 1;
        }

        materiales.push([
          nombre,
          categoria,
          precio,
          unidadMedida,
          cantidadBase
        ]);

        count++;
      }
    }

    await connection.query(
      `INSERT INTO material (nombre, categoria, precio, unidad_medida, cantidad_base) VALUES ?`,
      [materiales]
    );

    console.log(`✅ ${materiales.length} materiales insertados!`);

    // Mostrar distribución por categoría
    const distribucion = {};
    materiales.forEach(([, categoria]) => {
      distribucion[categoria] = (distribucion[categoria] || 0) + 1;
    });

    console.log("📋 Distribución por categoría:");
    Object.entries(distribucion).forEach(([cat, count]) => {
      console.log(`   • ${cat}: ${count} materiales`);
    });

    // Mostrar ejemplos de cálculo de precio unitario
    console.log("\n💡 Ejemplos de cálculo de precio unitario:");
    const ejemplos = materiales.slice(0, 3);
    ejemplos.forEach(([nombre, categoria, precio, unidad, cantBase]) => {
      const precioUnitario = (precio / cantBase).toFixed(4);
      console.log(`   • ${nombre}: S/ ${precio} por ${cantBase} ${unidad}(s) = S/ ${precioUnitario} por ${unidad}`);
    });

  } catch (error) {
    console.error("❌ Error seeding materiales:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Permite ejecutar: pnpm tsx src/entities/materials.seed.ts
if (require.main === module) {
  seedMaterials()
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}