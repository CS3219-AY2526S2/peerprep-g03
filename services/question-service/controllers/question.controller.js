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
      if (error.code === 'DUPLICATE_TITLE' || error.code === 'DUPLICATE_LANGUAGE') {
        return res.status(409).json({ error: error.message });
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
      if (error.code === 'DUPLICATE_TITLE' || error.code === 'DUPLICATE_LANGUAGE') {
        return res.status(409).json({ error: error.message });
    }
      res.status(500).json({ error: error.message });
    }
  },
  
  getRandomQuestion: async (req, res) => {
    try {

      const { topic, difficulty, language } = req.query;

      const question = await QuestionModel.findRandom(topic, difficulty, language);
      
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
  },

  getTopicRelations: async (req, res) => {
    try {
        const rawData = await QuestionModel.getAllTopicRelations();
        const result = {};

        rawData.forEach(row => {
            // Initialize the key if it doesn't exist
            if (!result[row.main_topic]) {
                result[row.main_topic] = null; 
            }

            // If there's a related topic, add it to the array
            if (row.related_topic !== null) {
                if (result[row.main_topic] === null) {
                    result[row.main_topic] = [row.related_topic];
                } else {
                    result[row.main_topic].push(row.related_topic);
                }
            }
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("Error in Global Topic Map:", error);
        res.status(500).json({ error: error.message });
    }
}


};

module.exports = QuestionController;