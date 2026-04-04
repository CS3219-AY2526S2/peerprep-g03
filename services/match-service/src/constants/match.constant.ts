// create Language, Difficulty ad Topic types, so as to help
// construct the DTOs and models, and for type-checking
// via typescript
export const Language = {
    Python : 'Python',
    Java : 'Java',
    Cpp : 'C++'
} as const;

export const Difficulty = {
    Easy : 1,
    Intermediate : 2,
    Hard : 3,
    Any : 2
} as const;

export const MatchStatus = {
    Waiting : "Waiting",
    Success : "Success",
    Timeout : "Timeout",
    Skip : "Skip" // e.g. when users want to go solo
} as const;

export const Topic = {
    Strings : 'Strings',
    Algorithms : 'Algorithms',
    DataStructures : 'Data Structures',
    BitManipulation : 'Bit Manipulation',
    Recursion : 'Recursion',
    Databases : 'Databases',
    Arrays : 'Arrays',
    Brainteaser : 'Brainteaser',
    DynamicProgramming : 'Dynamic Programming'
} as const;
