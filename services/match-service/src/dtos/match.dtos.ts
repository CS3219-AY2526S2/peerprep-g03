import { Language, Difficulty, Topic, MatchStatus } from '../constants/match.constant.ts'

export interface CancelMatchResponseDTO {
    status: 'success' | 'error';
    // human-readable message to display in FE for user feedback
    message: string;
}

export interface CancelMatchRequestDTO {
    userid: string;
}

export interface FindMatchRequestDTO {
    userId: string;
    language: Language;
    topic: Topic;
    difficulty: Difficulty;
}

export interface FindMatchResponseDTO {
    status: MatchStatus;
    partnerId: string | null;
    sessionId: string | null // to establish the socket connection
}
