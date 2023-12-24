import "./src/config/load.mjs";

import WebSocket from 'ws';

import {
  useConfig
} from './src/config/index.mjs';

import {
  onOpen,
  onPing,
  onMessage,
  onError,
} from './src/event.mjs';

const {
  entrypoint
} = useConfig();

const ws = new WebSocket(entrypoint.url, {
  headers: {
    "x-inaba-key": entrypoint.key
  }
});

ws.on('open', onOpen);
ws.on('ping', onPing);
ws.on('message', onMessage);
ws.on('error', onError);

console.info("Mond - The tunnel agent of HTTP services.")
console.info(`Connecting to Inaba server on \"${entrypoint.url}\"`)
