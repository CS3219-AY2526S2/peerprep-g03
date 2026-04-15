import { QuestionRecords, QuestionDifficulty, QuestionTopic } from '../../../models'

export const mockMultipleQuestionRecords: QuestionRecords[] = [
    { id: "aa", questionTitle: "Question 1", questionTopic: QuestionTopic.Brainteaser , questionDifficulty:  QuestionDifficulty.Easy },
    { id: "bb", questionTitle: "Question 2", questionTopic: QuestionTopic.DynamicProgramming , questionDifficulty:  QuestionDifficulty.Hard },
    { id: "cc", questionTitle: "Question 3", questionTopic: QuestionTopic.Brainteaser , questionDifficulty:  QuestionDifficulty.Hard },
    { id: "dd", questionTitle: "Question 4", questionTopic: QuestionTopic.DynamicProgramming , questionDifficulty:  QuestionDifficulty.Hard },
    { id: "ee", questionTitle: "Question 5", questionTopic: QuestionTopic.Brainteaser , questionDifficulty:  QuestionDifficulty.Easy },
    { id: "ff", questionTitle: "Question 6", questionTopic: QuestionTopic.DynamicProgramming , questionDifficulty:  QuestionDifficulty.Hard },
];
