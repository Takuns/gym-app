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
        const col = await pb.collections.getOne('historial_series');
        console.log("List rule:", col.listRule);
        console.log("View rule:", col.viewRule);
        console.log("Create rule:", col.createRule);
        console.log("Update rule:", col.updateRule);
        console.log("Delete rule:", col.deleteRule);
    } catch (e) {
        console.error("Fallo:", e.response?.data || e);
    }
}
testRules();
