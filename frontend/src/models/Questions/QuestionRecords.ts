import { QuestionDifficulty, QuestionTopic } from './'

export interface QuestionRecords {
    id: string;
    questionTitle: string;
    questionTopic: QuestionTopic;
    questionDifficulty: QuestionDifficulty;
    question?: string;
}