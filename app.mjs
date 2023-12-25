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
} from './src/events.mjs';

const {
  entrypoint
} = useConfig();

const {
  host: inabaHost,
  token: inabaToken,
} = entrypoint;

const exchangerUrl = `${inabaHost}/exchanger`
const ws = new WebSocket(exchangerUrl, {
  headers: {
    "x-inaba-token": inabaToken,
  }
});

ws.on('open', onOpen);
ws.on('ping', onPing);
ws.on('message', onMessage);
ws.on('error', onError);

console.info("Mond - The tunnel agent of HTTP services.")
console.info(`Connecting to Inaba server on \"${exchangerUrl}\"`)
