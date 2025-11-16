
import { getAll, getById,insert,update,softdelete, insertUnTabla } from "./adapets/sqliteadapter.js";
import { resolucionversionigual } from "./sync/reglas.js";
import { calcularHash } from "./utilidades/calcularHash.js";

const idsinserttolocal = []; //trae id de remoto 
const idsupdatetolocal = []; //trae id de remoto 
const idsdeletetolocal = []; //trae id de remoto 
const idsinserttoremoto = []; //trae id de local 
const idsupdatetoremoto = []; //trae id de local 
const idsdeletetoremoto = []; //trae id de local 
const idsdescartados_local = []; //trae id de local 

async function SelectAllDB(tabla, listaidlocal,listaidremoto) { 
  try {
    const [reslocal, resremo] = await Promise.all([
      // Base local: obtiene todas o por id
      (!listaidlocal) ? getAll(tabla) : getById(tabla, listaidlocal),

      // Base remota: obtiene todas o por id
      fetch(
        !listaidremoto
          ? `http://localhost:3001/getAll?tabla=${tabla}`
          : `http://localhost:3001/getById?tabla=${tabla}&id=${listaidremoto}`
      ).then(async (res) => {
        if(!res.ok){
            throw res;
        }
        return res.json();
      })
    ]);
    return [reslocal.data, resremo];
  } catch (error) {
    console.log(error);
    error.paso = 'SelectAllDB';
    throw error;
  }

}

export async function sync(tabla, columnas,camposIgnorados){
    let hasheslocal = [];
    let hashesremoto = [];
    try {
        [hasheslocal,hashesremoto] = await SelectAllDB(tabla.sinc,null,null);
    } catch (error) {
        /*throw {
            status: error.status || 500,
            message: error.message || `Error al obtener datos de ${tabla}`,
            context: 'sincronizacion',
            error: error
        }; */  
        error.paso = 'sincronizacion';
        throw error;
    }
    const maphashesremoto = new Map(hashesremoto.map(elemento => [elemento.id,elemento]));
    const maphasheslocal = new Map(hasheslocal.map(elemento => [elemento.id,elemento]));

    for(let [id_remoto,elemento] of maphashesremoto){
        if(maphasheslocal.get(id_remoto)){
            if(elemento.hash != maphasheslocal.get(id_remoto).hash){
                if (elemento.version > maphasheslocal.get(id_remoto).version){
                    idsdescartados_local.push(id_remoto);
                    if (elemento.isupdate === 1){
                        idsupdatetolocal.push(id_remoto);
                    }else if(elemento.isdelete === 1){
                        idsdeletetolocal.push(id_remoto);
                    }
                }else if(maphasheslocal.get(id_remoto).version > elemento.version){
                    if (maphasheslocal.get(id_remoto).isupdate === 1){ //revisar porq isupdate es integer 1 o 0
                        idsupdatetoremoto.push(id_remoto);
                    }else if(maphasheslocal.get(id_remoto).isdelete === 1){ //revisar porq idelete es integer 1 o 0
                        idsdeletetoremoto.push(id_remoto);
                    }
                }else{
                    // versiones iguales, Gana remoto
                    const ganador = resolucionversionigual(id_remoto,elemento,maphasheslocal);
                    if(ganador === "remoto"){
                        idsdescartados_local.push(id_remoto);
                        if (elemento.isupdate === 1){
                            idsupdatetolocal.push(id_remoto);
                        }else if (elemento.isdelete === 1){
                            idsdeletetolocal.push(id_remoto);
                        }
                    }else if(ganador === "local"){
                        //de momento nunca gana local
                    }
                }
            }
        }else{
            if(elemento.isdelete === 0){
                idsinserttolocal.push(id_remoto);
            }
        }
    }
    for (let [id_local] of maphasheslocal){
        if (!maphashesremoto.get(id_local)){
            if (maphasheslocal.get(id_local).isdelete === 0){ //aqui tengo que verificar porque isdelete es un integuer con 1 o 0
                idsinserttoremoto.push(id_local);
            }
        }
    }
    try {
        //consultas en orden
        await consultas(tabla,columnas,camposIgnorados);
    } catch (error) {
        throw error;
    }
    return {status:200,message:"sincronizacion completada"};
}

