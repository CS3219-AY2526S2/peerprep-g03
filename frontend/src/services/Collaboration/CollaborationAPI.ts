export async function getPartner(questionTopic, questionDifficulty, programmingLanguage){
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (questionDifficulty == "Hard") {
        return {partner: null};
    }
    return {partner: "Partner ABC"};
}

export async function getCode(collaborationId) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {code: "Code that partner and I have written"};
}