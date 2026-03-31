import { pool } from "../db/db.js";

export const createRecord = async (record) => {
  const query = `
    INSERT INTO records 
    (user_id, question_id, collaborators, submitted_code, result)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const values = [
    record.user_id,
    record.question_id,
    record.collaborators,
    record.submitted_code,
    record.result,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const getRecordsByUser = async (user_id) => {
  const result = await pool.query(
    "SELECT * FROM records WHERE user_id = $1 ORDER BY created_at DESC",
    [user_id]
  );
  return result.rows;
};

export const getRecordById = async (id) => {
  const result = await pool.query(
    "SELECT * FROM records WHERE id = $1",
    [id]
  );
  return result.rows[0];
};