// ✅ Importar better-sqlite3 (API sincrónica y rápida)
import Database from "better-sqlite3";
import {obtenerRuta} from "../utilidades/dispositivoruta.js";
let local = null;

// ✅ Inicializa la base local solo una vez
export function inicializarlocal() {
  if (!local) {
    try {
      const ruta = obtenerRuta("database.local");
      if(!ruta || ruta === "desconocido"){throw new Error("problema al obtener la ruta para la base de datos local");}
      local = new Database(ruta);
    } catch (error) {
      error.context = 'inicializarlocal';
      throw { status:500,error};
    }

    try {
      local.exec(`
        CREATE TABLE IF NOT EXISTS listatareas (
          id INTEGER PRIMARY KEY,
          nombre TEXT,
          descripcion TEXT,
          estado VARCHAR(20) CHECK (estado IN ('en proceso','pendiente','terminado'))
        );

        CREATE TABLE IF NOT EXISTS tablaSinc (
          id INTEGER PRIMARY KEY,
          isnew INTEGER DEFAULT 0,
          isupdate INTEGER DEFAULT 0,
          isdelete INTEGER DEFAULT 0,
          hash VARCHAR(64),
          version INTEGER DEFAULT 1,
          device VARCHAR(100),
          lastupd TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (id) REFERENCES listatareas(id)
        );

        CREATE TABLE IF NOT EXISTS tablaDescartes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          data TEXT,
          fecha_descarte TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS lastsinc (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fecha_sincronizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          registroslocalesprocesados TEXT,
          registrosremotosprocesados TEXT
        );
      `);

      return { status: 200, data: local };
    } catch (error) {
      console.error("Error al crear las tablas:", error);
      error.context = 'inicializarlocal';
      throw {status: 500,message: `Error en la inicializacion de las tablas locales`,error};
    }
  } else {
    return { status: 200, data: local };
  }
}

// ✅ Obtener todas las filas de una tabla
export function getAll(tabla) {
  try {
    const conect = inicializarlocal();
    if (conect.status === 200) {
      const local = conect.data;
      const rows = local.prepare(`SELECT * FROM ${tabla}`).all();
      return { status: 200, data: rows };
    }
  } catch (error) {
    console.error(`Error al obtener datos de ${tabla}:`, error);
    throw {
        status: error.status || 500,
        message: error.message || `Error al obtener datos de ${tabla} local`,
        context: 'getAll',
        error
    };
  }
}

// ✅ Obtener filas por ID
export function getById(tabla, listaid) {
  try {
    const conect = inicializarlocal();
    if (conect.status === 200) {
      const local = conect.data;
      const placeholders = listaid.map(() => "?").join(",");

      const stmt = local.prepare(`SELECT * FROM ${tabla} WHERE id IN (${placeholders})`);
      const rows = stmt.all(...listaid);
      return { status: 200, data: rows };
    }
  } catch (error) {
    console.error(`Error al obtener filas por ID en ${tabla}:`, error);
    throw {
      status: error.status || 500,
      message: error.message || `Error al obtener filas por ID en ${tabla} local`,
      context: 'getById',
      error: error
    };   
  }
}

// ✅ Insertar varias filas (transacción atómica)
export function insert(tablaP,tablaS, columnasP, columnasS, filas,mapfilassinc) {
  if(columnasP.length === 0 || columnasS.length === 0){throw new Error("columnas vacias");}
  if(filas.length === 0 || mapfilassinc.length === 0){throw new Error("filas vacias");}
  let conect = null;
  try {
    conect = inicializarlocal();
  } catch (error) {
    throw error;
  }
  const local = conect.data;
  const placeholders = columnasP.map(() => "?").join(",");
  const placeholdersS = columnasS.map(() => "?").join(",");
  const query = local.prepare(`INSERT INTO ${tablaP} (${columnasP.join(",")}) VALUES (${placeholders})`);
  const queryS = local.prepare(`INSERT INTO ${tablaS} (${columnasS.join(",")}) VALUES (${placeholdersS})`);
  const transaccion = local.transaction((filas,mapfilassinc) => {
    for (const row of filas) {
      const valoresOrdenados = columnasP.map(elem => row[elem]);
      query.run(...valoresOrdenados);
      const valoresOrdenadosS = Object.values(mapfilassinc.get(row.id));
      queryS.run(...valoresOrdenadosS);
    }
  });

  try {
    transaccion(filas,mapfilassinc);
    return { status: 200, message: `Inserción local completada en la tabla ${tablaP}` };
  } catch (error) {
    console.error(`Error al insertar en ${tablaP}:`, error);
    throw {
      status: error.status || 500,
      message: error.message || `Error al insertar en ${tablaP} local`,
      context: 'insert',
      error: error
    };
  }
}

