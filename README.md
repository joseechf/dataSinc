Version: 1
Soporte para: 
  -SQLite Localmente, PostgreSQL Remoto con una API
  -Una tabla principal, una tabla de metadatos de la tabla principal, una tabla de registro de la última sincronización, 
  una tabla local de los registros descartados ( es local ya que la BD remota tiene prioridad)
Acciones de la librería:
  -Lógica de sincronización
  -Manejo de hashes, versiones, conflictos
  -Lectura/escritura de SQLite
  -Consumo del API remoto
Metodo de sincronización:
  -El sistema usa un calculo hash por cada registro local y remoto, luego compara la versión en que va la actualización del registro y la que tenga una versión mayor gana,
  ya que está más actualizada; por último compara ese resultado para ver las variaciones, evalúa si el registro fue actualizado, insertado o eliminado para decidir cómo 
  proceder en la otra base de datos
Conflictos:
  -Si las versiones son iguales entonces se evalúan las políticas de sincronización para solucionar conflictos
  -En esta version solo se contempla que siempre gane la base de datos remota
Por hacer:
  -Soporte a varias tablas
  -Soporte a diferentes entornos de base de datos
  -Sincronizar por tabla completa y por última fecha de sincronización, para evitar el registro hash
  
  
