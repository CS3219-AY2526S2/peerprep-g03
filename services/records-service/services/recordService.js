import { createRecord, getRecordsByUser } from "../repositories/recordRepository.js";

export const createRecordService = async (data) => {
  if (
    !data.user1_id ||
    !data.user2_id ||
    !data.question_text ||
    !data.submitted_code ||
    data.is_correct === undefined
  ) {
    throw new Error("Missing required fields");
  }

  //console.log("[RECORD] Creating record:", data);

  return await createRecord(data);
};

export const getRecordsService = async (user_id) => {
  if (!user_id){
    console.log("[RECORD] User ID is required");
  }
  console.log("[RECORD] Fetching records for user:", user_id);
  return await getRecordsByUser(user_id);
};
