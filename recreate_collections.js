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

async function recreate() {
    try {
        console.log("Autenticando...");
        try {
            await pb.admins.authWithPassword(email, password);
        } catch(e) {
            await pb.collection('_superusers').authWithPassword(email, password);
        }
        console.log("Autenticación exitosa.");

        const collections = [
            "historial_peso",
            "comidas_diarias",
            "historial_series",
            "ejercicios_diarios",
            "entrenamientos_diarios",
            "ejercicios_plantilla",
            "plantillas_rutinas",
            "ejercicios_rutina", // old tables just in case
            "rutinas_semanales",
            "deportes_diarios",
            "usuarios"
        ];

        // Eliminar en orden de dependencias para evitar errores de clave ajena
        for (const col of collections) {
            try {
                const existing = await pb.collections.getOne(col);
                console.log(`Eliminando colección ${col}...`);
                await pb.collections.delete(existing.id);
            } catch (e) {
                console.log(`Colección ${col} no existe.`);
            }
        }

        console.log("Creando colección usuarios...");
        const usuariosCol = await pb.collections.create({
            name: "usuarios",
            type: "auth",
            fields: [
                { name: "nombre", type: "text", required: true },
                { name: "peso_actual", type: "number" },
                { name: "altura", type: "number" },
                { name: "edad", type: "number" },
                { name: "objetivo", type: "text" },
                { name: "calorias_objetivo", type: "number" },
                { name: "tiempo_reposo_general", type: "number" },
                { name: "created", type: "autodate", onCreate: true, onUpdate: false },
                { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
            ],
            listRule: "id = @request.auth.id", viewRule: "id = @request.auth.id", createRule: "", updateRule: "id = @request.auth.id", deleteRule: "id = @request.auth.id",
            options: {
                allowEmailAuth: true,
                allowOAuth2Auth: false,
                allowUsernameAuth: false,
                exceptEmailDomains: null,
                manageRule: null,
                minPasswordLength: 6,
                onlyEmailDomains: null,
                onlyVerified: false,
                requireEmail: true
            }
        });

        console.log("Creando colección plantillas_rutinas...");
        const plantillasCol = await pb.collections.create({
            name: "plantillas_rutinas",
            type: "base",
            fields: [
                { name: "nombre", type: "text", required: true },
                { name: "usuario", type: "relation", required: true, collectionId: usuariosCol.id, cascadeDelete: true, maxSelect: 1 },
                { name: "created", type: "autodate", onCreate: true, onUpdate: false },
                { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
            ],
            listRule: "usuario = @request.auth.id", viewRule: "usuario = @request.auth.id", createRule: "usuario = @request.auth.id", updateRule: "usuario = @request.auth.id", deleteRule: "usuario = @request.auth.id"
        });

        console.log("Creando colección ejercicios_plantilla...");
        const ejerciciosPlantillaCol = await pb.collections.create({
            name: "ejercicios_plantilla",
            type: "base",
            fields: [
                { name: "nombre", type: "text", required: true },
                { name: "plantilla", type: "relation", required: true, collectionId: plantillasCol.id, cascadeDelete: true, maxSelect: 1 },
                { name: "series_objetivo", type: "number", required: true },
                { name: "repeticiones_objetivo", type: "text", required: true },
                { name: "es_tiempo", type: "bool" },
                { name: "descripcion", type: "text" },
                { name: "tiempo_reposo", type: "number" },
                { name: "created", type: "autodate", onCreate: true, onUpdate: false },
                { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
            ],
            listRule: "plantilla.usuario = @request.auth.id", viewRule: "plantilla.usuario = @request.auth.id", createRule: "plantilla.usuario = @request.auth.id", updateRule: "plantilla.usuario = @request.auth.id", deleteRule: "plantilla.usuario = @request.auth.id"
        });

        console.log("Creando colección entrenamientos_diarios...");
        const entrenamientosDiariosCol = await pb.collections.create({
            name: "entrenamientos_diarios",
            type: "base",
            fields: [
                { name: "usuario", type: "relation", required: true, collectionId: usuariosCol.id, cascadeDelete: true, maxSelect: 1 },
                { name: "fecha", type: "date", required: true },
                { name: "nombre", type: "text", required: true },
                { name: "plantilla_origen", type: "relation", required: false, collectionId: plantillasCol.id, cascadeDelete: false, maxSelect: 1 },
                { name: "created", type: "autodate", onCreate: true, onUpdate: false },
                { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
            ],
            listRule: "usuario = @request.auth.id", viewRule: "usuario = @request.auth.id", createRule: "usuario = @request.auth.id", updateRule: "usuario = @request.auth.id", deleteRule: "usuario = @request.auth.id"
        });

        console.log("Creando colección ejercicios_diarios...");
        const ejerciciosDiariosCol = await pb.collections.create({
            name: "ejercicios_diarios",
            type: "base",
            fields: [
                { name: "entrenamiento", type: "relation", required: true, collectionId: entrenamientosDiariosCol.id, cascadeDelete: true, maxSelect: 1 },
                { name: "nombre", type: "text", required: true },
                { name: "series_objetivo", type: "number", required: true },
                { name: "repeticiones_objetivo", type: "text", required: true },
                { name: "es_tiempo", type: "bool" },
                { name: "descripcion", type: "text" },
                { name: "tiempo_reposo", type: "number" },
                { name: "plantilla_origen_ejercicio", type: "relation", required: false, collectionId: ejerciciosPlantillaCol.id, cascadeDelete: false, maxSelect: 1 },
                { name: "created", type: "autodate", onCreate: true, onUpdate: false },
                { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
            ],
            listRule: "entrenamiento.usuario = @request.auth.id", viewRule: "entrenamiento.usuario = @request.auth.id", createRule: "entrenamiento.usuario = @request.auth.id", updateRule: "entrenamiento.usuario = @request.auth.id", deleteRule: "entrenamiento.usuario = @request.auth.id"
        });

        console.log("Creando colección historial_series...");
        await pb.collections.create({
            name: "historial_series",
            type: "base",
            fields: [
                { name: "ejercicio_diario", type: "relation", required: true, collectionId: ejerciciosDiariosCol.id, cascadeDelete: true, maxSelect: 1 },
                { name: "numero_serie", type: "number", required: true },
                { name: "peso_real", type: "number" },
                { name: "repeticiones_reales", type: "number" },
                { name: "tiempo_logrado", type: "number" },
                { name: "completado", type: "bool" },
                { name: "created", type: "autodate", onCreate: true, onUpdate: false },
                { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
            ],
            listRule: "ejercicio_diario.entrenamiento.usuario = @request.auth.id", viewRule: "ejercicio_diario.entrenamiento.usuario = @request.auth.id", createRule: "ejercicio_diario.entrenamiento.usuario = @request.auth.id", updateRule: "ejercicio_diario.entrenamiento.usuario = @request.auth.id", deleteRule: "ejercicio_diario.entrenamiento.usuario = @request.auth.id"
        });

        console.log("Creando colección comidas_diarias...");
        await pb.collections.create({
            name: "comidas_diarias",
            type: "base",
            fields: [
                { name: "usuario", type: "relation", required: true, collectionId: usuariosCol.id, cascadeDelete: true, maxSelect: 1 },
                { name: "fecha", type: "date", required: true },
                { name: "nombre_comida", type: "text", required: true },
                { name: "detalles", type: "text" },
                { name: "calorias", type: "number" },
                { name: "proteinas", type: "number" },
                { name: "carbohidratos", type: "number" },
                { name: "grasas", type: "number" },
                { name: "created", type: "autodate", onCreate: true, onUpdate: false },
                { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
            ],
            listRule: "usuario = @request.auth.id", viewRule: "usuario = @request.auth.id", createRule: "usuario = @request.auth.id", updateRule: "usuario = @request.auth.id", deleteRule: "usuario = @request.auth.id"
        });

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
            listRule: "usuario = @request.auth.id", viewRule: "usuario = @request.auth.id", createRule: "usuario = @request.auth.id", updateRule: "usuario = @request.auth.id", deleteRule: "usuario = @request.auth.id"
        });

        console.log("Creando colección historial_peso...");
        await pb.collections.create({
            name: "historial_peso",
            type: "base",
            fields: [
                { name: "usuario", type: "relation", required: true, collectionId: usuariosCol.id, cascadeDelete: true, maxSelect: 1 },
                { name: "peso", type: "number", required: true },
                { name: "fecha", type: "date", required: true },
                { name: "created", type: "autodate", onCreate: true, onUpdate: false },
                { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
            ],
            listRule: "usuario = @request.auth.id", viewRule: "usuario = @request.auth.id", createRule: "usuario = @request.auth.id", updateRule: "usuario = @request.auth.id", deleteRule: "usuario = @request.auth.id"
        });

        console.log("¡Todo recreado con éxito!");

        // Crear usuario demo
        console.log("Creando usuario demo...");
        const demoUser = await pb.collection('usuarios').create({
            email: "demo@demo.com",
            password: "password123",
            passwordConfirm: "password123",
            nombre: "Usuario Demo",
            peso_actual: 75.5,
            altura: 175,
            edad: 28,
            objetivo: "Volumen",
            calorias_objetivo: 2800,
            tiempo_reposo_general: 90
        });

        // Crear plantilla de prueba
        console.log("Creando plantilla de prueba...");
        const plantilla = await pb.collection('plantillas_rutinas').create({
            nombre: "Entrenamiento Tren Superior",
            usuario: demoUser.id
        });

        console.log("Creando ejercicios de plantilla...");
        await pb.collection('ejercicios_plantilla').create({
            nombre: "Prensa de Banca",
            plantilla: plantilla.id,
            series_objetivo: 4,
            repeticiones_objetivo: "8-12",
            es_tiempo: false,
            descripcion: "Empujar la barra hacia arriba desde el pecho.",
            tiempo_reposo: 120
        });

        await pb.collection('ejercicios_plantilla').create({
            nombre: "Dominadas",
            plantilla: plantilla.id,
            series_objetivo: 4,
            repeticiones_objetivo: "10",
            es_tiempo: false,
            descripcion: "Tirar del cuerpo hacia arriba.",
            tiempo_reposo: 120
        });

        // Registrar peso inicial en el historial
        console.log("Creando registro de peso inicial...");
        await pb.collection('historial_peso').create({
            usuario: demoUser.id,
            peso: 75.5,
            fecha: new Date().toISOString()
        });

        console.log("¡Datos demo insertados con éxito!");

    } catch (err) {
        if (err.response) {
            console.error("Error Response Data:", JSON.stringify(err.response.data, null, 2));
        } else {
            console.error("Error:", err);
        }
    }
}

recreate();
