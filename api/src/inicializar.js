import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
let pool = null;

export default async function inicializar(){
    if(!pool){
        pool = new pg.Pool({
            host:process.env.HOST,
            port:process.env.POSTGRES_PORT,
            database: process.env.POSTGRES_DB,
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
        });
        try {
            await pool.query(`
            CREATE TABLE IF NOT EXISTS listatareas (
                id INTEGER PRIMARY KEY,  
                nombre VARCHAR(30),
                descripcion TEXT,
                estado VARCHAR(20) CHECK (estado IN ('en proceso', 'pendiente', 'terminado')) DEFAULT 'pendiente'
            );
            `);

            await pool.query(`
            CREATE TABLE IF NOT EXISTS tablaSinc (
                id INTEGER REFERENCES listatareas(id) ON DELETE CASCADE,
                isnew INTEGER DEFAULT 0,
                isupdate INTEGER DEFAULT 0,
                isdelete INTEGER DEFAULT 0,
                hash VARCHAR(64),
                version INTEGER DEFAULT 1,
                device VARCHAR(100),
                lastupd TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            `);
            const client = await pool.connect();
            return {status:200,data:client};
        } catch (error) {
            console.error("Error al crear las tablas:", error);
            error.context = 'inicializarlocal';
            error.status = 500;
            error.message = `Error en la inicializacion de las tablas remotas: ${error.message}`;
            throw error; // Lanza el MISMO error con información adicional
        }
    }else{
        const client = await pool.connect();
        return {status:200,data:client};
    }
}