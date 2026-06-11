import PocketBase from 'pocketbase';
import 'dotenv/config';

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

pb.beforeSend = function (url, options) {
    options.headers = Object.assign({}, options.headers, {
        'ngrok-skip-browser-warning': 'true'
    });
    return { url, options };
};

async function createTestUser() {
    try {
        const email = process.env.POCKETBASE_ADMIN_EMAIL;
        const password = process.env.POCKETBASE_ADMIN_PASSWORD;
        try {
            await pb.admins.authWithPassword(email, password);
        } catch(e) {
            await pb.collection('_superusers').authWithPassword(email, password);
        }

        const users = await pb.collection('usuarios').getFullList();
        if (users.length === 0) {
            await pb.collection('usuarios').create({
                nombre: "Usuario Demo",
                peso_actual: 75.5,
                objetivo: "Volumen",
                calorias_objetivo: 2800
            });
            console.log("Usuario de prueba creado.");
        } else {
            console.log("Ya existe un usuario.");
        }
    } catch(err) {
        console.error(err);
    }
}

createTestUser();
