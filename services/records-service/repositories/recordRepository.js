import { pool } from "../db/db.js";

export const createRecord = async (record) => {
  const query = `
    INSERT INTO records 
    (user1_id, user2_id, question_text, submitted_code, is_correct, programming_language, question_topic, difficulty)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const values = [
    record.user1_id,
    record.user2_id,
    record.question_text,
    record.submitted_code,
    record.is_correct,
    record.programming_language,
    record.question_topic,
    record.difficulty,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const getRecordsByUser = async (user_id) => {
  const query = `
    SELECT *
    FROM records
    WHERE user1_id = $1 OR user2_id = $1
    ORDER BY created_at DESC;
  `;

  const result = await pool.query(query, [user_id]);
  return result.rows;
};
