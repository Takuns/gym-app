import PocketBase from 'pocketbase';
import 'dotenv/config';

const url = process.env.VITE_POCKETBASE_URL;
const email = process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!url || !email || !password) {
    console.error("Faltan credenciales en .env");
    process.exit(1);
}

const pb = new PocketBase(url);

pb.beforeSend = function (url, options) {
    options.headers = Object.assign({}, options.headers, {
        'ngrok-skip-browser-warning': 'true'
    });
    return { url, options };
};

async function checkQuery() {
    try {
        console.log("Autenticando...");
        try {
            await pb.admins.authWithPassword(email, password);
        } catch(e) {
            await pb.collection('_superusers').authWithPassword(email, password);
        }

        const records = await pb.collection('historial_series').getFullList({
          filter: `ejercicio_diario.nombre = "Dominadas"`,
        });
        console.log(records.length, "registros encontrados");

    } catch (err) {
        if (err.response) {
            console.error("Error Response Data:", JSON.stringify(err.response.data, null, 2));
        } else {
            console.error("Error:", err);
        }
    }
}

checkQuery();
