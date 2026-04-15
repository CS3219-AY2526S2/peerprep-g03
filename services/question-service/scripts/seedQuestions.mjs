import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';

// Use environment variables (same as your app)
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function runSeed() {
    const filePath = path.join(process.cwd(), 'scripts/data/questions.json');
    const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    for (const q of questions) {
        try {
            // 1. Insert into questions table
            const res = await pool.query(
                `INSERT INTO questions (title, description, difficulty, topic_tags) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING id`,
                [q.title, q.description, q.difficulty, q.topic_tags]
            );

            if (res.rows.length > 0) {
                const questionId = res.rows[0].id;
                // 2. Insert templates
                for (const t of q.templates) {
                    await pool.query(
                        `INSERT INTO question_templates (question_id, language, starter_code, solution_code) 
                         VALUES ($1, $2, $3, $4)`,
                        [questionId, t.language, t.starter_code, t.solution_code]
                    );
                }
            }
        } catch (err) {
            console.error(`Failed to seed ${q.title}:`, err.message);
        }
    }
    console.log("Seeding complete!");
    process.exit();
}

runSeed();