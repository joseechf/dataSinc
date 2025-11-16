import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "../../src/adapets/sqliteadapter.js";
import { expect } from "vitest";


describe("inicializar",()=>{
    it("debe crear la base de datos y las tablas en la carpeta datosLocales el archivo database.local",()=>{
        const respuesta = db.inicializarlocal();
        expect(respuesta.status).toEqual(200);
        expect(respuesta.data).toBeTypeOf("object");
    });
});

describe("crud",()=>{
    const filas = [
        { id: 1, nombre: "testear", descripcion: "probar insertar una fila", estado:"en proceso"},
        { id: 2, nombre: "volvertest", descripcion: "insertar segunda fila", estado:"en proceso"}
    ];
    it("insertar",()=>{
        const respuesta = db.insert("listatareas",["id","nombre","descripcion","estado"],filas);
        expect(respuesta.status).toEqual(200);
        expect(respuesta.message).toEqual("Inserción local completada en la tabla listatareas");
    });
    const cambios = [
        {id:1,descripcion: "actualizando una fila",estado:"terminado"},
    ]
    it("update",()=>{
        const respuesta = db.update("listatareas",["descripcion","estado"],cambios);
        expect(respuesta.status).toEqual(200);
        expect(respuesta.message).toEqual("Actualización local completada");
    });

});