import cron from 'node-cron';
import { cleanStaleData } from './cleanupWorker.ts';
import { fetchCompatibleTopic } from './updateCompatibleTopicWorker.ts';
import { processAllKeys } from './scanDatabase.ts';
import client, { type RedisClient } from '../config/redis.ts'

export const initAllWorker = (matchService) => {


    // Run this workers once when the microservice starts
    fetchCompatibleTopic()
    cleanStaleData(matchService)

    cron.schedule('*/20 * * * * *', async () => {
        await processAllKeys();
    });


    // to run cron every minutes to clean up the database
    cron.schedule('* * * * *', async() =>
    {
        cleanStaleData(matchService)
    })


    // to run fetching compatibility at 3am everyday
    cron.schedule('0 5 * * *', async() =>
    {
        fetchCompatibleTopic()
    })
}
