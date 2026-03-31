import * as repo from "../repositories/recordRepository.js";

export const createRecord = async (payload) => {
  const record = {
    user_id: payload.user_id,
    question_id: payload.question_id,
    collaborators: payload.collaborators || [],
    submitted_code: payload.submitted_code,
    result: payload.result || null,
  };

  console.log("[SERVICE] Creating record:", record);

  return await repo.createRecord(record);
};

export const getUserRecords = async (user_id) => {
  console.log("[SERVICE] Fetching records for user:", user_id);
  return await repo.getRecordsByUser(user_id);
};

export const getRecord = async (id) => {
  console.log("[SERVICE] Fetching record:", id);
  return await repo.getRecordById(id);
};

export const createBulkRecords = async ({ users, question_id, submitted_code, result }) => {
  const created = [];

  for (const user of users) {
    const collaborators = users.filter(u => u !== user);

    const record = await createRecord({
      user_id: user,
      question_id,
      collaborators,
      submitted_code,
      result,
    });

    created.push(record);
  }

  return created;
};