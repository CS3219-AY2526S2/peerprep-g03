import { Language, Difficulty, Topic, MatchStatus } from '../constants/match.constant.ts'

export interface UserMatchProfile {
        userId: string;
        language: Language;
        topic: Topic;
        difficulty: Difficulty;
        // can delete entries that inactive in redis for too long
        // chose to utilise number instead of Date since Redis does not have a Date datatype
        lastSeen: number;
        // state the shard it is currently present in
        shard: string;
        status: MatchStatus
}

export interface MatchEntry {
        userId: string;
        partnerId?: string;
        sessionId?: string;
}

export interface WaitEntry {
        userId: string;
        topic: Topic;
}
