import { createClient } from 'redis';

const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
})

export type RedisClient = ReturnType<typeof createClient>

// To catch any error event occurring, and log into the console
client.on('error', (err) => console.error("Error with Redis", err));

// connect and export this instance of redis
(async() => {
    await client.connect();
})();

export default client;
