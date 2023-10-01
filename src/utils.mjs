export const useSendMessage = (ws) =>
    (data) => ws.send(JSON.stringify(data));
