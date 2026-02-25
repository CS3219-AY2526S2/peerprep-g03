import { mockMultipleQuestionRecords } from '../../mocks/data'

export async function getQuestionDetail(questionId: string){
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (questionId === "aa") {
        return {questionTitle: "Title A", questionTopic: "Dynamic Programming", questionDifficulty: "Easy", question: "Question A by getQuestionDetail", id:"aa", solution: "Solution A by getQuestionDetail"}
    }
    return {questionTitle: "Title B", questionTopic: "Dynamic Programming", questionDifficulty: "Hard", question: "Question B by getQuestionDetail", id:"bb", solution:"Solution B by getQuestionDetail"};
}

export async function getQuestion(questionTitle: string){
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {question: "Question by getQuestion"};
}

export async function deleteQuestion(questionId: string){
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (questionId == "abc") {
        return {status: "404 Not found"}
    }
    return {status: "200 OK"};
}

export async function getSolution(questionTitle: string){
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {solution: "Suggested solution return by getSolution"};
}

export async function getQuestionUser(questionTopic, questionDifficulty){
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {questionTitle: "Title B", question: "Question by getQuestionUser"};
}

export async function createQuestion(questionTitle, questionTopic, questionDifficulty, question, solution) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {status: "200"};
}

export async function updateQuestion(questionId, questionTitle, questionTopic, questionDifficulty, question, solution) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {status: "200"};
}

export async function getQuestions(username:string){
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (username == "user01") {
        return {status: "401 Unauthorised"}
    }
    return {status: "200 OK", data : {questions: mockMultipleQuestionRecords}}
}







