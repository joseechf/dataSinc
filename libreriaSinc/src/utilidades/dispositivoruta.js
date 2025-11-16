import {fileURLToPath} from "url";
import path from "path";
import fs from "fs";

export function obtenerDispositivo() {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return "web";
  }

  if (typeof process !== "undefined" && process.versions?.node) {
    return "node";
  }

  if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
    return "movil";
  }

  if (typeof Capacitor !== "undefined" && Capacitor.isNativePlatform?.()) {
    return "movil";
  }
  return "desconocido";
}

export function obtenerRuta(nombreArchivo = "database.local"){
    const dispositivo = obtenerDispositivo();
    let rutaBase = null;
    if(dispositivo === "node"){
        const rutaAbsoluta = fileURLToPath(import.meta.url);
        const sinArchivo = path.dirname(rutaAbsoluta);
        rutaBase = path.join(sinArchivo,"datosLocales");
        if(!fs.existsSync(rutaBase)){
            fs.mkdirSync(rutaBase,{recursive: true});
        }
    }
    if (dispositivo === "desconocido") {
        console.warn("No se pudo determinar el entorno. Ruta desconocida.");
        return null;
    }
    return rutaBase ? path.join(rutaBase,nombreArchivo) : null;
}









