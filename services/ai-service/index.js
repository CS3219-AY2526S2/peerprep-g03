import 'dotenv/config'; // Modern way to load .env
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { getAiExplanation } from './controllers/ai.controller.js';

const app = express();

// --- 1. ENHANCED CORS ---
// Allows your frontend to talk to this service and handle streaming headers
app.use(cors({
  origin: '*', // Your frontend URL
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-vercel-ai-data-stream']
}));

app.use(express.json());

// --- 2. TRUST PROXY ---
// Required for express-rate-limit to work correctly inside Docker
app.set('trust proxy', 1);

const aiLimiter = rateLimit({
  windowMs: 2000, 
  max: 10, // Increased slightly to allow for UI "jitter"
  message: { message: "Slow down! AI is thinking." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use((req, res, next) => {
    console.log(`Incoming Request: ${req.method} ${req.url}`);
    next();
});
// Apply rate limiter to the AI endpoint
app.post('/api/ai/explain', aiLimiter, getAiExplanation);

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
    console.log(`AI Service (Streaming) listening on port ${PORT}`);
});