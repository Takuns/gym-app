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

async function testRules() {
    try {
        await pb.admins.authWithPassword(email, password);
        const col = await pb.collections.getOne('usuarios');
        console.log(JSON.stringify(col.fields || col.schema || col, null, 2));
    } catch (e) {
        console.error("Fallo:", e.response?.data || e);
    }
}
testRules();
