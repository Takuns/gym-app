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

async function run() {
    try {
        console.log("Autenticando...");
        try {
            await pb.admins.authWithPassword(email, password);
        } catch(e) {
            await pb.collection('_superusers').authWithPassword(email, password);
        }
        console.log("Autenticación exitosa.");

        // 1. ejercicios_plantilla
        console.log("Actualizando ejercicios_plantilla...");
        const epCol = await pb.collections.getOne("ejercicios_plantilla");
        if (!epCol.fields.find(f => f.name === 'imagen_url')) {
            epCol.fields.push({
                name: "imagen_url",
                type: "text",
                required: false
            });
            await pb.collections.update(epCol.id, epCol);
            console.log("imagen_url añadido a ejercicios_plantilla");
        } else {
            console.log("imagen_url ya existe en ejercicios_plantilla");
        }

        // 2. ejercicios_diarios
        console.log("Actualizando ejercicios_diarios...");
        const edCol = await pb.collections.getOne("ejercicios_diarios");
        if (!edCol.fields.find(f => f.name === 'imagen_url')) {
            edCol.fields.push({
                name: "imagen_url",
                type: "text",
                required: false
            });
            await pb.collections.update(edCol.id, edCol);
            console.log("imagen_url añadido a ejercicios_diarios");
        } else {
            console.log("imagen_url ya existe en ejercicios_diarios");
        }

        console.log("=== Proceso completado ===");
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
