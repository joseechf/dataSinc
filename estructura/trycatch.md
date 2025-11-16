try {
       //todo bien
       return {status: 200,data:algo}
       //todo mal
       throw new ERROR(`valio verga ${algo}`);
} catch (error) {
        console.log(`el problema fue `,error); 
        const e = new Error("Error al insertar en la base de datos");
        e.status = 500;
        e.data = error;
        throw e;
}

try {
  //algo
} catch (err) {
  console.error(err.status); // 500
  console.error(err.message); // "Error al insertar en la base de datos"
  console.error(err.data); // error original
}
