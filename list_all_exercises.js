import PocketBase from 'pocketbase';
import 'dotenv/config';

const url = process.env.VITE_POCKETBASE_URL;
const pb = new PocketBase(url);

pb.beforeSend = function (url, options) {
    options.headers = Object.assign({}, options.headers, {
        'ngrok-skip-browser-warning': 'true'
    });
    return { url, options };
};

async function run() {
    try {
        console.log("Conectando a PocketBase...");
        const plantillas = await pb.collection('plantillas_rutinas').getFullList();
        console.log("=== PLANTILLAS ===");
        for (const p of plantillas) {
            console.log(`- Plantilla: ${p.nombre} (ID: ${p.id})`);
            const ePlantilla = await pb.collection('ejercicios_plantilla').getFullList({
                filter: `plantilla = "${p.id}"`
            });
            for (const ep of ePlantilla) {
                console.log(`  * Ejercicio: ${ep.nombre} (Series: ${ep.series_objetivo}, Reps: ${ep.repeticiones_objetivo})`);
            }
        }
        
        console.log("\n=== EJERCICIOS DIARIOS ===");
        const eDiarios = await pb.collection('ejercicios_diarios').getFullList();
        for (const ed of eDiarios) {
            console.log(`- Ejercicio Diario: ${ed.nombre} (ID: ${ed.id})`);
        }
    } catch (e) {
        console.error(e);
    }
}
run();
