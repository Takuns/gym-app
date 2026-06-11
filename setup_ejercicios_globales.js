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

const SEED_EXERCISES = [
    // === PESAS ===
    {
        nombre: 'Press de Banca',
        categoria: 'Pesas',
        musculo_principal: 'Pecho',
        met_value: 6.0,
        es_tiempo: false,
        imagen_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=800'
    },
    {
        nombre: 'Sentadillas con Barra',
        categoria: 'Pesas',
        musculo_principal: 'Piernas',
        met_value: 6.0,
        es_tiempo: false,
        imagen_url: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?auto=format&fit=crop&q=80&w=800'
    },
    {
        nombre: 'Peso Muerto',
        categoria: 'Pesas',
        musculo_principal: 'Espalda Baja',
        met_value: 6.0,
        es_tiempo: false,
        imagen_url: 'https://images.unsplash.com/photo-1598971639058-fab354c6812c?auto=format&fit=crop&q=80&w=800'
    },
    {
        nombre: 'Dominadas',
        categoria: 'Peso corporal',
        musculo_principal: 'Espalda',
        met_value: 8.0,
        es_tiempo: false,
        imagen_url: 'https://images.unsplash.com/photo-1598971484544-577cffc02008?auto=format&fit=crop&q=80&w=800'
    },
    
    // === TRX ===
    {
        nombre: 'TRX Row (Remo)',
        categoria: 'TRX',
        musculo_principal: 'Espalda',
        met_value: 5.0,
        es_tiempo: false,
        imagen_url: 'https://images.unsplash.com/photo-1526506114642-54bc76f57004?auto=format&fit=crop&q=80&w=800' // General gym image
    },
    {
        nombre: 'TRX Push Up',
        categoria: 'TRX',
        musculo_principal: 'Pecho',
        met_value: 5.0,
        es_tiempo: false,
        imagen_url: 'https://images.unsplash.com/photo-1598971484544-577cffc02008?auto=format&fit=crop&q=80&w=800'
    },
    {
        nombre: 'TRX Pistol Squat',
        categoria: 'TRX',
        musculo_principal: 'Piernas',
        met_value: 6.5,
        es_tiempo: false,
        imagen_url: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?auto=format&fit=crop&q=80&w=800'
    },
    {
        nombre: 'TRX Plank (Plancha)',
        categoria: 'TRX',
        musculo_principal: 'Core',
        met_value: 4.0,
        es_tiempo: true,
        imagen_url: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?auto=format&fit=crop&q=80&w=800'
    },

    // === CARDIO ===
    {
        nombre: 'Cinta de Correr',
        categoria: 'Cardio',
        musculo_principal: 'Cardio',
        met_value: 9.0,
        es_tiempo: true,
        imagen_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=800'
    },
    {
        nombre: 'Comba (Saltar a la cuerda)',
        categoria: 'Cardio',
        musculo_principal: 'Cardio',
        met_value: 10.0,
        es_tiempo: true,
        imagen_url: 'https://images.unsplash.com/photo-1526506114642-54bc76f57004?auto=format&fit=crop&q=80&w=800'
    }
];

async function setup() {
    try {
        console.log("Autenticando como admin...");
        try {
            await pb.admins.authWithPassword(email, password);
        } catch (e) {
            console.log("Falló la autenticación clásica, intentando con _superusers...");
            await pb.collection('_superusers').authWithPassword(email, password);
        }
        console.log("Autenticación exitosa.");

        const collections = await pb.collections.getFullList();
        const existingCol = collections.find(c => c.name === 'ejercicios_globales');

        if (!existingCol) {
            console.log("Creando colección ejercicios_globales...");
            await pb.collections.create({
                name: "ejercicios_globales",
                type: "base",
                fields: [
                    { name: "nombre", type: "text", required: true },
                    { name: "categoria", type: "text" },
                    { name: "musculo_principal", type: "text" },
                    { name: "met_value", type: "number" },
                    { name: "es_tiempo", type: "bool" },
                    { name: "imagen_url", type: "url" },
                    { name: "descripcion", type: "text" }
                ],
                listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: ""
            });
            console.log("Colección ejercicios_globales creada.");
        } else {
            console.log("La colección ejercicios_globales ya existe.");
            
            // Check if schema fields exist, if not we add them.
            // Specifically checking for 'imagen_url' and 'met_value'
            let updated = false;
            if (!existingCol.schema.find(s => s.name === 'met_value')) {
                existingCol.schema.push({ name: "met_value", type: "number" });
                updated = true;
            }
            if (!existingCol.schema.find(s => s.name === 'es_tiempo')) {
                existingCol.schema.push({ name: "es_tiempo", type: "bool" });
                updated = true;
            }
            if (!existingCol.schema.find(s => s.name === 'imagen_url')) {
                existingCol.schema.push({ name: "imagen_url", type: "url" });
                updated = true;
            }
            if (!existingCol.schema.find(s => s.name === 'categoria')) {
                existingCol.schema.push({ name: "categoria", type: "text" });
                updated = true;
            }
            if (!existingCol.schema.find(s => s.name === 'musculo_principal')) {
                existingCol.schema.push({ name: "musculo_principal", type: "text" });
                updated = true;
            }

            if (updated) {
                 await pb.collections.update(existingCol.id, existingCol);
                 console.log("Colección ejercicios_globales actualizada con nuevos campos.");
            }
        }

        console.log("Añadiendo ejercicios iniciales si no existen...");
        const existingExercises = await pb.collection('ejercicios_globales').getFullList();

        for (const exercise of SEED_EXERCISES) {
            const exists = existingExercises.find(e => e.nombre === exercise.nombre);
            if (!exists) {
                await pb.collection('ejercicios_globales').create(exercise);
                console.log(`- Creado: ${exercise.nombre}`);
            } else {
                console.log(`- Ya existe: ${exercise.nombre}`);
                // Update missing fields
                await pb.collection('ejercicios_globales').update(exists.id, {
                    ...exercise
                });
            }
        }

        console.log("=== Setup Completado ===");

    } catch (err) {
        console.error("Error:", err.response || err);
    }
}

setup();
