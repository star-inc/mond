import { join as pathJoin } from 'node:path';
import WebSocket from 'ws';

import {
    useConfig
} from './config/index.mjs';

import {
    methods as messageMethods,
} from "./cmds.mjs";

import {
    isObjectPropExists,
} from "./utils.mjs";

export function getBottleConfig() {
    const { entrypoint } = useConfig();

    const { host_ws: inabaHost, token: inabaToken, } = entrypoint;
    const bottleUrl = pathJoin(inabaHost, "bottle");

    return { bottleUrl, inabaToken }
}

export default function connect() {
    const { bottleUrl, inabaToken } = getBottleConfig();
    const ws = new WebSocket(bottleUrl, {
        headers: {
            "x-inaba-token": inabaToken,
        }
    });

    ws.on('open', onOpen);
    ws.on('ping', onPing);
    ws.on('message', onMessage);
    ws.on('error', onError);
    ws.on('close', onClose);
}

function onOpen() {
    console.info("Session open successfully.");
}

function onPing() {
    this.pong();
}

function onMessage(buffer) {
    const text = buffer.toString();
    const data = JSON.parse(text);

    const { type } = data;
    if (isObjectPropExists(messageMethods, type)) {
        const method = messageMethods[type];
        method.call(this, data);
    } else {
        console.warn(`Unsupported message type: ${type}`)
    }
}

function onError(e) {
    const reason = e.message || e.code;
    console.error(`Server Error: ${reason}`);
}

function onClose() {
    console.warn("Session has been closed, try to reconnect later.");
    setTimeout(connect, 15000);
}
