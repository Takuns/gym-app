import PocketBase from 'pocketbase';
import 'dotenv/config';

const url = process.env.VITE_POCKETBASE_URL;
const email = process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(url);
pb.beforeSend = function (url, options) {
    options.headers = Object.assign({}, options.headers, {
        'ngrok-skip-browser-warning': 'true'
    });
    return { url, options };
};

async function testCreate() {
    try {
        await pb.admins.authWithPassword(email, password);
        
        // Find a valid ejercicio_diario
        const ej = await pb.collection('ejercicios_diarios').getFirstListItem('');
        console.log("Using", ej.id);

        const record = await pb.collection('historial_series').create({
            ejercicio_diario: ej.id,
            numero_serie: 99,
            peso_real: 10,
            repeticiones_reales: 10,
            completado: true,
            calorias_quemadas: 50 // unknown field
        });
        console.log("Exito:", record.id);
        
        await pb.collection('historial_series').delete(record.id);
    } catch (e) {
        console.error("Fallo:", e.response?.data || e);
    }
}
testCreate();
