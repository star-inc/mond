import got from 'got';

import {
    useSendMessage
} from '../utils.mjs';

import {
    useConfig
} from '../config/index.mjs';

const registry = new Map();

export function register(ws, data) {
    const { requestId, url, method, headers } = data;
    if (!(requestId && url && method && headers)) {
        throw new Error("Incorrect register information");
    }

    const { nodes } = useConfig();
    const sendMessage = useSendMessage(ws);

    const urlParsed = new URL(url);
    const originalHost = urlParsed.host;

    const profile = nodes[originalHost];

    if (!profile) {
        sendMessage({
            requestId,
            type: 'exception',
            text: 'profile not exists'
        })
        return;
    }

    urlParsed.protocol = profile.is_secure ? "https:" : "http:";
    urlParsed.host = profile.real_host;
    urlParsed.port = profile.real_port;

    const proxyHeaders = {
        headers,
        Host: originalHost,
    };
    const proxyOptions = {
        method: method,
        headers: proxyHeaders,
        throwHttpErrors: false,
    }

    const stream = got.stream(urlParsed, proxyOptions);
    stream.on("response", (res) => {
        const { statusCode, headers } = res;
        sendMessage({
            requestId,
            type: 'head',
            statusCode,
            headers,
        });
    })
    stream.on("data", (chunk) => {
        sendMessage({
            requestId,
            type: 'passthrough',
            chunk: chunk.toString('base64'),
        });
    })
    stream.on('error', (e) => {
        sendMessage({
            requestId,
            type: 'exception',
            text: e.message
        })
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