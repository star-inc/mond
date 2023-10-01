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
  entrypoint_url: entrypointUrl,
  entrypoint_key: entrypointKey
} = useConfig();

const ws = new WebSocket(entrypointUrl, {
  headers: {
    "x-inaba-key": entrypointKey
  }
});

ws.on('ping', onPing);
ws.on('message', onMessage);
ws.on('error', onError);
