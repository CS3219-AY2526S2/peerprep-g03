import { AllAttemptRecord, QuestionTopic, QuestionDifficulty } from '../../../models'

export const mockAttemptRecordTableValue: AllAttemptRecord[] = [
    { id: "16 Dec 2025 15:00:00", username: "user1", questionTitle: "question1", questionTopic: QuestionTopic.Brainteaser , questionDifficulty:  QuestionDifficulty.Easy },
    { id: "11 Feb 2026 17:00:00" , username: "user1", questionTitle: "question2", questionTopic: QuestionTopic.DynamicProgramming , questionDifficulty:  QuestionDifficulty.Hard, collaborator: "user2"}
];