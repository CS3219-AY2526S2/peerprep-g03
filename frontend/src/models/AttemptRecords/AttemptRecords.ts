import { QuestionDifficulty, QuestionTopic } from './Questions'

export interface AllAttemptRecord {
    id: string;
    username: string;
    questionTitle: string;
    questionTopic: QuestionTopic;
    questionDifficulty: QuestionDifficulty;
    time: string;
    collaborator: string | null;
}

export interface IndividualAttemptRecord {
    id: string;
    username: string;
    questionTitle: QuestionTopic;
    time: string;
    suggestedSolution: string;
    userSolution: string;
}