export async function consultas(tabla,columnas,camposIgnorados){
    const driver = "dispositivo";

    if(idsdescartados_local.length > 0){
        const filasdescartados = getById(tabla.principal,idsdescartados_local);
        const insertfilasdescartados = filasdescartados.data.map(fila => JSON.stringify(fila)); //en descartes cada fila va a tener en json la fila que se descartó, para registro y posibles auditorias
        try {
            const result = insertUnTabla(tabla.descartes,columnas.descartes,insertfilasdescartados);
            console.log("insercion descartes completa");
        } catch (error) {
            throw error;
        }
    }

    if(idsdeletetolocal.length > 0){
        const fecha = new Date().toISOString();
        let miset = null;
        try {
            const filassoftdelete = getById(tabla.sinc,idsdeletetolocal);        
            if(filassoftdelete.status !== 200) throw error;
            miset = filassoftdelete.data.map((fila) => { 
                const dispositivo = driver? driver : fila.device;
                return {isnew:0,isdelete:1,version:fila.version+1,device:dispositivo,lastupd:fecha}
            });
        } catch (error) {
            throw error;
        }
        
        try {
            const res = softdelete(tabla.sinc,miset,idsdeletetolocal);
            console.log("softdelete local completa");
        //    return res;
        } catch (error) {
            throw error;
        }
       
    }

    if(idsinserttoremoto.length > 0){
        const insertfilasremoto = getById(tabla.principal,idsinserttoremoto);
        const fecha = new Date().toISOString();
        const newinsremotosinc = insertfilasremoto.data.map(fila =>({
            id: fila.id,
            isnew: 1,
            isupdate: 0,
            isdelete: 0,
            hash: calcularHash(fila),
            version: 1,
            device: driver,
            lastupd: fecha
        }));
        try {
            const result = await fetch(`http://localhost:3001/insert`,{
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    tablaP:tabla.principal,
                    tablaS:tabla.sinc,
                    columnaP: columnas.principal,
                    columnaS: columnas.sinc,
                    filas: insertfilasremoto.data,
                    filasSinc: newinsremotosinc //el Map se hace en el API porque fetch no permite enviar Map
                })
            });
            if(result.status === 500){ throw result; }
            console.log("insercion remoto completa");
            //return {status: result.status,message:"insercion remota correcta"};
        } catch (error) {
            error.context = "insert";
            error.status = 500;
            error.message = `Error al insertar datos en la tabla remota`;
            throw error;
        }
    }

    if(idsinserttolocal.length > 0){
        let insertfilasremoto = null;
        try {
            insertfilasremoto = await fetch(`http://localhost:3001/getById?tabla=${tabla.principal}&id=${idsinserttolocal}`)
                .then(async (res) => {
                if(!res.ok){
                    throw res;
                }
                return res.json();
            })
        } catch (error) {
            throw error;
        }
        const fecha = new Date().toISOString();
        const newinslocalsinc = insertfilasremoto.map(fila => ({
            id: parseInt(fila.id),
            isnew: 1,
            isupdate: 0,
            isdelete: 0,
            hash: calcularHash(fila),
            version: 1,
            device: driver,
            lastupd: fecha
        }));
        const mapfilassinc = new Map(newinslocalsinc.map(fila => [fila.id,fila]));
        try {
            const res = insert(tabla.principal,tabla.sinc,columnas.principal,columnas.sinc,insertfilasremoto,mapfilassinc);
            console.log("insercion local completa");
            //return res; //para test
        } catch (error) {
            throw error;
        }
    }

    if(idsupdatetoremoto.length > 0){
        const fecha = new Date().toISOString();
        const columnasFiltradasP = columnas.principal.filter(x => !camposIgnorados.principal.includes(x));
        const columnasFiltradasS = columnas.sinc.filter(x => !camposIgnorados.sinc.includes(x));
        const updatefilasremoto = getById(tabla.principal,idsupdatetoremoto);
        try {
            if(updatefilasremoto.status !== 200){throw new Error("Error al obtener los locales para actualizar")};
            const newupremotosinc = updatefilasremoto.data.map((fila) => ({
                isnew: 0,
                isupdate: 1,
                isdelete: 0,
                hash: calcularHash(fila),
                version: fila.version? fila.version+1 : 1,
                device: driver,
                lastupd: fecha
            }));
            const result = await fetch(`http://localhost:3001/update`,{
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    tablaP:tabla.principal,
                    tablaS:tabla.sinc,
                    columnaP: columnasFiltradasP,
                    columnaS: columnasFiltradasS,
                    filas: updatefilasremoto.data,
                    filasSinc: newupremotosinc //el Map se hace en el API porque fetch no permite enviar Map
                })
            });
            if(result.status === 500){ throw result; }
            //if(result.ok) {return result;} //para test
            console.log("update remoto completa");
        } catch (error) {
            error.message = `Error al actualizar datos en la tabla remota`;
            throw error;
        }
    }

    if(idsupdatetolocal.length > 0){
        let updatefilasremoto = null;
        try {
            updatefilasremoto = await fetch(`http://localhost:3001/getById?tabla=${tabla.principal}&id=${idsupdatetolocal}`)
                .then(async (res) => {
                if(!res.ok){
                    throw res;
                }
                return res.json();
            })
        } catch (error) {
            throw error;
        }
        try {
            const fecha = new Date().toISOString();
            const columnasFiltradasP = columnas.principal.filter(x => !camposIgnorados.principal.includes(x));
            const columnasFiltradasS = columnas.sinc.filter(x => !camposIgnorados.sinc.includes(x));
            const newuplocalsinc = updatefilasremoto.map((fila) => ({
                id: fila.id,
                isnew: 0,
                isupdate: 1,
                isdelete: 0,
                hash: calcularHash(fila),
                version: fila.version+1,
                device: driver,
                lastupd: fecha
            }));
            const mapuplocalsinc = new Map(newuplocalsinc.map(item => [item.id,[item.isnew,item.isupdate,item.isdelete,item.hash,item.version,item.driver,item.lastupd]]));
            const res = update(tabla.principal,tabla.sinc,columnasFiltradasP,columnasFiltradasS,updatefilasremoto,mapuplocalsinc);
            //return res; //para test
            console.log("update local completa");
        } catch (error) {
            throw error;
        }
    }
        // cambiar datos de sincronizacion
    try {
        const fecha_sincronizacion = new Date().toISOString();
        //preparar JSON de id para registrar lo hecho
        const registroslocalesprocesados = "insert: "+idsinserttolocal.join(",")+", update: "+idsupdatetolocal.join(",")+", delete: "+idsdeletetolocal.join(",")+", descartes: "+idsdescartados_local.join(",");
        const registrosremotosprocesados = "insert: "+idsinserttoremoto.join(",")+", update: "+idsupdatetoremoto.join(",")+", delete: "+idsdeletetoremoto.join(",");
        const result = insertUnTabla(tabla.lastsinc,columnas.lastsinc,[{"fecha_sincronizacion":fecha_sincronizacion,"registroslocalesprocesados":registroslocalesprocesados,"registrosremotosprocesados":registrosremotosprocesados}]);
        //return result; //para test
        console.log("insert last update completa");
    } catch (error) {
        throw {
            status: error.status || 500,
            message: error.message || `Error al registrar la sincronizacion`,
            context: 'registrando sincronizacion',
            error: error
        }; 
    }
    console.log("los id fueron:");
    console.log("insert: ",idsinserttolocal,", update: ",idsupdatetolocal,", delete: ",idsdeletetolocal,", descartes: ",idsdescartados_local,"insert: ",idsinserttoremoto,", update: ",idsupdatetoremoto,", delete: ",idsdeletetoremoto);
    return {status:200,message:"sincronizacion completa"} //para test
}

export { //para test
    idsinserttolocal,
    idsupdatetolocal,
    idsdeletetolocal,
    idsinserttoremoto,
    idsupdatetoremoto,
    idsdeletetoremoto,
    idsdescartados_local
}

