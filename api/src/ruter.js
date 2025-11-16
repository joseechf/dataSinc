import { Router } from "express";
import inicializar from "./inicializar.js";

const ruter = Router();

ruter.get("/getAll",async (req,res)=>{
    const tabla = req.query.tabla || "listatareas";
    let conect = null;
    try {
        const client = await inicializar();
        conect = client.data;
        const { rows } = await conect.query(`SELECT * FROM ${tabla}`);
        res.status(200).json(rows);
    } catch (error) {
        console.error(`Error al obtener datos de ${tabla}:`, error);
        return res.status(error.status || 500).json({
            message:error.message ||  `Error al obtener datos de ${tabla} remota`,
            context:'getAllR',
            error
        });
    }finally {
        if (conect) conect.release();
    }

});

ruter.get("/getById",async (req,res)=>{
    const tabla = req.query.tabla;
    let listaids = req.query.id;
    let conect = null;
    if(typeof listaids === "string"){
        listaids = listaids.split(",").map(x => parseInt(x.trim(),10)).filter(num => !isNaN(num)); //"1,2,3" a 1,2,3
    }
    try {
        const client = await inicializar();
        conect = client.data 
        const { rows } = await conect.query(`SELECT * FROM ${tabla} WHERE id = ANY($1::INT[])`,[listaids]);
        res.status(200).json(rows);
    } catch (error) {
        console.error(`Error al obtener datos de ${tabla}:`, error);
        return res.status(error.status || 500).json({
            message:error.message ||  `Error al obtener datos de ${tabla} remota`,
            context:'getByIdR',
            error
        });
    }finally {
        if (conect) conect.release();
    }
});

ruter.put("/insert",async (req,res)=>{
    const {tablaP,tablaS,columnaP,columnaS,filas,filasSinc} = req.body;
    const mapfilassinc = new Map(filasSinc.map(fila => [fila.id,fila]));
    let resultado = [];
    let conect = null;
    const placeholdersP = columnaP.map((_,i)=>`$${i+1}`).join(",");
    const placeholdersS = columnaS.map((_,i) =>`$${i+1}`).join(",");
    const principal = `INSERT INTO ${tablaP} (${columnaP.join(",")}) VALUES (${placeholdersP}) RETURNING *`;
    const metadata = `INSERT INTO ${tablaS} (${columnaS.join(",")}) VALUES (${placeholdersS}) RETURNING *`;
    try{
        const client = await inicializar();
        if(client.status !== 200){throw new Error("problemas inicializando Base de Datos remota")};
        conect = client.data;
        await conect.query("BEGIN");
        for(let fila of filas){
            const result = await conect.query(principal, Object.values(fila));
            resultado.push(result.rows[0]);
            await conect.query(metadata,Object.values(mapfilassinc.get(fila.id)));
        }
        await conect.query("COMMIT");
        res.status(200).json({ data: resultado, message: "Inserción remota completada" });
    } catch (error) {
        await conect.query("ROLLBACK");
        console.error(`Error al insertar datos en ${tablaP}:`, error);
        error.context = "insert";
        error.status = 500;
        return error;
        //throw error;
    }finally {
        if (conect) conect.release();
    }
});

ruter.put("/update",async(req,res)=>{
    const {tablaP,tablaS,columnaP,columnaS,filas,filasSinc} = req.body;
    const mapupremotosinc = new Map(filasSinc.map((item,index) => [filas[index].id,Object.values(item)]));
    let conect = null;
    const placeholdersP = columnaP.map((clave,index) => `${clave} = $${index+1}`).join(",");
    const placeholdersS = columnaS.map((clave,index) => `${clave} = $${index+1}`).join(",");
    const principal = `UPDATE ${tablaP} SET ${placeholdersP} WHERE id = $${columnaP.length+1}`;
    const metadata = `UPDATE ${tablaS} SET ${placeholdersS} WHERE id = $${columnaS.length+1}`;
    console.log("principal: ",principal);
    console.log("metadata: ",metadata);
    try{
        const client = await inicializar();
        if(client.status !== 200){throw new Error("problemas inicializando Base de Datos remota")};
        conect = client.data
        await conect.query("BEGIN");
        for(let fila of filas){
            const actualizarValores = columnaP.map(clave => fila[clave]);
            let vector = [...actualizarValores,fila.id]; 
            //const result = await conect.query(principal,...vector);
            console.log(principal," valores: ",vector);
            await conect.query(principal,vector);
            vector = [];
            //resultado.push(result.rows[0]);
            vector = [...mapupremotosinc.get(fila.id),fila.id];
            console.log(metadata," valores: ",vector);
            await conect.query(metadata,vector);
        }
        await conect.query("COMMIT");
        res.status(200).json({ message: "Actualización remota completada" });
    } catch (error) {
        await conect.query("ROLLBACK");
        console.error(`Error al actualizar datos en ${tablaP}:`, error);
        error.context = "update";
        throw error;
    }finally {
        if (conect) conect.release();
    }
});

export default ruter;