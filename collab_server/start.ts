import http from "http"
import { WebSocketServer } from "ws"
import { setupWSConnection } from "y-websocket/bin/utils.cjs"

const port = 1234

const server = http.createServer()
const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  setupWSConnection(ws, req)
  console.log('CLIENT::CONNECTED')

  ws.on('message', msg => console.log('CLIENT::MESSAGE', msg))
  ws.on('close', () => console.log('CLIENT::DISCONNECTED'))
})

server.listen(port, () => {
  console.log(`YJS WebSocket server running at ws://localhost:${port}`)
})