export function insertUnTabla(tabla,columnas,fila) {
  let conect = null;
  try {
    conect = inicializarlocal();
  } catch (error) {
    throw error;
  }
  const local = conect.data;
  const placeholders = columnas.map(() => "?").join(",");
  const query = local.prepare(`INSERT INTO ${tabla} (${columnas.join(",")}) VALUES (${placeholders})`);
  const transaccion = local.transaction((filas) => {
    for (const row of filas) {
      const valoresOrdenados = columnas.map(elem => row[elem]);
      query.run(...valoresOrdenados);
    }
  });

  try {
    transaccion(fila);
    return { status: 200, message: `Inserción local completada en la tabla ${tabla}` };
  } catch (error) {
    console.error(`Error al insertar en ${tabla}:`, error);
    throw {
      status: error.status || 500,
      message: error.message || `Error al insertar en ${tabla} local`,
      context: 'insert',
      error: error
    };
  }
}

// ✅ Actualizar varias filas (transacción atómica)
export function update(tablaP,tablaS,columnasP,columnasS,filas,mapuplocalsinc) {
  if(columnasP.length === 0 || columnasS.length === 0){throw new Error("columnas vacias");}
  if(filas.length === 0 || mapuplocalsinc.length === 0){throw new Error("filas vacias");}
  let conect = null;
  try {
    conect = inicializarlocal();
  } catch (error) {
    throw error;
  }

  const local = conect.data;
  const columnasFormateadasP = columnasP.map(item =>`${item} = ?`).join(", ");
  const columnasFormateadasS = columnasS.map(item =>`${item} = ?`).join(", ");
  const query = local.prepare(`UPDATE ${tablaP} SET ${columnasFormateadasP} WHERE id = ? RETURNING *;`);
  const queryS = local.prepare(`UPDATE ${tablaS} SET ${columnasFormateadasS} WHERE id = ? RETURNING *;`);

  const transaccion = local.transaction((filas,mapuplocalsinc) => {
    for (const row of filas) {
      const valoresOrdenadosP = columnasP.map(elem => row[elem]);
      const valoresOrdenadosS = Object.values(mapuplocalsinc.get(row.id));
      query.run(...valoresOrdenadosP,row.id);
      queryS.run(...valoresOrdenadosS,row.id);
    }
  });

  try {
    transaccion(filas,mapuplocalsinc);
    return { status: 200, message: "Actualización local completada" };
  } catch (error) {
    console.error(`Error al actualizar en ${tablaP}:`, error);
    throw {
      status: error.status || 500,
      message: error.message || `Error al actualizar en ${tablaP} local`,
      context: 'update',
      error: error
    };
  }
}

