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
        const record = await pb.collection('historial_series').create({
            ejercicio_diario: "text3208210256", // Need a valid ID? No, relations validate.
            numero_serie: 1,
            calorias_quemadas: 50
        });
        console.log("Exito:", record);
    } catch (e) {
        console.error("Fallo:", e.response?.data || e);
    }
}
testCreate();
