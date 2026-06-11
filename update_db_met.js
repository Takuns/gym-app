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

async function run() {
    try {
        console.log("Autenticando...");
        try {
            await pb.admins.authWithPassword(email, password);
        } catch (e) {
            await pb.collection('_superusers').authWithPassword(email, password);
        }
        console.log("Autenticado.");

        const ed = await pb.collections.getOne('ejercicios_diarios');
        if (!ed.fields.find(f => f.name === 'met_value')) {
            ed.fields.push({ name: 'met_value', type: 'number' });
            await pb.collections.update('ejercicios_diarios', ed);
            console.log('met_value added to ejercicios_diarios');
        }

        const ep = await pb.collections.getOne('ejercicios_plantilla');
        if (!ep.fields.find(f => f.name === 'met_value')) {
            ep.fields.push({ name: 'met_value', type: 'number' });
            await pb.collections.update('ejercicios_plantilla', ep);
            console.log('met_value added to ejercicios_plantilla');
        }

        const h = await pb.collections.getOne('historial_series');
        if (!h.fields.find(f => f.name === 'calorias_quemadas')) {
            h.fields.push({ name: 'calorias_quemadas', type: 'number' });
            await pb.collections.update('historial_series', h);
            console.log('calorias_quemadas added to historial_series');
        }

    } catch(e) {
        console.error(e);
    }
}
run();
