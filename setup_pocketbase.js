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

// Helper para crear o actualizar colecciones
async function setupCollections() {
    try {
        console.log("Autenticando como admin...");
        try {
            await pb.admins.authWithPassword(email, password);
        } catch (e) {
            console.log("Falló la autenticación clásica, intentando con _superusers...");
            await pb.collection('_superusers').authWithPassword(email, password);
        }
        console.log("Autenticación exitosa.");

        const collectionsToCreate = [
            {
                name: "usuarios",
                type: "base",
                schema: [
                    { name: "nombre", type: "text" },
                    { name: "peso_actual", type: "number" },
                    { name: "objetivo", type: "text" },
                    { name: "calorias_objetivo", type: "number" }
                ],
                listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: ""
            },
            {
                name: "rutinas_semanales",
                type: "base",
                schema: [
                    { name: "nombre", type: "text" },
                    { name: "usuario", type: "relation", options: { collectionId: "", cascadeDelete: true, maxSelect: 1 } }
                ],
                listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: ""
            },
            {
                name: "ejercicios_rutina",
                type: "base",
                schema: [
                    { name: "nombre", type: "text" },
                    { name: "rutina", type: "relation", options: { collectionId: "", cascadeDelete: true, maxSelect: 1 } },
                    { name: "series_objetivo", type: "number" },
                    { name: "repeticiones_objetivo", type: "text" },
                    { name: "es_tiempo", type: "bool" },
                    { name: "descripcion", type: "text" }
                ],
                listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: ""
            },
            {
                name: "historial_series",
                type: "base",
                schema: [
                    { name: "ejercicio", type: "relation", options: { collectionId: "", cascadeDelete: true, maxSelect: 1 } },
                    { name: "numero_serie", type: "number" },
                    { name: "peso_real", type: "number" },
                    { name: "repeticiones_reales", type: "number" },
                    { name: "tiempo_logrado", type: "number" },
                    { name: "completado", type: "bool" }
                ],
                listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: ""
            },
            {
                name: "comidas_diarias",
                type: "base",
                schema: [
                    { name: "usuario", type: "relation", options: { collectionId: "", cascadeDelete: true, maxSelect: 1 } },
                    { name: "fecha", type: "date" },
                    { name: "nombre_comida", type: "text" },
                    { name: "detalles", type: "text" },
                    { name: "calorias", type: "number" },
                    { name: "proteinas", type: "number" },
                    { name: "carbohidratos", type: "number" },
                    { name: "grasas", type: "number" }
                ],
                listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: ""
            }
        ];

        // Fetch existing
        const existing = await pb.collections.getFullList();
        
        // Helper to find collection by name
        const getCol = (name) => existing.find(c => c.name === name);

        // Delete old collections in reverse order to avoid constraint errors
        for (let i = collectionsToCreate.length - 1; i >= 0; i--) {
            const colDef = collectionsToCreate[i];
            const existingCol = getCol(colDef.name);
            if (existingCol) {
                console.log(`Eliminando colección existente: ${colDef.name}...`);
                await pb.collections.delete(existingCol.id);
            }
        }

        // We need to fetch again to get accurate list
        // Actually, we don't need to fetch again since we deleted them.

        // Create collections one by one
        const createdIds = {};

        for (const colDef of collectionsToCreate) {
            console.log(`Creando colección: ${colDef.name}...`);
            
            // Fix relation options
            colDef.schema = colDef.schema.map(field => {
                if (field.type === 'relation') {
                    // find which collection it points to based on field name
                    // In our case: usuario -> usuarios, rutina -> rutinas_semanales, ejercicio -> ejercicios_rutina
                    let targetName = "";
                    if (field.name === "usuario") targetName = "usuarios";
                    if (field.name === "rutina") targetName = "rutinas_semanales";
                    if (field.name === "ejercicio") targetName = "ejercicios_rutina";

                    const targetId = createdIds[targetName];
                    if (targetId) {
                        field.options.collectionId = targetId;
                    }
                }
                return field;
            });

            const newCol = await pb.collections.create(colDef);
            createdIds[colDef.name] = newCol.id;
            console.log(`Colección ${colDef.name} creada con ID ${newCol.id}`);
        }

        console.log("¡Todas las colecciones han sido creadas con éxito con API Rules en modo público (*)");

    } catch (err) {
        console.error("Error configurando PocketBase:", err.response || err);
    }
}

setupCollections();
