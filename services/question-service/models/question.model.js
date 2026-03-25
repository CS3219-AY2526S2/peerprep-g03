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
async function createQuestion(title, topic, difficulty, description, templates = []) {
    const topicArray = Array.isArray(topic) ? topic : [topic];
    const isDuplicate = await checkDuplicateTitle(title);
    
    if (isDuplicate) {
        const error = new Error("Duplicate title found.");
        error.code = 'DUPLICATE_TITLE';
        throw error;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insert into questions table
        const questionRes = await client.query(
            `INSERT INTO questions (title, description, difficulty, topic_tags) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [title, description, difficulty, topicArray]
        );
        const newQuestion = questionRes.rows[0];

        // Insert templates if any exist
        if (templates && templates.length > 0) {
            for (const template of templates) {
                await client.query(
                    `INSERT INTO question_templates (question_id, language, starter_code, solution_code)
                     VALUES ($1, $2, $3, $4)`,
                    [newQuestion.id, template.language, template.starter_code, template.solution_code]
                );
            }
        }

        await client.query('COMMIT');
        return { ...newQuestion, templates };
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
        // Check which constraint was violated
        if (err.constraint === 'questions_title_key' || err.constraint === 'idx_unique_active_title') {
            const error = new Error("This question title already exists.");
            error.code = 'DUPLICATE_TITLE';
            throw error;
        }
        if (err.constraint === 'question_templates_question_id_language_key') {
            const error = new Error("You have already added a template for this language.");
            error.code = 'DUPLICATE_LANGUAGE';
            throw error;
        }
    }
        throw err;
    } finally {
        client.release();
    }
}
// Retrieve all questions (that aren't soft-deleted)
async function getAllQuestions() {
  const res = await pool.query(
    "SELECT * FROM questions WHERE is_deleted = FALSE ORDER BY created_at DESC"
  );
  return res.rows;
}

// Retrieve a single question by ID
// Updated getQuestionById
async function getQuestionById(id) {
    const questionRes = await pool.query(
        "SELECT * FROM questions WHERE id = $1 AND is_deleted = FALSE", [id]
    );
    const templatesRes = await pool.query(
        "SELECT language, starter_code, solution_code FROM question_templates WHERE question_id = $1", [id]
    );

    if (questionRes.rows.length === 0) return null;

    return {
        ...questionRes.rows[0],
        templates: templatesRes.rows
    };
}
// Update an existing question
async function updateQuestion(id, title, topic, difficulty, description, templates = []) {
    const topicArray = Array.isArray(topic) ? topic : [topic];
    const isDuplicate = await checkDuplicateTitle(title, id);
    
    if (isDuplicate) {
        const error = new Error("Duplicate title found");
        error.code = 'DUPLICATE_TITLE';
        throw error;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Update main question metadata
        const res = await client.query(
            `UPDATE questions 
             SET title = $1, topic_tags = $2, difficulty = $3, description = $4
             WHERE id = $5 AND is_deleted = FALSE
             RETURNING *`,
            [title, topicArray, difficulty, description, id]
        );

        if (res.rows.length === 0) throw new Error("Question not found");

        // Refresh templates: Delete existing ones and re-insert current set
        await client.query("DELETE FROM question_templates WHERE question_id = $1", [id]);

        if (templates && templates.length > 0) {
            for (const template of templates) {
                await client.query(
                    `INSERT INTO question_templates (question_id, language, starter_code, solution_code)
                     VALUES ($1, $2, $3, $4)`,
                    [id, template.language, template.starter_code, template.solution_code]
                );
            }
        }

        await client.query('COMMIT');
        return { ...res.rows[0], templates };
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
        // Check which constraint was violated
        if (err.constraint === 'questions_title_key' || err.constraint === 'idx_unique_active_title') {
            const error = new Error("This question title already exists.");
            error.code = 'DUPLICATE_TITLE';
            throw error;
        }
        if (err.constraint === 'question_templates_question_id_language_key') {
            const error = new Error("You have already added a template for this language.");
            error.code = 'DUPLICATE_LANGUAGE';
            throw error;
        }
    }
        throw err;
    } finally {
        client.release();
    }
}
// Soft delete a question
async function deleteQuestion(id) {
  const res = await pool.query(
    "UPDATE questions SET is_deleted = TRUE WHERE id = $1 RETURNING *",
    [id]
  );
  return res.rows[0];
}

async function findRandom(topic, difficulty, language) {
  const res = await pool.query(
    `SELECT q.*, 
        JSON_BUILD_OBJECT(
            'language', qt.language, 
            'starter_code', qt.starter_code, 
            'solution_code', qt.solution_code
        ) AS active_template
     FROM questions q
     INNER JOIN question_templates qt ON q.id = qt.question_id
     WHERE $1 = ANY(q.topic_tags) 
       AND q.difficulty = $2 
       AND qt.language = $3  
       AND q.is_deleted = FALSE 
     ORDER BY RANDOM() 
     LIMIT 1`,
    [topic, difficulty, language]
  );
  
  return res.rows[0];
}
async function getAllTopicRelations() {
    const query = `
        WITH UniqueTopics AS (
            -- Get every unique topic that exists in the DB
            SELECT DISTINCT UNNEST(topic_tags) as topic 
            FROM questions 
            WHERE is_deleted = FALSE
        ),
        TopicPairs AS (
            -- Get all actual pairings
            SELECT t1.topic AS main, t2.topic AS related
            FROM (SELECT id, UNNEST(topic_tags) as topic FROM questions WHERE is_deleted = FALSE) t1
            JOIN (SELECT id, UNNEST(topic_tags) as topic FROM questions WHERE is_deleted = FALSE) t2 
              ON t1.id = t2.id AND t1.topic != t2.topic
        )
        SELECT 
            ut.topic AS main_topic, 
            tp.related AS related_topic, 
            COUNT(tp.related)::int as occurrence_count
        FROM UniqueTopics ut
        LEFT JOIN TopicPairs tp ON ut.topic = tp.main
        GROUP BY ut.topic, tp.related
        ORDER BY ut.topic ASC, occurrence_count DESC;
    `;

    const res = await pool.query(query);
    return res.rows;
}

module.exports = {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  findRandom,
  getAllTopicRelations
};