// ✅ Eliminación lógica (soft delete)
export function softdelete(tabla,miset,ids) {
  if(ids.length === 0){throw new Error("filas vacias");}
  let conect = null;
  try {
    conect = inicializarlocal(); 
  } catch (error) {
    throw {
      status: error.status || 500,
      message: error.message || `Error al inicializar tablas local`,
      context: 'insert',
      error: error
    };
  }

  const local = conect.data;
  const clavesSet = Object.keys(miset[0]);
  const formatoSet = clavesSet.map(item => `${item} = ?`).join(",");
  const query = local.prepare(`UPDATE ${tabla} SET ${formatoSet} WHERE id = ? RETURNING *;`);

  const transaccion = local.transaction((miset,ids) => {
    miset.forEach((fila,index) => {
      const valores = [...Object.values(fila),ids[index]];
      query.run(...valores);
    });
  });

  try {
    transaccion(miset,ids);
    return { status: 200, message: "Eliminación local completada" };
  } catch (error) {
    console.error(`Error al eliminar en ${tabla}:`, error);
    throw {
      status: error.status || 500,
      message: error.message || `Error al eliminar en ${tabla} local`,
      context: 'softdelete',
      error: error
    };
  }
}

// ORM TRABAJA 1 TABLA
/*
export function insert(tabla, columnas, filas) {
  if(columnas.length === 0){throw new Error("columnas vacias");}
  if(filas.length === 0 ){throw new Error("filas vacias");}
  let conect = null;
  try {
    conect = inicializarlocal();
  } catch (error) {
    throw error;
  }
  const local = conect.data;
  const placeholders = columnasP.map(() => "?").join(",");
  const placeholdersS = columnasS.map(() => "?").join(",");
  const query = local.prepare(`INSERT INTO ${tabla} (${columnas.join(",")}) VALUES (${placeholders})`);
  const transaccion = local.transaction((filas) => {
    for (const row of filas) {
      const valoresOrdenados = columnas.map(elem => row[elem]);
      query.run(...valoresOrdenados);
    }
  });

  try {
    transaccion(filas);
    return { status: 200, message: `Inserción local completada en la tabla ${tabla}` };
  } catch (error) {
    console.error(`Error al insertar en ${tabla}:`, error);
    throw {
      status: error.status || 500,
      message: error.message || `Error al insertar en ${tabla} local`,
      context: 'insert',
      error: error
    };
  }
}

export function update(tabla, columnas, filas) {
  if(columnas.length === 0){throw new Error("columnas vacias");}
  if(filas.length === 0){throw new Error("filas vacias");}
  let conect = null;
  try {
    conect = inicializarlocal();
  } catch (error) {
    throw error;
  }

  const local = conect.data;
  const columnasFormateadas = columnas.map(item =>`${item} = ?`).join(", ");
  const stmt = local.prepare(`
    UPDATE ${tabla}
    SET ${columnasFormateadas}
    WHERE id = ?
    RETURNING *;
  `);

  const transaccion = local.transaction((filas) => {
    for (const row of filas) {
      const valoresOrdenados = columnas.map(elem => row[elem]);
      stmt.run(...valoresOrdenados,row.id);
    }
  });

  try {
    transaccion(filas);
    return { status: 200, message: "Actualización local completada" };
  } catch (error) {
    console.error(`Error al actualizar en ${tabla}:`, error);
    throw {
      status: error.status || 500,
      message: error.message || `Error al actualizar en ${tabla} local`,
      context: 'update',
      error: error
    };
  }
}

export function softdelete(tabla, vectorid,driver) {
  if(vectorid.length === 0){throw new Error("filas vacias");}
  let conect = null;
  try {
    conect = inicializarlocal();
  } catch (error) {
    throw {
      status: error.status || 500,
      message: error.message || `Error al inicializar tablas local`,
      context: 'insert',
      error: error
    };
  }

  const local = conect.data;

  const stmt = local.prepare(`UPDATE ${tabla} SET isdelete = 1, version = version+1,device = ${driver},lastupd= CURRENT_TIMESTAMP WHERE id = ? RETURNING *;`);

  const transaccion = local.transaction((ids) => {
    for (const id of ids) {
      stmt.run(id);
    }
  });

  try {
    transaccion(vectorid);
    return { status: 200, message: "Eliminación local completada" };
  } catch (error) {
    console.error(`Error al eliminar en ${tabla}:`, error);
    throw {
      status: error.status || 500,
      message: error.message || `Error al eliminar en ${tabla} local`,
      context: 'softdelete',
      error: error
    };
  }
}
  */