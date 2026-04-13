import { createServer } from "http";
import ws from 'ws';
const WebSocketServer = ws["module.exports"].Server;
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { setupWSConnection } = require("./node_modules/y-websocket/bin/utils.cjs");

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
    setupWSConnection(ws, req);
});

server.listen(1234, () => {
    console.log("y-websocket server running on port 1234");
});