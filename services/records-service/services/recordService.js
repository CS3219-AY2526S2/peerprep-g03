import { createRecord, getRecordsByUser, getRecordById } from "../repositories/recordRepository.js";

import fetch from 'node-fetch'; // or axios if you prefer

const getUsersByUsernames = async (usernames) => {
  if (!usernames || usernames.length === 0) return [];

  // Join usernames with commas for the query string
  const query = usernames.join(",");
  const url = `http://user-service:3000/auth/usernames?usernames=${encodeURIComponent(query)}`;

  const res = await fetch(url); // GET request with query parameters only

  if (!res.ok) {
    throw new Error(`User service returned ${res.status}`);
  }

  const data = await res.json();
  return data;
};

export const createRecordService = async (data) => {
  if (
    !data.user1_id ||
    !data.user2_id ||
    !data.user1_username ||
    !data.user2_username ||
    !data.question_text ||
    !data.submitted_code
  ) {
    throw new Error("Missing required fields");
  }

  const users = await getUsersByUsernames([data.user1_username, data.user2_username]);

  const user1 = users.find(u => u.username === data.user1_username.toLowerCase());
  const user2 = users.find(u => u.username === data.user2_username.toLowerCase());

  if (!user1 || !user2) {
    throw new Error("User not found");
  }

  const recordPayload = {
    ...data,
    user1_id: user1.id,
    user2_id: user2.id,
  };


  return await createRecord(recordPayload);
};

export const getRecordsService = async (user_id) => {
  if (!user_id){
    console.log("[RECORD] User ID is required");
  }
  console.log("[RECORD] Fetching records for user:", user_id);
  return await getRecordsByUser(user_id);
};

export const fetchRecordById = async (id) => {
  return await getRecordById(id);
};