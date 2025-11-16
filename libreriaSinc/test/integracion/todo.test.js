import { describe, it, expect, vi, beforeEach } from "vitest";
import { sync,consultas } from "../../src";


describe("prueba general del ssitema",()=>{
    //datos falsos 
    const tabla = {sinc:"tablaSinc",principal:"listatareas",descartes:"tablaDescartes",lastsinc:"lastsinc"};
    const columnas = {principal: ["id","nombre","descripcion","estado"],descartes: ["data"],sinc:["id","isnew","isupdate","isdelete","hash","version","device","lastupd"],lastsinc:["id","fecha_sincronizacion","registroslocalesprocesados","registrosremotosprocesados"]};
    const camposIgnorados = {principal: ["id"],descartes: [],sinc:["id"],lastsinc: ["id"]}; //se usa en update o delete

    it("debería actualizarse el estado local",async ()=>{
        const res = await sync(tabla,columnas,camposIgnorados);
        expect(res.message).toEqual("sincronizacion completada");
        expect(consultas).toHaveBeenCalled(1);
    },20000);
});