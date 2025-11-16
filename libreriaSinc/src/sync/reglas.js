
export function resolucionversionigual(id,item,maplocal){
    //de momento la regla es: siempre gana remoto cuando las versiones son iguales para preservar integridad 
    if(item.version == maplocal.get(id).version){
        return "remoto";
    }
}