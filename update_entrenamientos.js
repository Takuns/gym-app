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

async function update() {
    try {
        await pb.admins.authWithPassword(email, password);
        const col = await pb.collections.getOne('entrenamientos_diarios');
        const exists = col.fields.find(f => f.name === 'dia_rutina');
        if (!exists) {
            col.fields.push({
                name: 'dia_rutina',
                type: 'text',
                required: true
            });
            await pb.collections.update('entrenamientos_diarios', col);
            console.log('Added dia_rutina to entrenamientos_diarios');
        } else {
            console.log('dia_rutina already exists');
        }
    } catch (e) {
        console.error(e.response ? JSON.stringify(e.response.data, null, 2) : e);
    }
}
update();
