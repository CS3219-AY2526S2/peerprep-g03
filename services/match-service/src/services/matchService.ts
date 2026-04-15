
import { match } from 'node:assert';
import { Difficulty, Language } from '../constants/match.constant.ts'
const levels = Object.keys(Difficulty) as (keyof typeof Difficulty)[];
const languages = Object.values(Language);


function getDifficultyValue(key:string): number | undefined {
      if (!(key in Difficulty)) {
        throw new Error(`Invalid difficulty key: "${key}". Expected one of: ${Object.keys(Difficulty).join(", ")}`);
      }
        return Difficulty[key];
}


function isDifficultyCompatible(difficultyA, difficultyB) {
    return Math.abs(difficultyA - difficultyB)
}

// Does not matter whether topic is the same as long as topic is compatible
// rationale: there would still be questions that best fulfil both party interest
// no point finding exact match, which delay search and increase chance of backlog
function isTopicCompatible(topicA, topicB) {
    console.log("Compatible",topicA === topicB )
    return topicA === topicB; // to remove this later
}

function getShardAddress(language, difficulty) {
    // if it is string, convert to numerical value
    // if numerical value, then used it as it is
    const diffValue = typeof difficulty === 'string'
        ? Difficulty[difficulty]
        : difficulty;
    return `pool:${language.toLowerCase()}:${diffValue}`
}


export class MatchService {
     private readonly matchRepo;

     constructor(matchRepo) {
         this.matchRepo = matchRepo;
     }


    findMatchService = async (userId, language, topic, difficulty) => {
        try {
            console.log("Receiver from endpoint", userId, language, topic, difficulty)
            // still save userId as a value so that we can return userId tgt with rest of field easily
            // simplify return logic
            const result = await this.matchRepo.redis.hSet(`user:${userId}`, {
                userId: userId,
                topic: topic,
                difficulty: difficulty,
                language: language,
                status: 'searching',
                joinedAt: Date.now()
            })

            if (result === 0) {
                const error = new Error("Duplicate request");
                error.statusCode = 409; // Conflict
                throw error;
            }

            await this.matchRepo.redis.expire(`user:${userId}`, 120); // automatically delete after 2 min
            await this.matchRepo.redis.zAdd(getShardAddress(language,difficulty), { score: Date.now(), value: userId})

            const poolPrefix = `pool:${language.toLowerCase()}`;
            // assume that there is more demand for easy than hard --> so would match easy before hard
            // would always put own difficulty level first so can prioritise searching own difficulty level first
            // intermediate and any currently have same priority level
            const shards = (difficulty === "Any" || difficulty === "Intermediate")
                ? [`${poolPrefix}:${Difficulty.Intermediate}`, `${poolPrefix}:${Difficulty.Easy}`,`${poolPrefix}:${Difficulty.Hard}` ]
                : (difficulty === "Easy")
                ? [`${poolPrefix}:${Difficulty.Easy}`, `${poolPrefix}:${Difficulty.Intermediate}`]
                : [`${poolPrefix}:${Difficulty.Hard}`, `${poolPrefix}:${Difficulty.Intermediate}`]

            // search for users that are active within the last 45 seconds
            const heartbeatThreshold = Date.now() - 45000;

            let potentialPartner = null;
            let partnerData = null;
            // Within the redis sorted set (ZSet), the value is timestamp of when they are last seen
            // Want to get users who have been last seen at most 45 seconds ago, in case some people have logged out

            for(const shard of shards) {
                // (heartbeatThreshold, '+inf') => means to search from 15 seconds ago until now
                // (LIMIT, 0, 20) => implement bounded scanning to 20 candidates for each shard
                // so can quickly move on to next candidate if search cannot be found
                const candidates = await this.matchRepo.redis.zRange(shard, heartbeatThreshold, '+inf', {
                    BY: 'SCORE',
                    LIMIT: {
                        offset: 0,
                        count: 20
                    }
                });



                for(const pId of candidates) {

                    if (pId == userId) continue;
                    // retrieve all fields and values from the Redis Hash
                    const partner = await this.matchRepo.redis.hGetAll(`user:${pId}`)

                    // defensive coding in case user match profile is missing, but still found in shard
                    if(!partner || Object.keys(partner).length === 0) continue;

                    if (isTopicCompatible(topic, partner.topic)) {
                        potentialPartner = pId
                        partnerData = partner;
                        break; // break inner loop
                    }

                }
                if(potentialPartner) break; // break the outer loop
            }


             if (potentialPartner) {
                try {

                    const matchId = this.generateMatchId();
                    // WATCH helps to implement optimistic locking; can only successful
                    // modify the existing data, if no one else touches these data before
                    // .exec() run. if someone modified or delete the watched keys before
                    // .exec() run, then we would abort transaction and return null
                    await this.matchRepo.redis.watch(`user:${userId}`, `user:${potentialPartner}`)
                    const status = await this.matchRepo.redis.hGet(`user:${potentialPartner}`, 'status')

                    // Just in case status changed from searching to matching before we ran WATCH command
                    if (status !== 'searching') {
                        await this.matchRepo.redis.unwatch();
                        return {status:'searching', partnerId:null}
                    }

                    // Update status to match, remove only the specific shards from partner, and place it in mailbox
                    const result = await this.matchRepo.redis.multi()
                        .hSet(`user:${potentialPartner}`, 'status', 'matched')
                        .hSet(`user:${userId}`, 'status', 'matched')
                        .zRem(getShardAddress(language, difficulty), potentialPartner)
                        .zRem(getShardAddress(partnerData.language, partnerData.difficulty), potentialPartner)
                        .setEx(`match:result:${potentialPartner}`, 30,  JSON.stringify({
                            partnerId: userId,
                            matchId
                        }))
                        .setEx(`match:result:${userId}`, 30,  JSON.stringify({
                            partnerId: potentialPartner,
                            matchId
                        }))
                        .exec();
                    // calling exec() successfully would clear all the watch key
                    // Note: the match:result here would act as the mailbox for user
                    // to temporary find the partnerId (just keep them for 30 seconds)
                    // would use a socketIO connection afterwards

                    // failed transaction as watch key have changed
                    if (result == null) {
                        return {status:'searching', partnerId:null}
                    }

                    return {status: 'matched', partnerId: potentialPartner, matchId: matchId}; //potential partner
                    } catch(err) {
                        await this.matchRepo.redis.unwatch()
                        throw err;
                    }
                }

                return {status:'searching', partnerId:null}




        } catch (error) {
            // To implement
        }
    }

