import type { UserMatchProfile, MatchEntry } from '../models/match.models.ts'
import { Language, Difficulty, Topic, MatchStatus } from '../constants/match.constant.ts'

function getShardAddress(language, difficulty) {
    const diffValue = typeof difficulty === 'string'
        ? Difficulty[difficulty]
        : difficulty;
    return `pool:${language.toLowerCase()}:${diffValue}`
}

export class MatchRepository {
    private readonly redis;


    constructor(redis) {
        this.redis = redis;
    }

    async addNewUser(user:UserMatchProfile):Promise<void> {
        // should check if the user already exists, and if so
        // delete the user first and then retried the addUser
        const userId = user.userId;
        const hasLock = await this.acquireLock(userId)
        if (!hasLock) return false; // exit early as someone already acquire the locks

        try {
            await this.internalRemoveUser(userId);
            const transaction = this.redis.multi();
            transaction.hSet(`user:${userId}`, user);

            // To update entry to appropriate shard as well
            const results = await transaction.exec(); // ensure atomicity
            return results !== null;
        } finally {
            // release lock even if code to crash to prevent permanent deadlock
            await this.releaseLock(userId);
        }
    }

    async getUser(userId: string): Promise<UserMatchProfile | null> {
        const data = await this.redis.hGetAll(`user:${userId}`);
        // since Redis will return an en empty object is no such empty
        // the return statement would check if the data contains any field
        // and if data does not contain any field, would return null
        if (Object.keys(data).length  === 0) return null;

        // do proper typecasting since and conversions since Redis return everything as string
        return {
            userId: data.userId,
            language: data.language as Language,
            topic: data.topic as Topic,
            difficulty: data.difficulty as Difficulty,
            lastSeen: Number(data.lastSeen),
            status: data.status as MatchStatus
        };
    }

    // if remove successful, would return True, however if transaction
    // has aborted would return false
    async internalRemoveUser(userId: string):Promise<boolean> {
        // see which shard we need to go to to delete the userEntries
        const userProfile = await this.redis.hGetAll(`user:${userId}`);

        if (!userProfile || Object.keys(userProfile).length === 0) return true; // if there is no such entry, then technically already removed

        // use transaction to create atomic operations
        const transaction = this.redis.multi();
        transaction.del(`user:${userId}`);
        transaction.del(`match:result:${userId}`);
        transaction.zRem(getShardAddress(userProfile.language, userProfile.difficulty), userProfile.userId)
        const results = await transaction.exec(); // ensure atomicity
        return results !== null;
    }

    // removeUser utilised lock, while internalRemovalUser do not utilised lock
    // internalRemovalUser used in instances like addNewUser when lock was already acquired
    async removeUser(userId: string): Promise<boolean> {
        // utilise early exit to prevent the backlog of operations that it need to do +
        // simplify logic as well
        // const hasLock = await this.acquireLock(userId)
        // if (!hasLock) return false; // exit early as someone already acquire the locks
        try {
            await this.internalRemoveUser(userId);
            return true;
        } finally {
            // release lock even if code to crash to prevent permanent deadlock
            // await this.releaseLock(userId);
        }
    }

    async removeInactiveUser(userId: string): Promise<boolean> {
        const userProfile = await this.redis.hGetAll(`user:${userId}`);

        // if user profile exists, user is still active
        if (userProfile && Object.keys(userProfile).length > 0) {
            return false;
        }
        try {
            const removed = await this.removeUser(userProfile.userId);
            return removed;
        } catch (error) {
            console.error(`Failed to cleanup inactive user ${userId}:`, error);
            return false;
       }
    }



    async acquireLock(userId: string, ttlMs: number = 5000):Promise<boolean> {
        const lockKey = `lock:user:${userId}`;

        // using NX would ensure that lock is only created if does not exist beforehand
        // result is "OK" if acquired lock (lock didn't exits beforehand).
        // result would not return "OK" if never acquired lock (lock already exist)
        // set PX to delete the lock after some expiration; prevents deadlock
        // where Server crash and we did not release the lock
        const result = await this.redis.set(lockKey, 'locked', {
            NX: true,
            PX:ttlMs
        });
        return result === "OK";
    }

    async releaseLock(userId: string): Promise<void> {
        // Since we delete this lock, lock no longer exists ->
        // it allow us to create a new entry and acquire the lock in the future
        await this.redis.del(`lock:user:${userId}`);
    }


}
