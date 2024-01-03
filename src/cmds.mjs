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

const agentPool = new Map();

export const methods = {
    httpRequestHead,
    httpRequestBody,
    httpRequestFoot,
    httpRequestAbort,
    websocketOpen,
    websocketPong,
    websocketSend,
    websocketClose,
    exception,
}

export function httpRequestHead(data) {
    const { requestId, url, method, headers } = data;
    if (!(requestId && url && method && headers)) {
        console.warn("Incorrect register information");
        return;
    }

    const { node } = useConfig();
    const sendMessage = useSendMessage(this);

    const urlParsed = new URL(url);

    const serverName = urlParsed.host;
    const serverProfile = node[serverName];

    if (!serverProfile) {
        sendMessage({
            type: 'httpResponseException',
            requestId,
            text: 'profile not exists'
        });
        sendMessage({
            type: 'httpResponseFoot',
            requestId,
        });
        return;
    }

    const {
        real_host: realHost,
        real_port: realPort,
        is_secure_enabled: isSecureEnabled,
        is_secure_unsafe: isSecureUnsafe,
        timeout_request: timeoutRequest
    } = serverProfile;

    urlParsed.protocol = isSecureEnabled ? "https:" : "http:";
    urlParsed.host = realHost;
    urlParsed.port = realPort;

    const proxyHeaders = {
        ...headers,
        host: serverName,
        "x-inaba-request-id": requestId,
    };
    const proxyOptions = {
        method: method,
        headers: proxyHeaders,
        throwHttpErrors: false,
        https: {
            rejectUnauthorized: !isSecureUnsafe
        },
        timeout: {
            request: timeoutRequest,
        }
    }

    const stream = got.stream(urlParsed, proxyOptions);
    stream.on("request", () => {
        agentPool.set(requestId, stream);
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
        agentPool.delete(requestId);
    })
}

export function httpRequestBody(data) {
    const { requestId, chunk } = data;
    if (!agentPool.has(requestId)) {
        console.warn(`Request \"${requestId}\" not exists`);
        return;
    }

    const stream = agentPool.get(requestId);
    stream.write(chunk, "base64");
}

export function httpRequestFoot(data) {
    const { requestId } = data;
    if (!agentPool.has(requestId)) {
        console.warn(`Request \"${requestId}\" not exists`);
        return;
    }

    const stream = agentPool.get(requestId);
    stream.end();
}

export function httpRequestAbort(data) {
    const { requestId } = data;
    if (!agentPool.has(requestId)) {
        console.warn(`Request \"${requestId}\" not exists`);
        return;
    }

    const stream = agentPool.get(requestId);
    stream.cancel();
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
            type: 'websocketException',
            requestId,
            text: 'profile not exists'
        })
        sendMessage({
            type: 'websocketClose',
            requestId,
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
        agentPool.set(requestId, ws);
    })
    ws.on('ping', (chunk) => {
        sendMessage( {
            type: "websocketPing",
            requestId, chunk
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
        agentPool.delete(requestId);
    })
}

export function websocketPong(data) {
    const { requestId, chunk } = data;
    if (!agentPool.has(requestId)) {
        console.warn(`Socket \"${requestId}\" not exists`);
        return;
    }

    const ws = agentPool.get(requestId);
    ws.pong(chunk);
}

export function websocketSend(data) {
    const { requestId, chunk, isBinary } = data;
    if (!agentPool.has(requestId)) {
        console.warn(`Socket \"${requestId}\" not exists`);
        return;
    }

    const ws = agentPool.get(requestId);
    const buffer = Buffer.from(chunk, "base64");
    ws.send(buffer, {binary: isBinary});
}

export function websocketClose(data) {
    const { requestId } = data;
    if (!agentPool.has(requestId)) {
        console.warn(`Socket \"${requestId}\" not exists`);
        return;
    }

    const ws = agentPool.get(requestId);
    if (ws) {
        ws.close();
    }
}

export function exception(data) {
    const { text } = data;
    console.warn(`Server Exception: ${text}`)
}
