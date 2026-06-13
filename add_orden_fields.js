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

async function addOrdenFields() {
    try {
        console.log("Autenticando...");
        try {
            await pb.admins.authWithPassword(email, password);
        } catch(e) {
            await pb.collection('_superusers').authWithPassword(email, password);
        }
        console.log("Autenticación exitosa.");

        const collectionsToUpdate = ["ejercicios_diarios"];

        for (const colName of collectionsToUpdate) {
            console.log(`Actualizando colección ${colName}...`);
            const col = await pb.collections.getOne(colName);
            const hasOrden = col.fields.find(f => f.name === 'orden');
            if (!hasOrden) {
                col.fields.push({
                    system: false,
                    id: `orden_field_${Date.now()}`,
                    name: "orden",
                    type: "number",
                    required: false,
                    presentable: false,
                    unique: false,
                    options: {
                        min: null,
                        max: null
                    }
                });
                await pb.collections.update(col.id, col);
                console.log(`Campo 'orden' añadido a ${colName}.`);
            } else {
                console.log(`El campo 'orden' ya existe en ${colName}.`);
            }
        }

        console.log("¡Campos orden actualizados con éxito!");
    } catch (err) {
        if (err.response) {
            console.error("Error Response Data:", JSON.stringify(err.response.data, null, 2));
        } else {
            console.error("Error:", err);
        }
    }
}

addOrdenFields();
