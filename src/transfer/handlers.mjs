import {
    register,
    passthrough,
    finish,
} from "./bottle.mjs"

export function onPing() {
    this.pong();
}

export function onMessage(buffer) {
    const text = buffer.toString();
    const data = JSON.parse(text);

    const { type } = data;

    switch (type) {
        case "register": {
            register(this, data);
            break;
        }
        case "passthrough": {
            passthrough(data);
            break;
        }
        case "finish": {
            finish(data);
            break;
        }
        default: {
            this.send(`Unsupported type: ${type}`)
        }
    }
}

export function onError(e) {
    console.log(e);
}
