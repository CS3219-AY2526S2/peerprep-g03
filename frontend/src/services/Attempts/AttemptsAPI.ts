import { mockAttemptRecordTableValue } from '../../mocks/data'

// for when go to the attempt info (might need API gateway to separate these to multiple requests)
export async function getAttemptDetail(username: string, timestamp: string){
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
          questionTitle: "ABC",
          submittedSolution: "Submitted solution return by getAttemptDetail",
          suggestedSolution: "Suggested solution return by getAttemptDetail"
      };
}

export async function getAllAttempts(username: string){
      await new Promise((resolve) => setTimeout(resolve, 500));
      data = {attempts: mockAttemptRecordTableValue}
      return {attempts: mockAttemptRecordTableValue};
}

export async function postAttempt(timestamp, user1, user2, questionTitle, solution){
    const users = user2 ? [user1, user2] : [user1];

    const res = await fetch("http://localhost:3004/records/bulk", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            users,
            question_id: questionTitle,
            submitted_code: solution,
            result: { status: "unknown" }
        })
    });

    return res.json();
}
// export async function postAttempt(timestamp, user1, user2, questionTitle, solution){
//     await new Promise((resolve) => setTimeout(resolve, 500));
//     return {status:200};
// }
