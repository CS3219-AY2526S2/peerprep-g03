const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function checkDuplicateTitle(title, excludeId = null) {
    let query = `SELECT * FROM questions WHERE title = $1 AND is_deleted = FALSE`;
    const params = [title];

    if (excludeId) {
        query += ` AND id != $2`;
        params.push(excludeId);
    }

    const res = await pool.query(query, params);
    return res.rows.length > 0;
}

// Create a new question
async function createQuestion(title, topic, difficulty, description, solution) {
  const topicArray = Array.isArray(topic) ? topic : [topic];
  const isDuplicate = await checkDuplicateTitle(title);
  if (isDuplicate) {
        const error = new Error("Duplicate title found");
        error.code = 'DUPLICATE_TITLE';
        throw error;
    }
  const res = await pool.query(
    `INSERT INTO questions (title, description, difficulty, topic_tags, solution) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING *`,
    // Note: topicArray is passed to $4
    [title, description, difficulty, topicArray, solution]
  );
  return res.rows[0];
}

// Retrieve all questions (that aren't soft-deleted)
async function getAllQuestions() {
  const res = await pool.query(
    "SELECT * FROM questions WHERE is_deleted = FALSE ORDER BY created_at DESC"
  );
  return res.rows;
}

// Retrieve a single question by ID
async function getQuestionById(id) {
  const res = await pool.query(
    "SELECT * FROM questions WHERE id = $1 AND is_deleted = FALSE",
    [id]
  );
  return res.rows[0];
}

// Update an existing question
async function updateQuestion(id, title, topic, difficulty, description, solution) {
  const isDuplicate = await checkDuplicateTitle(title, id);
  if (isDuplicate) {
        const error = new Error("Duplicate title found");
        error.code = 'DUPLICATE_TITLE';
        throw error;
    }
  const res = await pool.query(
    `UPDATE questions 
     SET 
        title = COALESCE($1, title), 
        topic_tags = COALESCE($2, topic_tags), 
        difficulty = COALESCE($3, difficulty), 
        description = COALESCE($4, description), 
        solution = COALESCE($5, solution)
     WHERE id = $6 AND is_deleted = FALSE
     RETURNING *`,
    [title, topic, difficulty, description, solution, id]
  );
  return res.rows[0];
}

// Soft delete a question
async function deleteQuestion(id) {
  const res = await pool.query(
    "UPDATE questions SET is_deleted = TRUE WHERE id = $1 RETURNING *",
    [id]
  );
  return res.rows[0];
}

async function findRandom(topic, difficulty) {
  const res = await pool.query(
    `SELECT * FROM questions 
     WHERE $1 = ANY(topic_tags) 
     AND difficulty = $2 
     AND is_deleted = FALSE 
     ORDER BY RANDOM() 
     LIMIT 1`,
    [topic, difficulty]
  );
  return res.rows[0];
}

module.exports = {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  findRandom
};