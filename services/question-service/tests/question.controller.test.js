const QuestionController = require('../controllers/question.controller');
const QuestionModel = require('../models/question.model');
const httpMocks = require('node-mocks-http');

// Mock the model for controller tests.
jest.mock('../models/question.model');

// Cover the main controller success and error paths.
describe('Question Controller Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        jest.clearAllMocks(); // Ensure call counts don't bleed between tests
    });


    test('getQuestions should return 200 and paginated data', async () => {
        const mockData = { questions: [], totalCount: 0, totalPages: 0 };
        QuestionModel.getAllQuestions.mockResolvedValue(mockData);
        req.query = { page: '1', limit: '10' };

        await QuestionController.getQuestions(req, res);

        expect(res.statusCode).toBe(200);
        expect(res._getJSONData()).toEqual(mockData);
        expect(QuestionModel.getAllQuestions).toHaveBeenCalledWith(1, 10);
    });

    test('createQuestion should return 409 if duplicate title exists', async () => {
        const error = new Error("Duplicate title found.");
        error.code = 'DUPLICATE_TITLE';
        QuestionModel.createQuestion.mockRejectedValue(error);
        req.body = { title: 'Existing Question' };

        await QuestionController.createQuestion(req, res);

        expect(res.statusCode).toBe(409);
        expect(res._getJSONData().error).toBe("Duplicate title found.");
    });


    // 1. Success Case: Create Question
    test('createQuestion should return 201 when creation is successful', async () => {
        const mockNewQuestion = { id: 1, title: 'New Q' };
        QuestionModel.createQuestion.mockResolvedValue(mockNewQuestion);
        req.body = { title: 'New Q', topic: 'Arrays', difficulty: 'Easy' };

        await QuestionController.createQuestion(req, res);

        expect(res.statusCode).toBe(201);
        expect(res._getJSONData()).toEqual(mockNewQuestion);
    });

    // 2. Success Case: Get Question Detail (and acquire lock)
    test('getQuestionDetail should return 200 and question data', async () => {
        const mockQuestion = { id: 1, title: 'Detailed Q', templates: [] };
        QuestionModel.getQuestionById.mockResolvedValue(mockQuestion);
        req.params.id = '1';
        req.user = { username: 'admin1' };

        await QuestionController.getQuestionDetail(req, res);

        expect(res.statusCode).toBe(200);
        expect(res._getJSONData()).toEqual(mockQuestion);
        expect(QuestionModel.getQuestionById).toHaveBeenCalledWith('1', 'admin1');
    });

    // 3. Error Case: Get Question Detail (Not Found)
    test('getQuestionDetail should return 404 if question does not exist', async () => {
        QuestionModel.getQuestionById.mockResolvedValue(null);
        req.params.id = '999';

        await QuestionController.getQuestionDetail(req, res);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData().message).toBe("Question not found");
    });

    // 4. Error Case: Get Question Detail (Locked by another admin)
    test('getQuestionDetail should return 409 if question is locked', async () => {
        const error = new Error("Locked by Alice");
        error.code = 'QUESTION_LOCKED';
        error.lockedBy = 'Alice';
        QuestionModel.getQuestionById.mockRejectedValue(error);
        req.params.id = '1';

        await QuestionController.getQuestionDetail(req, res);

        expect(res.statusCode).toBe(409);
        expect(res._getJSONData().lockedBy).toBe('Alice');
    });

    // 5. Success Case: Update Question
    test('updateQuestion should return 200 on successful update', async () => {
        const updatedMock = { id: 1, title: 'Updated Title' };
        QuestionModel.updateQuestion.mockResolvedValue(updatedMock);
        req.params.id = '1';
        req.user = { username: 'admin1' };
        req.body = { title: 'Updated Title' };

        await QuestionController.updateQuestion(req, res);

        expect(res.statusCode).toBe(200);
        expect(res._getJSONData()).toEqual(updatedMock);
    });

    // 6. Error Case: Update Question (Unauthorized)
    test('updateQuestion should return 401 if req.user is missing', async () => {
        req.params.id = '1';
        req.user = null;

        await QuestionController.updateQuestion(req, res);

        expect(res.statusCode).toBe(401);
        expect(res._getJSONData().error).toContain("Unauthorized");
    });

    // 7. Error Case: Update Question (Lock Conflict / Forbidden)
    test('updateQuestion should return 500 if lock holder differs', async () => {
        const error = new Error("This question is currently being edited by Alice");
        QuestionModel.updateQuestion.mockRejectedValue(error);
        req.params.id = '1';
        req.user = { username: 'Bob' };
        req.body = { title: 'Attempted Update' };

        await QuestionController.updateQuestion(req, res);

        expect(res.statusCode).toBe(500);
        expect(res._getJSONData().error).toContain("edited by Alice");
    });

    // 8. Success Case: Delete Question
    test('deleteQuestion should return 200 on soft-delete', async () => {
        QuestionModel.deleteQuestion.mockResolvedValue({ id: 1 });
        req.params.id = '1';

        await QuestionController.deleteQuestion(req, res);

        expect(res.statusCode).toBe(200);
        expect(res._getJSONData().message).toContain("successfully");
    });

    // 9. Success Case: Get Topic Map (Relations)
    test('getTopicRelations should transform raw rows into a grouped map', async () => {
        const rawData = [
            { main_topic: 'Arrays', related_topic: 'Sorting' },
            { main_topic: 'Arrays', related_topic: 'Two Pointers' }
        ];
        QuestionModel.getAllTopicRelations.mockResolvedValue(rawData);

        await QuestionController.getTopicRelations(req, res);

        const responseData = res._getJSONData();
        expect(res.statusCode).toBe(200);
        expect(responseData['Arrays']).toHaveLength(2);
        expect(responseData['Arrays']).toContain('Sorting');
    });

    // 10. Success Case: Unlock Question
    test('unlockQuestion should return 200 when lock is released', async () => {
        QuestionModel.releaseQuestionLock.mockResolvedValue({ success: true });
        req.params.id = '1';
        req.user = { username: 'admin1' };

        await QuestionController.unlockQuestion(req, res);

        expect(res.statusCode).toBe(200);
        expect(res._getJSONData().message).toBe("Lock released");
    });
});
