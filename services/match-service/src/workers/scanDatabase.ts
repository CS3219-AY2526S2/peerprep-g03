import client, { type RedisClient } from '../config/redis.ts'

export const processAllKeys = async() => {
      const totalKeys = await client.dbSize();
      console.log(`Total keys in database: ${totalKeys}`)
      // await client.del('pool:python:1');
      let cursor = '0';
      try {
        do {


          // SCAN returns a new cursor and a batch of keys
          const reply = await client.scan(cursor, {
            MATCH: '*', // Match all keys
            COUNT: 100 // Process in batches of 2
          });

          cursor = reply.cursor;
          const keys = reply.keys;

          if (keys.length > 0) {
            const results = await Promise.all(
                keys.map(async (key) => {
                  if (key === 'lock:cleanup:running') return {key, type: "lock", value: null};
                  // Use hGetAll because you stored the data with hSet
                  const type = await client.type(key);
                                          let value;

                                          // 2. Use the correct command based on the type
                                          if (type === 'zset') {
                                              // Fetch sorted set members and scores
                                              value = await client.zRangeWithScores(key, 0, -1);
                                          } else if (type === 'hash') {
                                              // Fetch all hash fields and values
                                              value = await client.hGetAll(key);
                                          } else {
                                              // Handle other types (string, list, etc.) if necessary
                                              value = await client.get(key);
                                          }

                                          return { key, type, value };
                })
              );

              results.forEach(({ key, type, value }) => {
                  // Now 'type' is defined and can be used here
                  console.log(`[${type.toUpperCase()}] Key: ${key}, Value:`, value);
              });
          }
        } while (cursor != 0); // Stop when cursor returns to 0
      } catch (err) {
        console.error("Error scanning Redis:", err);
      }
}