    cleanupAllPools = async() => {
        for (const lang of languages) {
            for (const level of levels) {
                const poolKey = getShardAddress(lang, level)
                await this.processPoolCleanup(poolKey, lang, level);
            }
        }
    }

    processPoolCleanup = async(poolKey, lang, level):Promise<void> => {
        let cursor = '0';

        do {
            // 1. Get a batch of userIds from the specific pool shard
            const reply = await this.matchRepo.redis.zScan(poolKey, cursor, { COUNT: 100 });
            cursor = reply.cursor;
            const userIds = reply.members;

            if (userIds.length > 0) {
                const pipeline = this.matchRepo.redis.multi();

                    // 2. Queue EXISTS checks for each user
                    userIds.forEach(id => {
                        pipeline.exists(`user:${id}`);
                    });

                    // 3. Execute as a pipeline
                    // results will be an array of numbers (1 for exists, 0 for not)
                    const results = await pipeline.execAsPipeline();

                    const toDelete: string[] = [];
                    results.forEach((exists, index) => {
                        // In node-redis v4, exists returns 1 (true) or 0 (false)
                        if (exists === 0) {
                            toDelete.push(userIds[index]);
                        }
                    });

                    // 4. Batch remove from ZSET if any are stale
                    if (toDelete.length > 0) {
                        // node-redis supports passing an array for variadic arguments in many commands
                        const idsOnly = toDelete.map(item => item.value);
                        await this.matchRepo.redis.zRem(poolKey, ...idsOnly);
                        console.log(`Removed ${toDelete.length} stale users from ${poolKey}`);
                    }
            }
        } while (cursor != 0);
    }
    scanAndCleanup = async(count: number = 100): Promise<void> => {
        let cursor = '0';
        do {
            // Change 'nextCursor' to 'cursor'
            const reply = await this.matchRepo.redis.scan(cursor, {
                MATCH: 'user:*',
                COUNT: count
            });

            // Update the cursor using the correct property name
            cursor = reply.cursor;
            const keys = reply.keys;

            if (keys.length > 0) {
                const cleanupPromises = keys.map(async (key) => {
                    const userId = key.split(':')[1];

                    if (userId) {
                        await this.matchRepo.removeInactiveUser(userId);
                    }
                });
                await Promise.all(cleanupPromises);
            }

        } while (cursor != 0);
    }

    generateMatchId() {
        return `match-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    }

    pollMatchStatus = async (userId) => {
        try {

            const [ userData, matchPartnerId] = await Promise.all([this.matchRepo.redis.hGetAll(`user:${userId}`), this.matchRepo.redis.get(`match:result:${userId}`)]);
            if(!userData || Object.keys(userData).length === 0) {
                return {status: 'expired', message: 'Session times out. Please retry.'};
            }

            // if (matchPartnerId) {
            //     return {
            //         status: 'matched',
            //         partnerId: matchPartnerId,
            //         message: 'Partner found'
            //     }
            // }

    if (matchPartnerId) {
        const parsed = JSON.parse(matchPartnerId);
        console.log("Match Partner Id", parsed)

        return {
            status: 'matched',
            partnerId: parsed.partnerId,
            matchId: parsed.matchId,   // ✅ SAME matchId
            message: 'Partner found'
        }
    }



            await this.matchRepo.redis.zAdd(getShardAddress(userData.language,userData.difficulty), { score: Date.now(), value: userId})
            //  update the active shard, so would remain the top of the serac



            return {status: userData.status, userId: userId};
        } catch (error) {
            console.error("Poll error:", error);
            return {status: 'error'};
        }
    }


    cancelMatchService = async (userId) => {
        try {
            console.log("Cancel Match Service", userId)
            await this.matchRepo.removeUser(userId)
            return {status: "success"}
        } catch (error) {
            throw error;
        }
    }
}
