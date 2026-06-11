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

async function updateSchema() {
    try {
        console.log("Autenticando...");
        try {
            await pb.admins.authWithPassword(email, password);
        } catch(e) {
            await pb.collection('_superusers').authWithPassword(email, password);
        }

        console.log("Buscando colección ejercicios_rutina...");
        const collection = await pb.collections.getOne("ejercicios_rutina");
        
        // Add dia_semana field
        if (!collection.fields.find(f => f.name === 'dia_semana')) {
            collection.fields.push({
                name: "dia_semana",
                type: "text",
                required: false,
            });
            await pb.collections.update(collection.id, collection);
            console.log("Campo dia_semana añadido con éxito.");
        } else {
            console.log("El campo dia_semana ya existe.");
        }
        
    } catch(err) {
        console.error(err);
    }
}
updateSchema();
