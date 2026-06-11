import PocketBase from 'pocketbase';

// Export shared instance
export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || '/');

// Required to bypass ngrok browser warning for the web client
pb.beforeSend = function (url, options) {
    options.headers = Object.assign({}, options.headers, {
        'ngrok-skip-browser-warning': 'true'
    });
    return { url, options };
};
