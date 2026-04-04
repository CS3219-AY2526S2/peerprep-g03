
import axios from 'axios';
const API_URL = 'http://localhost:3001/api/questions';

export async function getQuestionDetail(questionId: string){
    const response = await axios.get(`${API_URL}/${questionId}`);
    return response.data;
}

export async function getQuestion(questionTitle: string){
    const response = await axios.get(`${API_URL}/title/${questionTitle}`);
    return response.data;
}

export async function deleteQuestion(questionId: string){
    await new Promise((resolve) => setTimeout(resolve, 500));
    const token = localStorage.getItem('JWToken'); 
    const response = await axios.delete(`${API_URL}/${questionId}`, { 
            headers: { 
                // Must match the "Bearer <token>" format expected by middleware
                'Authorization': `Bearer ${token}` 
            } 
        } );
    return response.data;
}

export async function getSolution(questionTitle: string){
    return {solution: "Suggested solution return by getSolution"};
}

export async function getQuestionUser(questionTopic: string, questionDifficulty: string, questionLanguage:string){
    try {
        const response = await axios.get(`${API_URL}/random`, {
            params: { topic: questionTopic, difficulty: questionDifficulty, language: questionLanguage.toLowerCase() }
        });
        return response.data;
       } catch (error) {
           throw error;
       }
}

export async function createQuestion(questionTitle, questionTopic, questionDifficulty, question, templates) {
    const token = localStorage.getItem('JWToken'); 
    const response = await axios.post(API_URL, {
        title: questionTitle,
        topic: questionTopic,
        difficulty: questionDifficulty,
        description: question,
        templates: templates
    },
    { 
            headers: { 
                // Must match the "Bearer <token>" format expected by middleware
                'Authorization': `Bearer ${token}` 
            } 
        } 
);
    return response.data;
}

// Use destructuring in the function signature
export async function updateQuestion({ id, title, topic, difficulty, description, templates}) {
    const token = localStorage.getItem('JWToken'); 

    // Ensure topic is an array before sending to the Backend
    const topicArray = Array.isArray(topic) ? topic : [topic];

    const response = await axios.put(
        `${API_URL}/${id}`, 
        { 
            title, 
            topic: topicArray, // Send ["Strings"] instead of "Strings"
            difficulty, 
            description, 
            templates
        }, 
        { 
            headers: { 'Authorization': `Bearer ${token}` } 
        }
    );
    return response.data;
}
export async function getQuestions(username:string){
    
    const response = await axios.get(`${API_URL}/`);
    return {
        status: "200 OK",
        data: { questions: response.data }
    };
}

export async function getGlobalTopicMap() {

    const response = await axios.get(`${API_URL}/topic-relations`);
    
    return response.data;
}