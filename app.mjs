import "./src/config/load.mjs";

import WebSocket from 'ws';

import {
  useConfig
} from './src/config/index.mjs';

import {
  onError,
  onMessage,
  onPing
} from './src/transfer/handlers.mjs';

const {
  entrypoint
} = useConfig();

const ws = new WebSocket(entrypoint.url, {
  headers: {
    "x-inaba-key": entrypoint.key
  }
});

ws.on('ping', onPing);
ws.on('message', onMessage);
ws.on('error', onError);
