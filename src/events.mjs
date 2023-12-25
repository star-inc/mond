import {
    methods as messageMethods,
} from "./cmds.mjs";

import {
    isObjectPropExists,
} from "./utils.mjs";

export function onOpen() {
    console.info("Connected.");
}

export function onPing() {
    this.pong();
}

export function onMessage(buffer) {
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

export function onError(e) {
    console.error(e);
}
