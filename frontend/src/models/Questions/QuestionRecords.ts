import { QuestionDifficulty, QuestionTopic } from './'

export interface QuestionRecords {
    id: string;
    title: string;              // Changed from questionTitle to match table/DB
    topic_tags: string | string[]; // Migrate to an array of QuestionTopic later
    difficulty: QuestionDifficulty;
    description?: string;        // Matches DB key 'description'
    solution?: string;
}