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
        await pb.admins.authWithPassword(email, password);
        const col = await pb.collections.getOne('usuarios');
        
        // Check if field exists
        const exists = col.fields.find(f => f.name === 'dias_entrenamiento');
        if (!exists) {
            col.fields.push({
                hidden: false,
                id: "json_dias_ent",
                name: "dias_entrenamiento",
                presentable: false,
                required: false,
                system: false,
                type: "json"
            });
            await pb.collections.update('usuarios', col);
            console.log("Campo dias_entrenamiento añadido a usuarios.");
        } else {
            console.log("El campo ya existe.");
        }
    } catch (e) {
        console.error("Fallo:", e.response?.data || e);
    }
}
updateSchema();
