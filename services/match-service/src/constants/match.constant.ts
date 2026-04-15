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
    Arrays : 'Arrays',
    Strings : 'Strings',
    HashTables : 'Hash Tables',
    LinkedLists : 'Linked Lists',
    Recursion : 'Recursion', // Specific technique
    DynamicProgramming : 'Dynamic Programming',
    Sorting : 'Sorting',
    Searching : 'Searching',
    Trees : 'Trees',
    Graphs : 'Graphs',
    Heap : 'Heap',
    BitManipulation : 'Bit Manipulation',
    SlidingWindow : 'Sliding Window', // High-frequency pattern
    TwoPointers : 'Two Pointers'      // High-frequency pattern
} as const;
