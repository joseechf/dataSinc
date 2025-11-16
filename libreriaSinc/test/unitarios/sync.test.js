
//este test no funciona, por alguna razon selectalldb y consultas no se mockean y se llama la funcion original

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


describe("sync",()=>{
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

    it("probar condicionales",async()=>{

    //mockear la funcion para evitar que sync haga mas de lo que estoy testeando
    consultas.mockImplementation(()=>{});
    //obtener registros falsos de bd
    SelectAllDB.mockResolvedValue([
        [   
            { id: 1, hash: "local1", version: 1, isdelete:0,isupdate: 1 },
            { id: 2, hash: "local2", version: 2, isdelete:0,isupdate: 0 }
        ],
        [
            { id: 4, hash: "remote1", version: 2, isdelete: 0, isupdate: 1 },
            { id: 3, hash: "remote3", version: 1, isdelete: 0, isupdate: 1 }
        ]
    ]);

        await sync(tabla,columnas,camposIgnorados);
        //verificar los vectores
        expect(idsinserttolocal).toEqual([4,3]);
        expect(idsinserttoremoto).toEqual([1,2]);
    });

    it.only("probar condicional insert de consultas",async ()=>{
        global.fetch = vi.fn(()=>Promise.resolve({
            ok: true,
            json: ()=> Promise.resolve(
                [{ id: 3, nombre: "testear", descripcion: "probar insertar una fila", estado:"en proceso"},
                { id: 4, nombre: "volvertest", descripcion: "insertar segunda fila", estado:"en proceso"}]
            )
        }));
        idsinserttolocal.push(3);
        idsinserttolocal.push(4);
        const res = await consultas(tabla,columnas,camposIgnorados);
        expect(res.status).toEqual("Inserción local completada en la tabla listatareas");
    });

    it("probar condicional update de consultas",async ()=>{
        global.fetch = vi.fn(()=>Promise.resolve({
            ok: true,
            json: ()=> Promise.resolve(
                [{ id: 3, nombre: "update", descripcion: "probar update una fila", estado:"pendiente"}]
            )
        }));
        idsupdatetolocal.push(3);
        const res = await consultas(tabla,columnas,camposIgnorados);
        expect(res.message).toEqual("Actualización local completada");
    });

    it("probar condicional softdelete de consultas",async ()=>{
        global.fetch = vi.fn(()=>Promise.resolve({
            ok: true,
            json: ()=> Promise.resolve(
                [4]
            )
        }));
        idsdeletetolocal.push(4);
        const res = await consultas(tabla,columnas,camposIgnorados);
        expect(res.message).toEqual("Eliminación local completada");
    });
});

