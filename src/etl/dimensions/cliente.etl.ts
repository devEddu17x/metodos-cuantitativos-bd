import { pool } from "../../config";
import { starSchemaPool } from "../../star-schema.config";
import { RowDataPacket } from "mysql2/promise";

interface ClientePacket extends RowDataPacket {
    id: number;
    telefono: string;
    referido: string | null;
    fecha_primer_compra: Date | null;
    // Cliente natural
    dni?: string;
    nombre?: string;
    apellido?: string;
    // Cliente jurídico
    ruc?: string;
    razon_social?: string;
    nombre_comercial?: string;
    delegado?: string;
}

export async function loadDimensionCliente() {
    const oltp = await pool.getConnection();
    const olap = await starSchemaPool.getConnection();
    console.log("👥 Cargando dimensión d_cliente...");

    try {
        // JOIN para obtener todos los campos
        // Determinamos el tipo por la presencia de DNI o RUC
        const [clientes] = await oltp.query<ClientePacket[]>(
            `SELECT 
        c.id,
        c.telefono,
        c.referido,
        c.fecha_primer_compra,
        cn.dni,
        cn.nombre,
        cn.apellido,
        cj.ruc,
        cj.razon_social,
        cj.delegado
       FROM cliente c
       LEFT JOIN cliente_natural cn ON c.id = cn.cliente_id
       LEFT JOIN cliente_juridico cj ON c.id = cj.cliente_id`
        );

        if (clientes.length === 0) {
            console.log("   ⚠️ No hay clientes para cargar");
            return;
        }

        const records = clientes.map(cli => {
            const tipoCliente = cli.dni ? "NATURAL" : "JURIDICO";

            const nombreCompleto = tipoCliente === "NATURAL"
                ? `${cli.nombre} ${cli.apellido}`
                : cli.razon_social || "";

            const documentoIdentidad = tipoCliente === "NATURAL"
                ? cli.dni || ""
                : cli.ruc || "";

            return [
                cli.id,
                nombreCompleto,
                tipoCliente,
                documentoIdentidad,
                cli.telefono,
                cli.referido,
                cli.fecha_primer_compra
            ];
        }); await olap.query(
            `INSERT INTO d_cliente 
       (cliente_id, nombre_completo_cliente, tipo_cliente, documento_identidad, 
        telefono, referido_por, fecha_primer_compra)
       VALUES ?`,
            [records]
        );

        console.log(`   ✅ ${records.length} clientes insertados`);
    } catch (error) {
        console.error("   ❌ Error cargando d_cliente:", error);
        throw error;
    } finally {
        oltp.release();
        olap.release();
    }
}
