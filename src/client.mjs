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

function useHeartbeat() {
    const ttl = 8000;
    let checkpoint = 0;
    const refreshMethod = () => {
        checkpoint = new Date().getTime();
    }
    const checkMethod = () => {
        const now = new Date().getTime();
        if (checkpoint + ttl < now) {
            throw new Error("Heartbeat timeout");
        }
    };
    const intervalId = setInterval(checkMethod, ttl);
    return {refreshMethod, intervalId}
}

export function getBottleConfig() {
    const { entrypoint } = useConfig();

    const { host_ws: inabaHost, token: inabaToken, } = entrypoint;
    const bottleUrl = [inabaHost, "bottle"].join("/");

    return { bottleUrl, inabaToken }
}

export default function connect() {
    const { bottleUrl, inabaToken } = getBottleConfig();
    const ws = new WebSocket(bottleUrl, {
        headers: {
            "x-inaba-token": inabaToken,
        }
    });

    ws.heartbeat = useHeartbeat();
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
    const {refreshMethod} = this.heartbeat;
    refreshMethod();
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
    const {intervalId} = this.heartbeat;
    clearInterval(intervalId);
    setTimeout(connect, 7000);
}
