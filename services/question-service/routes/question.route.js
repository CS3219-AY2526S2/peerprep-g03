const express = require('express');
const router = express.Router();
const QuestionController = require('../controllers/question.controller');
const { verifyAdmin } = require('../middleware/auth.middleware');
// 1. Static/Specific GET routes (No parameters)
router.get('/topic-relations', QuestionController.getTopicRelations);
router.get('/random', QuestionController.getRandomQuestion);
router.get('/', QuestionController.getQuestions);

// 2. Prefixed Dynamic routes
router.get('/user/:id', QuestionController.getQuestionDetailUser);

// 3. General Dynamic routes (The "ID" routes)
// Place these at the bottom of the GET section
router.get('/:id', verifyAdmin, QuestionController.getQuestionDetail);

// --- ADMIN PROTECTED ROUTES (POST/PUT/DELETE) ---
// These usually don't conflict with GET routes, but keep them grouped
router.post('/', verifyAdmin, QuestionController.createQuestion);
router.put('/:id', verifyAdmin, QuestionController.updateQuestion);
router.post('/:id/unlock', verifyAdmin, QuestionController.unlockQuestion);
router.delete('/:id', verifyAdmin, QuestionController.deleteQuestion);

module.exports = router;