  // importar modulos y definición de variables
  const express = require('express'); // se importa el modulo express que se usa para hacer entre otras cosas paginas web
  const app = express(); //se define la variable app 
  const { Pool } = require('pg'); // se importa el modulo pg que es la biblioteca cliente de postgres pero se importa como destructurado
                                  //que nos permite interactuar con bases de datos 
                                  //el ponerlo destructurado es lo mismo que:
                                  // const pg = require('pg');
                                  //const Pool = pg.Pool;
  const fetch = require('node-fetch'); // es una biblioteca que sirve para realizar solicitudes http usadas enn APIs principalmente
  const path = require('path'); // se importa el modulo path de node que nos permite trabajar con rutas de archivos y directorios
  const PORT = process.env.PORT || 3000; // se definen el puerto en el que se quiere ejecutar
  const DATABASE_URL = process.env.DATABASE_URL; // se definen las variables de entorno para la conexión a la base de datos

  // Database connection
  const pool = new Pool({ // Creamos un nuevo objeto Pool de la biblioteca pg, pasando la URL de la base de datos como argumento
    connectionString: DATABASE_URL,
  });

  // Establecemos la URL base de la API de Bored, que será utilizada para obtener actividades aleatorias.
  const BORED_API_BASE_URL = 'https://www.boredapi.com/api/';

  //Esta función hace una solicitud a la API de Bored para obtener una actividad aleatoria. 
  // Si la solicitud es exitosa, devuelve un objeto con el nombre de la actividad (activity) 
  //y el número de participantes (participants). 
  //Si la solicitud falla, devuelve null
  async function getRandomActivity() {
    try {
      const response = await fetch(BORED_API_BASE_URL + 'activity');
      if (response.ok) {
        const data = await response.json(); //toma la respuesta y la convierte de objeto a json 
        return {
          acitivity:data.activity,  //se definen los valores a partir del json para actividad
          participants:data.participants}; //se definen los valores a partir del json para actividad
        }else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }
  // Esta ruta maneja las solicitudes GET para insertar una nueva actividad en la base de datos.
  app.get('/insert_activity', async (req, res) => {
    try {
      const client = await pool.connect(); // establece conexion con la base de datos
      const activityName = await getRandomActivity(); //// obtiene una actividad aleatoria llamando a la función getRandomActivity()
      if (activityName) { // si se obtiene algun dato de la funcion inserta los valores obtenidos en la tabla 
        await client.query('INSERT INTO my_activities (activity, participantes) VALUES ($1, $2)', [activityName.acitivity,activityName.participants]);
        client.release(); // liberar explícitamente la conexión de la base de datos
        //el mensaje que se quiera enviar cuando se inserta de forma correcta a la base de datos
        res.status(200).json({ status: 'success', message: `Activity "${activityName.acitivity}" you need ${activityName.participants} participants inserted successfully` }); 
      } else {
        res.status(400).json({ status: 'error', message: 'Unable to generate an activity from BoredAPI' });
      }
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  });
  // Esta ruta maneja las solicitudes GET para obtener la cantidad de actividades y nombres de actividades
  app.get('/', async (req, res) => {
    try {
      const client = await pool.connect(); // establece conexion con la base de datos
      const countResult = await client.query('SELECT COUNT(*) FROM my_activities'); // obtiene la cantidad de actividades de la tabla my_activities
      const count = countResult.rows[0].count; // obtiene el valor de la columna count de la fila 0 de la tabla my_activities
      const activitiesResult = await client.query('SELECT activity, participantes FROM my_activities'); // 
      const activityNames = activitiesResult.rows.map(row => row.activity); // realizan una consulta a la base de datos para 
                                                                            //obtener una lista de actividades y el número de participantes asociados a cada una
      const activityparticipantes = activitiesResult.rows.map(row => row.participantes); // realizan una consulta a la base de datos para
      client.release(); // liberar explícitamente la conexión de la base de datos
      res.json({ actividades: count ,actividades: activityNames}); // se envian los valores de la cantidad de actividades, nombres de actividades y participantes ;
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  });
  // se agrego una nueva pagina para ver como se podia agregar una pagina al render
  app.get('/forma', (req,res)=>{
    res.sendFile(path.join(__dirname , 'pagina','forms1.html'));
  });

// Servir el archivo HTML estático utilizando express.static
app.use(express.static(path.join(__dirname, 'pagina')));

// Manejar la solicitud POST del formulario
app.post('/submit_form', async (req, res) => {
  const { nombre, edad } = req.body;
  try {
    const client = await pool.connect();
    await client.query('INSERT INTO datos (nombre, edad) VALUES ($1, $2)', [nombre, edad]);
    client.release();
    res.redirect('/forma'); // Redirigir de vuelta a la página de formulario después de procesar el formulario
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
