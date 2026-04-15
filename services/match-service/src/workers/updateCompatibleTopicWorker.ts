import client, { type RedisClient } from '../config/redis.ts'
import cron from 'node-cron';
import axios from 'axios';

export const fetchCompatibleTopic = async () => {
    try {
        /*
         const response = await axios.get('<insert end point here>');
         const data = response.data;
         const multi = client.multi();
         for (const [topic, compatibles] of Object.entries(data)) {
            const key = `compatible_topic:${topic}`;
            // delete existing entries to start afresh
            multi.del(key);
            // own topic is the most compatible
            multi.rPush(key, key)
            // rPush to maintain original array order in Redis List
            if (values.length > 0) {
                multi.rPush(key, values);
                }
            }
            await multi.exec();
            */
            console.log('Companion topic updated successfully');
    } catch (error) {
        console.error('Error fetching or saving companion topic:', error.message)
    }
}
