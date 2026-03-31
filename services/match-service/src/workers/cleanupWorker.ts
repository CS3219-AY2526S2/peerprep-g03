import client, { type RedisClient } from '../config/redis.ts'
import cron from 'node-cron';
import { processAllKeys } from './scanDatabase.ts';

export const cleanStaleData = async(matchService) => {
    const lockKey = 'lock:cleanup:running';

    // in case cleaning takes longer than a cron cycle, make sure we dont do overlap cleaning for top few, while neglecting bottom few
    const hasLock = await matchService.matchRepo.redis.set(lockKey, 'true', {
        NX: true,
        EX: 600 // 10-minute expiry safety
    });
     if (!hasLock) return;
        try {

            await processAllKeys();
            await matchService.cleanupAllPools();
        } catch (err) {
            console.error("Cron Cleanup Failed:", err);
        } finally {
            await matchService.matchRepo.redis.del(lockKey);
        }
}
