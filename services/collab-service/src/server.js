import express from 'express'
import cors from 'cors'
import { joinMatch, getStatus } from './matchService.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.post('/join', (req, res) => { // Create new user
  const result = joinMatch()
  res.json(result)
})

app.get('/status/:userId', (req, res) => {
  const result = getStatus(req.params.userId)

  if (!result) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json(result)
})

app.get('/resume/:userId', (req, res) => { // Resume existing user
  const result = getStatus(req.params.userId)

  if (!result) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json(result)
})

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})