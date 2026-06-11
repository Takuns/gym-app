import dotenv from 'dotenv';
import PocketBase from 'pocketbase';

dotenv.config();

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function main() {
    try {
        await pb.admins.authWithPassword(process.env.POCKETBASE_ADMIN_EMAIL, process.env.POCKETBASE_ADMIN_PASSWORD);
        console.log("Autenticado como admin.");

        const col = await pb.collections.getOne("comidas_diarias");
        console.log("Colección obtenida:", col.name);

        const hasOrden = col.fields.some(f => f.name === 'orden');
        if (!hasOrden) {
            col.fields.push({
                name: "orden",
                type: "number",
                required: false,
                unique: false,
                options: {}
            });
            await pb.collections.update(col.id, col);
            console.log("Campo 'orden' añadido correctamente.");
        } else {
            console.log("El campo 'orden' ya existe.");
        }
    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}

main();
