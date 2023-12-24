export const useSendMessage = (ws) =>
    (data) => ws.send(JSON.stringify(data));

/**
 * Shortcut for hasOwnProperty with safe.
 * @module native
 * @function
 * @param {object} srcObject
 * @param {string} propName
 * @return {boolean}
 */
export function isObjectPropExists(srcObject, propName) {
    return Object.prototype.hasOwnProperty.call(srcObject, propName);
}
