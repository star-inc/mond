import got from 'got';

import {
    WebSocket,
} from "ws";

import {
    useSendMessage
} from './utils.mjs';

import {
    useConfig
} from './config/index.mjs';

const requestPool = new Map();

export const methods = {
    httpRequestHead,
    httpRequestBody,
    httpRequestFoot,
    websocketOpen,
    websocketPong,
    websocketSend,
    websocketClose,
    exception,
}

export function httpRequestHead(data) {
    const { requestId, url, method, headers } = data;
    if (!(requestId && url && method && headers)) {
        throw new Error("Incorrect register information");
    }

    const { node } = useConfig();
    const sendMessage = useSendMessage(this);

    const urlParsed = new URL(url);

    const serverName = urlParsed.host;
    const serverProfile = node[serverName];

    if (!serverProfile) {
        sendMessage({
            requestId,
            type: 'httpException',
            text: 'profile not exists'
        })
        return;
    }

    const {
        real_host: realHost,
        real_port: realPort,
        is_secure_enabled: isSecureEnabled,
        is_secure_unsafe: isSecureUnsafe,
    } = serverProfile;

    urlParsed.protocol = isSecureEnabled ? "https:" : "http:";
    urlParsed.host = realHost;
    urlParsed.port = realPort;

    const proxyHeaders = {
        ...headers,
        host: serverName,
    };
    const proxyOptions = {
        method: method,
        headers: proxyHeaders,
        throwHttpErrors: false,
        https: {
            rejectUnauthorized: !isSecureUnsafe
        }
    }

    const stream = got.stream(urlParsed, proxyOptions);
    stream.on("request", () => {
        requestPool.set(requestId, stream);
    })
    stream.on("response", (res) => {
        const { statusCode, headers } = res;
        sendMessage({
            type: 'httpResponseHead',
            requestId,
            statusCode,
            headers,
        });
    })
    stream.on("data", (chunk) => {
        sendMessage({
            type: 'httpResponseBody',
            requestId,
            chunk: chunk.toString('base64'),
        });
    })
    stream.on('end', () => {
        sendMessage({
            type: 'httpResponseFoot',
            requestId,
        });
    });
    stream.on('error', (e) => {
        sendMessage({
            type: 'httpResponseException',
            requestId,
            text: e.message || e.code
        })
    })
    stream.on('close', () => {
        stream.destroy();
        requestPool.delete(requestId);
    })
}

export function httpRequestBody(data) {
    const { requestId, chunk } = data;
    if (!requestPool.has(requestId)) {
        throw new Error("Request not exists");
    }

    const stream = requestPool.get(requestId);
    stream.write(chunk, "base64");
}

export function httpRequestFoot(data) {
    const { requestId } = data;
    if (!requestPool.has(requestId)) {
        throw new Error("Request not exists");
    }

    const stream = requestPool.get(requestId);
    stream.end();
}

export function websocketOpen(data) {
    const { requestId, url, headers } = data;

    const { node } = useConfig();
    const sendMessage = useSendMessage(this);

    const urlParsed = new URL(url);
    const protocols = headers["sec-webSocket-protocol"];

    const serverName = urlParsed.host;
    const serverProfile = node[serverName];

    const {
        real_host: realHost,
        real_port: realPort,
        is_secure_enabled: isSecureEnabled,
        is_secure_unsafe: isSecureUnsafe,
    } = serverProfile;

    if (!serverProfile) {
        sendMessage({
            requestId,
            type: 'httpException',
            text: 'profile not exists'
        })
        return;
    }

    urlParsed.protocol = isSecureEnabled ? "wss:" : "ws:";
    urlParsed.host = realHost;
    urlParsed.port = realPort;

    const ws = new WebSocket(urlParsed, protocols, {
        rejectUnauthorized: !isSecureUnsafe,
        headers,
    });
    ws.on('open', () => {
        requestPool.set(requestId, ws);
    })
    ws.on('ping', () => {
        sendMessage( {
            type: "websocketPing",
            requestId,
        });
    })
    ws.on('message', (data, isBinary) => {
        sendMessage( {
            type: "websocketSend",
            requestId,
            chunk: data.toString("base64"),
            isBinary,
        });
    })
    ws.on('error', (e) => {
        sendMessage({
            type: 'websocketException',
            requestId,
            text: e.message
        })
    });
    ws.on('close', () => {
        sendMessage( {
            type: "websocketClose",
            requestId,
        });
        requestPool.delete(requestId);
    })
}

export function websocketPong(data) {
    const { requestId } = data;
    const ws = requestPool.get(requestId);
    ws.pong();
}

export function websocketSend(data) {
    const { requestId, chunk, isBinary } = data;
    const ws = requestPool.get(requestId);
    const buffer = Buffer.from(chunk, "base64");
    ws.send(buffer, {binary: isBinary});
}

export function websocketClose(data) {
    const { requestId } = data;
    const ws = requestPool.get(requestId);
    if (ws) {
        ws.close();
    }
}

export function exception(data) {
    const { text } = data;
    console.warn(`Server Exception: ${text}`)
}
