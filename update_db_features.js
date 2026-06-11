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

async function updateDb() {
    try {
        console.log("Autenticando...");
        try {
            await pb.admins.authWithPassword(email, password);
        } catch(e) {
            await pb.collection('_superusers').authWithPassword(email, password);
        }
        console.log("Autenticación exitosa.");

        // 1. Modificar colección usuarios
        console.log("Actualizando colección usuarios...");
        const usuariosCol = await pb.collections.getOne("usuarios");
        const hasGenero = usuariosCol.fields.find(f => f.name === 'genero');
        if (!hasGenero) {
            usuariosCol.fields.push({
                system: false,
                id: "genero_field",
                name: "genero",
                type: "text",
                required: false,
                presentable: false,
                unique: false,
                options: {
                    min: null,
                    max: null,
                    pattern: ""
                }
            });
            await pb.collections.update(usuariosCol.id, usuariosCol);
            console.log("Campo 'genero' añadido a usuarios.");
        } else {
            console.log("El campo 'genero' ya existe.");
        }

        // 2. Modificar colección plantillas_rutinas
        console.log("Actualizando colección plantillas_rutinas...");
        const plantillasCol = await pb.collections.getOne("plantillas_rutinas");
        const hasDias = plantillasCol.fields.find(f => f.name === 'dias_semana');
        if (!hasDias) {
            plantillasCol.fields.push({
                system: false,
                id: "dias_semana_field",
                name: "dias_semana",
                type: "json",
                required: false,
                presentable: false,
                unique: false,
                options: {
                    maxSize: 2000000
                }
            });
            await pb.collections.update(plantillasCol.id, plantillasCol);
            console.log("Campo 'dias_semana' añadido a plantillas_rutinas.");
        } else {
            console.log("El campo 'dias_semana' ya existe.");
        }

        // 3. Crear colección deportes_diarios
        try {
            await pb.collections.getOne("deportes_diarios");
            console.log("La colección 'deportes_diarios' ya existe.");
        } catch (e) {
            console.log("Creando colección deportes_diarios...");
            await pb.collections.create({
                name: "deportes_diarios",
                type: "base",
                fields: [
                    { name: "usuario", type: "relation", required: true, collectionId: usuariosCol.id, cascadeDelete: true, maxSelect: 1 },
                    { name: "fecha", type: "date", required: true },
                    { name: "nombre_deporte", type: "text", required: true },
                    { name: "duracion_minutos", type: "number" },
                    { name: "calorias_quemadas", type: "number" },
                    { name: "created", type: "autodate", onCreate: true, onUpdate: false },
                    { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
                ],
                listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: ""
            });
            console.log("Colección 'deportes_diarios' creada.");
        }

        console.log("¡Base de datos actualizada con éxito!");

    } catch (err) {
        if (err.response) {
            console.error("Error Response Data:", JSON.stringify(err.response.data, null, 2));
        } else {
            console.error("Error:", err);
        }
    }
}

updateDb();
