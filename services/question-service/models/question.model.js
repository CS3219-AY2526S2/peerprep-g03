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
            `INSERT INTO questions (title, description, difficulty, topic_tags, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, NOW(), NOW()) 
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
// Retrieve paginated questions
async function getAllQuestions(page = 1, limit = 10) {
  // Calculate how many records to skip
  const offset = (page - 1) * limit;

  // 1. Get the slice of data
  const res = await pool.query(
    "SELECT * FROM questions WHERE is_deleted = FALSE ORDER BY updated_at DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );

  // 2. Get total count (needed for the frontend to know how many pages exist)
  const countRes = await pool.query(
    "SELECT COUNT(*) FROM questions WHERE is_deleted = FALSE"
  );

  return {
    questions: res.rows,
    totalCount: parseInt(countRes.rows[0].count),
    currentPage: page,
    totalPages: Math.ceil(parseInt(countRes.rows[0].count) / limit)
  };
}
// Retrieve a single question by ID
async function getQuestionById(id, adminId = null) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // FOR UPDATE locks the row at the DB level during this transaction
        const questionRes = await client.query(
            "SELECT * FROM questions WHERE id = $1 AND is_deleted = FALSE FOR UPDATE", [id]
        );

        if (questionRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return null;
        }
        const question = questionRes.rows[0];
    
        console.log("-----------------------------------------");
        console.log(`TIME: ${new Date().toLocaleTimeString()}`);
        console.log(`QUERY FOR ID: ${id}`);
        console.log(`DATABASE CURRENT LOCK: ${question?.locked_by}`);
        console.log(`REQUESTING ADMIN: ${adminId}`);
        console.log("-----------------------------------------");
        const lockDurationLimit = 20 * 60 * 1000; // 20 mins
        
        // CHECK: Is it locked by someone else?
        const isLockedByOthers = 
            question.locked_by && 
            String(question.locked_by) !== String(adminId) && 
            (new Date() - new Date(question.locked_at)) < lockDurationLimit;

        if (isLockedByOthers) {
            // CRITICAL: Must rollback before throwing so we don't hang the client
            await client.query('ROLLBACK'); 
            const error = new Error(`Question is currently being edited by ${question.locked_by}`);
            error.code = 'QUESTION_LOCKED';
            error.lockedBy = question.locked_by;
            throw error;
        }

        // If it's free OR locked by ME, refresh the timestamp
        if (adminId) {
            await client.query(
                "UPDATE questions SET locked_by = $1, locked_at = NOW() WHERE id = $2",
                [adminId, id]
            );
        }

        const templatesRes = await client.query(
            "SELECT language, starter_code, solution_code FROM question_templates WHERE question_id = $1", [id]
        );

        await client.query('COMMIT');
        return { ...question, templates: templatesRes.rows };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
async function getQuestionByIdUser(id) {
    const client = await pool.connect();
    try {
        // We still use a transaction because we are performing two dependent SELECTs
        await client.query('BEGIN');

        // 1. Fetch the main question data
        const questionRes = await client.query(
            "SELECT * FROM questions WHERE id = $1 AND is_deleted = FALSE", 
            [id]
        );

        if (questionRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return null;
        }

        const question = questionRes.rows[0];

        // 2. Fetch the related templates (languages, code, etc.)
        const templatesRes = await client.query(
            "SELECT language, starter_code, solution_code FROM question_templates WHERE question_id = $1", 
            [id]
        );

        await client.query('COMMIT');

        // Return combined object
        return { 
            ...question, 
            templates: templatesRes.rows 
        };

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error in getQuestionById:", err);
        throw err;
    } finally {
        client.release();
    }
}
// Update an existing question
async function updateQuestion(id, title, topic, difficulty, description, templates = [], adminId) {
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
        const lockCheck = await client.query(
            "SELECT locked_by FROM questions WHERE id = $1", [id]
        );
        
        const currentLockHolder = lockCheck.rows[0]?.locked_by;

        if (currentLockHolder !== null && String(currentLockHolder) !== String(adminId)) {
            console.error(`Lock Conflict: DB has [${currentLockHolder}], but [${adminId}] tried to save.`);
            throw new Error(`This question is currently being edited by ${currentLockHolder}.`);
        }
        // Update main question metadata
        const res = await client.query(
            `UPDATE questions 
             SET title = $1, topic_tags = $2, difficulty = $3, description = $4,
                 locked_by = NULL, locked_at = NULL, updated_at = NOW()
             WHERE id = $5 AND is_deleted = FALSE
             RETURNING *`,
            [title, Array.isArray(topic) ? topic : [topic], difficulty, description, id]
        );
        console.log(`Question ${id} updated and lock released by ${adminId}`);
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
    "UPDATE questions SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *",
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
  
  //return res.rows[0];
  const row = res.rows[0];
  if (!row) return null;

  return {
    ...row,
    starterCode: row.active_template?.starter_code ?? 'Missing Starter Code',
  };
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
async function releaseQuestionLock(id, adminId) {
    if (!adminId) {
        console.error("Attempted to release lock without adminId");
        return { success: false, message: "No adminId provided" };
    }
    
    const res = await pool.query(
        "UPDATE questions SET locked_by = NULL, locked_at = NULL WHERE id = $1 AND locked_by = $2",
        [id, adminId]
    );

    console.log(`Lock Release Attempt for ID ${id}: ${res.rowCount} row(s) updated.`);
    return { success: res.rowCount > 0 };
}
module.exports = {
    checkDuplicateTitle,
  createQuestion,
  getAllQuestions,
  getQuestionById,
  getQuestionByIdUser,
  updateQuestion,
  deleteQuestion,
  findRandom,
  getAllTopicRelations,
  releaseQuestionLock
};