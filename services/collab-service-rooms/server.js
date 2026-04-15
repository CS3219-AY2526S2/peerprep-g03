import express from 'express'
import cors from 'cors'
// import { joinMatch, getStatus } from './matchService.js'

import { RoomSessionService } from './services/roomSessionService.js'
import { RoomSessionController } from './controllers/roomSessionController.js'
import { createRoomSessionRoutes } from './routes/roomSessionRoutes.js'

const app = express()
const PORT = 3002 // match service is on 3003, websocket is on 3002

app.use(cors())
app.use(express.json())

// New room session setup
const roomSessionService = new RoomSessionService()
const roomSessionController = new RoomSessionController(roomSessionService)

app.use('/api/room-session', createRoomSessionRoutes(roomSessionController))

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})


