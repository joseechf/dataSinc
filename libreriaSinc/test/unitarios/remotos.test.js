


import { describe, it, expect, vi, beforeEach } from "vitest";
/*vi.mock("../../src/index.js",()=>({
    SelectAllDB: vi.fn(),
    consultas: vi.fn()
}));*/
import {sync,idsinserttolocal,idsupdatetolocal,idsdeletetolocal,idsinserttoremoto,idsupdatetoremoto,idsdeletetoremoto,idsdescartados_local, consultas} from "../../src/index.js";
/*
vi.mock("../../src/adapets/sqliteadapter.js",()=>({
    getById: vi.fn().mockReturnValue({status:200,data:[{ "id": 4, "nombre": "volvertest", "descripcion": "insertar segunda fila", "estado":"terminado"}]}),
}));*/

describe("funciones remotas",()=>{
    //datos falsos 
    const tabla = {sinc:"tablaSinc",principal:"listatareas",descartes:"tablaDescartes",lastsinc:"lastsinc"};
    const columnas = {principal: ["id","nombre","descripcion","estado"],descartes: ["id","data","fecha_descarte"],sinc:["id","isnew","isupdate","isdelete","hash","version","device","lastupd"],lastsinc:["id","fecha_sincronizacion","registroslocalesprocesados","registrosremotosprocesados"]};
    const camposIgnorados = {principal: ["id"],descartes: [],sinc:["id"],lastsinc: ["id"]}; //se usa en update o delete

    //inicializar los vectores a probar
    beforeEach(() => {
        idsinserttolocal.length = 0;
        idsupdatetolocal.length = 0;
        idsdeletetolocal.length = 0;
        idsinserttoremoto.length = 0;
        idsupdatetoremoto.length = 0;
        idsdeletetoremoto.length = 0;
        idsdescartados_local.length = 0;
    });

    it("probar condicional insert de consultas",async()=>{
        idsinserttoremoto.push(3);
        idsinserttoremoto.push(4);
        const res = await consultas(tabla,columnas,camposIgnorados);
         expect(res.message).toEqual("insercion remota correcta");
    });

    it("probar condicional update de consultas",async ()=>{
        
        idsupdatetoremoto.push(4);
        const res = await consultas(tabla,columnas,camposIgnorados);
        console.log(res);
        expect(res.message).toEqual("Actualización remota completada");
    });
});