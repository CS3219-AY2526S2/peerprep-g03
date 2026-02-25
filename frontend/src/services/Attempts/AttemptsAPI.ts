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
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {status:200};
}