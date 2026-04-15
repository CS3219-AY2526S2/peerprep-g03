const QuestionModel = require('../models/question.model');
const { _mockPool, _mockClient } = require('pg');

// Model tests run against mocked pg clients.
describe('Question Model - Advanced Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('getQuestionById returns null if question is soft-deleted', async () => {
        // Order: 1. connect, 2. BEGIN, 3. SELECT (FOR UPDATE), 4. ROLLBACK
        _mockClient.query
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [] }) // SELECT (returns empty)
            .mockResolvedValueOnce({}); // ROLLBACK
        
        const result = await QuestionModel.getQuestionById(999);
        expect(result).toBeNull();
    });

    test('updateQuestion throws error if user is not the current lock holder', async () => {
        // Order: 1. checkDuplicateTitle (pool), 2. connect, 3. BEGIN, 4. lockCheck (client)
        _mockPool.query.mockResolvedValueOnce({ rows: [] }); // checkDuplicateTitle
        _mockClient.query
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ locked_by: 'Alice' }] }); // lockCheck
        
        await expect(QuestionModel.updateQuestion(1, 'Title', 'Topic', 'Easy', 'Desc', [], 'Bob'))
            .rejects.toThrow(/currently being edited by Alice/);
    });

    test('createQuestion handles templates array', async () => {
        // Order:
        // 1. checkDuplicateTitle (pool.query)
        // 2. BEGIN (client.query)
        // 3. INSERT Question (client.query)
        // 4. INSERT Template (client.query)
        // 5. COMMIT (client.query)
        
        _mockPool.query.mockResolvedValueOnce({ rows: [] }); // checkDuplicateTitle
        
        _mockClient.query
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // INSERT Q (provides .id)
            .mockResolvedValueOnce({}) // INSERT Template
            .mockResolvedValueOnce({}); // COMMIT

        const templates = [{ language: 'python', starter_code: '...', solution_code: '...' }];
        const result = await QuestionModel.createQuestion('New Q', 'Arrays', 'Easy', 'Desc', templates);
        
        expect(result.id).toBe(10);
    });
    test('deleteQuestion should return the updated question with is_deleted true', async () => {
        // Model uses pool.query directly
        const mockDeletedQuestion = { id: 1, title: 'Test', is_deleted: true };
        _mockPool.query.mockResolvedValueOnce({ rows: [mockDeletedQuestion] });

        const result = await QuestionModel.deleteQuestion(1);
        
        expect(result.is_deleted).toBe(true);
        expect(_mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE questions SET is_deleted = TRUE"),
            [1]
        );
    });

    test('findRandom should correctly handle the ANY(topic_tags) query', async () => {
        // Model uses pool.query directly
        const mockRandomQ = { id: 5, title: 'Random Q', active_template: {} };
        _mockPool.query.mockResolvedValueOnce({ rows: [mockRandomQ] });

        const result = await QuestionModel.findRandom('Strings', 'Hard', 'java');

        expect(result.id).toBe(5);
        expect(_mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining("$1 = ANY(q.topic_tags)"),
            ['Strings', 'Hard', 'java']
        );
    });

    test('getAllTopicRelations should return raw relationship rows', async () => {
        // Model uses pool.query directly
        const mockRelations = [
            { main_topic: 'Arrays', related_topic: 'Sorting', occurrence_count: 5 },
            { main_topic: 'Trees', related_topic: 'Recursion', occurrence_count: 3 }
        ];
        _mockPool.query.mockResolvedValueOnce({ rows: mockRelations });

        const result = await QuestionModel.getAllTopicRelations();

        expect(result).toHaveLength(2);
        expect(result[0].main_topic).toBe('Arrays');
    });

    test('getQuestionById should successfully refresh a lock for the requesting admin', async () => {
        // Sequence: 1. connect, 2. BEGIN, 3. SELECT (found), 4. UPDATE (lock), 5. SELECT (templates), 6. COMMIT
        const mockQuestion = { id: 1, locked_by: null };
        
        _mockClient.query
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [mockQuestion] }) // SELECT Question
            .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE (Refresh Lock)
            .mockResolvedValueOnce({ rows: [] }) // SELECT Templates
            .mockResolvedValueOnce({}); // COMMIT

        const result = await QuestionModel.getQuestionById(1, 'admin_kim');

        expect(result.id).toBe(1);
        // Verify the lock update was called with the correct adminId
        expect(_mockClient.query).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE questions SET locked_by = $1"),
            ['admin_kim', 1]
        );
    });

    test('releaseQuestionLock should return false if the admin is not the current holder', async () => {
        // Model uses pool.query directly. If rowCount is 0, it means the 
        // WHERE clause (id=$1 AND locked_by=$2) didn't match anything.
        _mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

        const result = await QuestionModel.releaseQuestionLock(1, 'wrong_admin');

        expect(result.success).toBe(false);
    });
});
