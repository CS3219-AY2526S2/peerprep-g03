import { Language, Difficulty, Topic } from '../constants/match.constant.ts'
import { rateLimit } from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window (2 minutes mean 24 requests for 5 sec polling of a match request)
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        code: "TOO_MANY_REQUESTS",
        message: "You have sent too many request. Please try again later."
    }
});

// Change the throttle back to 1 later
const throttle = rateLimit({
    windowMs: 500, // 500ms per request
    max: 1,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        code: "THROTTLE_LIMIT",
        message: "You can only send 1 request per 500ms."
    }
});

const validateUserParams = (req, res, next) => {
    const { userId } = req.params;
    if (!userId || userId === ':/userId' || userId === 'undefined') {
        return res.status(400).json({
            code: "INVALID_USER_PARAMETER",
            message: "Invalid userId  in the URL path"})
    };

    next();
}

const validateNewMatchRequest = (req, res, next) => {
    const { userId, language, topic, difficulty } = req.body;
    if (!userId || !language || !topic || !difficulty) {
        return res.status(400).json({
            code: "MISSING_FIELDS",
            message: "One of more fields have missing values"})
    };

    const isValidLanguage = Object.values(Language).includes(language);
    const isValidDifficulty = Object.values(Difficulty).includes(difficulty);
    const isValidTopic = Object.values(Topic).includes(topic);

    if (!isValidLanguage || !isValidTopic || !isValidDifficulty) {
        return res.status(400).json({
            code: "INVALID_ENUM_VALUE",
            message: "One or more fields contain invalid options",
            details: {
                language: isValidLanguage ? "valid" : "invalid",
                topic: isValidTopic ? "valid" : "invalid",
                difficulty: isValidDifficulty ? "valid" : "invalid"
            }
        });
    }

    next();
}

export { validateUserParams, validateNewMatchRequest, limiter, throttle };
