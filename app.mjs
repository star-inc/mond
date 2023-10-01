import WebSocket from 'ws';
import {loadConfig, useConfig} from './src/config.mjs';
import { onError, onMessage, onPing } from './src/handlers.mjs';

loadConfig();

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
