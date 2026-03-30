import express from 'express';
import client from './src/config/redis.ts';
import { MatchRepository } from './src/repositories/match.repositories.ts';
import { MatchService } from './src/services/matchService.ts';
import { MatchController } from './src/controllers/matchController.ts';
import { MatchRoutes } from './src/routes/match.routes.ts';
import { initAllWorker} from './src/workers/compiledWorker.ts';
import cors from 'cors';

const app = express();
app.use(cors({
    origin: /^http:\/\/localhost:51(7|8)\d$/,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));


app.options('/*any', cors());

app.use(express.json());


// Inject dependencies for IOC
const matchRepo = new MatchRepository(client);
const matchService = new MatchService(matchRepo);
const matchController = new MatchController(matchService);
const matchRoutes = new MatchRoutes(matchController);

app.get('/api/ping', (req, res) => {
    console.log("Ping reached the server!");
    res.json({ message: 'pong' });
});
app.use('/api', matchRoutes.router);

initAllWorker(matchService);
const PORT = process.env.PORT || 3050;

app.listen(PORT, () => {
  console.log(`Match Service running on port ${PORT}`);
});
