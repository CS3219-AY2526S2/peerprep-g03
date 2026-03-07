const express = require('express');
const router = express.Router();
const QuestionController = require('../controllers/question.controller');
const { verifyAdmin } = require('../middleware/auth.middleware');


router.get('/', QuestionController.getQuestions);


router.get('/random', QuestionController.getRandomQuestion);
router.get('/:id', QuestionController.getQuestionDetail);

// --- ADMIN PROTECTED ROUTES  ---

// Create a new question
router.post('/', verifyAdmin, QuestionController.createQuestion);

// Update an existing question
router.put('/:id', verifyAdmin, QuestionController.updateQuestion);

// Soft-delete a question (remains in DB for history)
router.delete('/:id', verifyAdmin, QuestionController.deleteQuestion);

module.exports = router;