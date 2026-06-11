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

async function updateSchema() {
    try {
        console.log("Autenticando...");
        try {
            await pb.admins.authWithPassword(email, password);
        } catch(e) {
            await pb.collection('_superusers').authWithPassword(email, password);
        }
        console.log("Autenticación exitosa.");

        // 1. Actualizar colección de usuarios
        console.log("Buscando colección usuarios...");
        const usersCol = await pb.collections.getOne("usuarios");
        console.log("Campos de usuarios:", JSON.stringify(usersCol.fields, null, 2));
        
        console.log("Buscando colección ejercicios_rutina...");
        const exCol = await pb.collections.getOne("ejercicios_rutina");
        console.log("Campos de ejercicios_rutina:", JSON.stringify(exCol.fields, null, 2));

        let userUpdated = false;

        if (!usersCol.fields.find(f => f.name === 'altura')) {
            usersCol.fields.push({
                name: "altura",
                type: "number",
                required: false,
            });
            userUpdated = true;
        }

        if (!usersCol.fields.find(f => f.name === 'edad')) {
            usersCol.fields.push({
                name: "edad",
                type: "number",
                required: false,
            });
            userUpdated = true;
        }

        if (userUpdated) {
            await pb.collections.update(usersCol.id, usersCol);
            console.log("Colección de usuarios actualizada con los campos altura y edad.");
        } else {
            console.log("La colección de usuarios ya contiene los campos altura y edad.");
        }

        // 2. Crear colección historial_peso
        try {
            await pb.collections.getOne("historial_peso");
            console.log("La colección historial_peso ya existe.");
        } catch (err) {
            console.log("Creando colección historial_peso...");
            await pb.collections.create({
                name: "historial_peso",
                type: "base",
                fields: [
                    { 
                        name: "usuario", 
                        type: "relation", 
                        required: true,
                        options: { 
                            collectionId: usersCol.id, 
                            cascadeDelete: true, 
                            maxSelect: 1 
                        } 
                    },
                    { 
                        name: "peso", 
                        type: "number", 
                        required: true 
                    },
                    { 
                        name: "fecha", 
                        type: "date", 
                        required: true 
                    }
                ],
                listRule: "", 
                viewRule: "", 
                createRule: "", 
                updateRule: "", 
                deleteRule: ""
            });
            console.log("Colección historial_peso creada con éxito.");
        }

    } catch(err) {
        if (err.response) {
            console.error("Error Response Data:", JSON.stringify(err.response.data, null, 2));
        } else {
            console.error("Error durante la actualización:", err);
        }
    }
}

updateSchema();
