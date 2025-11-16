import crypto from "crypto";

export function calcularHash(fila){
    const columnasFormateadas = Object.keys(fila)
    .sort()
    .reduce((acumulador,clave)=>{
        acumulador[clave] = fila[clave];
        return acumulador;
    },{});
    const texto = JSON.stringify(columnasFormateadas);
    return crypto.createHash("sha256").update(texto).digest("hex");
}