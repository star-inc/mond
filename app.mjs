import "./src/config/load.mjs";

import connect, { getBottleConfig } from './src/client.mjs';

const {bottleUrl} = getBottleConfig();
console.info("Mond - The tunnel agent of HTTP services.")
console.info(`Connecting to Inaba server on \"${bottleUrl}\"`)

connect();
