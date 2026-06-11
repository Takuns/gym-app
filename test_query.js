import PocketBase from 'pocketbase';
import 'dotenv/config';

const url = process.env.VITE_POCKETBASE_URL;
const pb = new PocketBase(url);

pb.beforeSend = function (url, options) {
    options.headers = Object.assign({}, options.headers, {
        'ngrok-skip-browser-warning': 'true'
    });
    return { url, options };
};

async function test() {
    try {
        console.log("Conectando a PocketBase en:", url);
        
        // 1. Obtener usuarios
        const users = await pb.collection('usuarios').getFullList();
        if (users.length === 0) {
            console.log("No hay usuarios.");
            return;
        }
        const user = users[0];
        console.log("Usuario:", user.nombre, "ID:", user.id, "Calorías objetivo:", user.calorias_objetivo);

        // 2. Obtener comidas diarias
        console.log("\n--- Comidas Diarias ---");
        const comidas = await pb.collection('comidas_diarias').getFullList({
            filter: `usuario = "${user.id}"`,
            sort: '-fecha'
        });
        console.log(`Encontradas ${comidas.length} comidas:`);
        comidas.forEach(c => {
            console.log(`ID: ${c.id} | Fecha: ${c.fecha} | Creado: ${c.created} | Nombre: ${c.nombre_comida} | Detalles: ${c.detalles} | Calorias: ${c.calorias}`);
        });

        // 3. Obtener deportes
        console.log("\n--- Deportes Diarios ---");
        const deportes = await pb.collection('deportes_diarios').getFullList({
            filter: `usuario = "${user.id}"`,
            sort: '-fecha'
        });
        console.log(`Encontrados ${deportes.length} deportes:`);
        deportes.forEach(d => {
            console.log(`ID: ${d.id} | Fecha: ${d.fecha} | Deporte: ${d.nombre_deporte} | Calorias: ${d.calorias_quemadas}`);
        });

        // 4. Obtener series completadas
        console.log("\n--- Historial Series ---");
        const series = await pb.collection('historial_series').getFullList({
            filter: `completado = true`,
            sort: '-created'
        });
        console.log(`Encontradas ${series.length} series completadas:`);
        series.forEach(s => {
            console.log(`ID: ${s.id} | Creado: ${s.created} | Ejercicio: ${s.ejercicio}`);
        });

    } catch (err) {
        console.error("Error:", err);
    }
}

test();
