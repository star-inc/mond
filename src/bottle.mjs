import got from 'got';

import {
    useSendMessage
} from './utils.mjs';

import {
    useConfig
} from './config.mjs';

const registry = new Map();

export function register(ws, data) {
    const { requestId, url, method, headers } = data;
    if (!(requestId && url && method && headers)) {
        throw new Error("Incorrect register information");
    }

    const config = useConfig();
    const sendMessage = useSendMessage(ws);

    const urlParsed = new URL(url);
    const originalHost = urlParsed.host;

    const proxyServer = config.servers[originalHost];
    if (!proxyServer) {
        sendMessage({
            requestId,
            type: 'finish',
        })
        return;
    }

    urlParsed.host = proxyServer.host;
    urlParsed.port = proxyServer.port;

    const proxyHeaders = {
        headers,
        Host: originalHost,
    };
    const proxyOptions = {
        method: method,
        headers: proxyHeaders,
    }

    const stream = got.stream(urlParsed, proxyOptions);
    stream.on("data", (chunk) => {
        sendMessage({
            requestId,
            type: 'passthrough',
            chunk: chunk.toString('base64'),
        });
    })
    stream.on('end', () => {
        sendMessage({
            requestId,
            type: 'finish',
        });
        stream.destroy();
    });

    registry.set(requestId, stream);
}

export function passthrough(data) {
    const { requestId, chunk } = data;
    if (!registry.has(requestId)) {
        throw new Error("Request not exists");
    }

    const stream = registry.get(requestId);
    const buffer = Buffer.from(chunk, "base64");
    stream.write(buffer);
}

export function finish(data) {
    const { requestId } = data;
    if (!registry.has(requestId)) {
        throw new Error("Request not exists");
    }

    const stream = registry.get(requestId);
    stream.end();
}
