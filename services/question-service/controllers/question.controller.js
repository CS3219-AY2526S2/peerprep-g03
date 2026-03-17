const QuestionModel = require('../models/question.model');

const QuestionController = {

  createQuestion: async (req, res) => {
    try {
      const { 
        title, 
        topic, 
        difficulty, 
        description, 
        templates // This is the array containing {language, starter_code, solution_code}
      } = req.body;

      const newQuestion = await QuestionModel.createQuestion(
        title, 
        topic, 
        difficulty, 
        description, 
        templates 
      );
      
      res.status(201).json(newQuestion);
    } catch (error) {
      if (error.code === 'DUPLICATE_TITLE') {
        return res.status(409).json({ error: "Duplicate title. Please choose other title." });
      }
      res.status(500).json({ error: error.message });
    }
  },

  getQuestions: async (req, res) => {
    try {
     
      const questions = await QuestionModel.getAllQuestions();
      res.status(200).json(questions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },


  getQuestionDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const question = await QuestionModel.getQuestionById(id);
      if (!question) return res.status(404).json({ message: "Question not found" });
      res.status(200).json(question);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateQuestion: async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        title, 
        topic, 
        difficulty, 
        description, 
        templates 
      } = req.body;

      const updatedQuestion = await QuestionModel.updateQuestion(
        id, 
        title, 
        topic, 
        difficulty, 
        description, 
        templates 
      );
      
      if (!updatedQuestion) return res.status(404).json({ message: "Question not found" });
      res.status(200).json(updatedQuestion);
    } catch (error) {
      if (error.code === 'DUPLICATE_TITLE') {
        return res.status(409).json({ error: "Duplicate title. Please choose other title." });
      }
      res.status(500).json({ error: error.message });
    }
  },
  
  getRandomQuestion: async (req, res) => {
    try {

      const { topic, difficulty } = req.query;

      const question = await QuestionModel.findRandom(topic, difficulty);
      
      if (!question) {
        return res.status(404).json({ message: "No questions found for this topic and difficulty" });
      }

      res.status(200).json(question);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deleteQuestion: async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Attempting to delete ID:", id);
      // Updated to match our model's function name: deleteQuestion
      const deleted = await QuestionModel.deleteQuestion(id);
      
      if (!deleted) return res.status(404).json({ message: "Question not found" });
      res.status(200).json({ message: "Question soft-deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = QuestionController;