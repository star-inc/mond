import got from 'got';

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
            type: 'exception',
            text: 'profile not exists'
        })
        return;
    }

    urlParsed.protocol = serverProfile.is_secure ? "https:" : "http:";
    urlParsed.host = serverProfile.real_host;
    urlParsed.port = serverProfile.real_port;

    const proxyHeaders = {
        headers,
        host: serverName,
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
        stream.destroy();
    });
    stream.on('error', (e) => {
        sendMessage({
            requestId,
            type: 'exception',
            text: e.message
        })
    })

    requestPool.set(requestId, stream);
}

export function httpRequestBody(data) {
    const { requestId, chunk } = data;
    if (!requestPool.has(requestId)) {
        throw new Error("Request not exists");
    }

    const stream = requestPool.get(requestId);
    const buffer = Buffer.from(chunk, "base64");
    stream.write(buffer);
}

export function httpRequestFoot(data) {
    const { requestId } = data;
    if (!requestPool.has(requestId)) {
        throw new Error("Request not exists");
    }

    const stream = requestPool.get(requestId);
    stream.end();
}

export function exception(data) {
    const { type, text } = data;
    console.warn(`Server Exception: ${text}`)
}