import axios from 'axios';
const MATCH_API_URL = 'http://localhost:3003/api';

export async function getPartner(username, questionTopic, questionDifficulty, programmingLanguage) {
    try {
        const response = await axios.post(`${MATCH_API_URL}/match`, {
            userId: username,
            language: programmingLanguage,
            topic: questionTopic,
            difficulty: questionDifficulty
        });

        // Axios uses .status, not .ok
        const isSuccess = response.status >= 200 && response.status < 300;

        return {
            status: response.status,
            data: response.data, // Contains { status: 'searching' } or { status: 'success', partner: '...' }
            success: isSuccess
        };
    } catch (error) {
        // Axios throws on 4xx/5xx errors
        return {
            status: error.response?.status || 500,
            data: error.response?.data || { message: "Network Error" },
            success: false
        };
    }
}

export async function deleteMatch(username) {
    try {
        const response = await axios.delete(`${MATCH_API_URL}/match/cancel/${username}`);

        // Axios uses .status, not .ok
        const isSuccess = response.status >= 200 && response.status < 300;

        return {
            status: response.status,
            success: isSuccess
        };
    } catch (error) {
        // Axios throws on 4xx/5xx errors
        return {
            status: error.response?.status || 500,
            data: error.response?.data || { message: "Network Error" },
            success: false
        };
    }
}

export async function getMatchStatus(username) {
    try {
        const response = await axios.get(`${MATCH_API_URL}/match/status/${username}`);

        // Axios uses .status, not .ok
        const isSuccess = response.status >= 200 && response.status < 300;
        console.log(response)
        return {
            data: response.data,
            status: response.status,
            success: isSuccess
        };
    } catch (error) {
        // Axios throws on 4xx/5xx errors
        return {
            status: error.response?.status || 500,
            data: error.response?.data || { message: "Network Error" },
            success: false
        };
    }
}

export async function getCode(collaborationId) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {code: "Code that partner and I have written"};
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function pollMatchStatus(username, signal) {
    const startTime = Date.now();
    const TWO_MINUTES = 2 * 60 * 1000; // 120,000ms

    while (Date.now() - startTime < TWO_MINUTES) {
        try {
            if (signal?.aborted) return { status: "cancelled" };
            // Your existing axios call
            const response = await axios.get(`${MATCH_API_URL}/match/status/${username}`);
            const data = response.data;

            console.log("Current Status:", data.status);

            // Check if the data is "match"
            if (data.status === "matched") {
                return data; // Success! Exit loop and return data
            }

            if ( data.status === "expired") {
                return data; // Success! Exit loop and return data
            }

            // Wait 2-5 seconds before polling again to avoid spamming the server
            await delay(10000);

        } catch (error) {
            if (axios.isCancel(error)) return { status: "cancelled" };
            console.error("Polling error:", error);
            // Optionally break on 404/500 errors, or keep trying
            break

        }
    }

    throw new Error("Matchmaking timed out after 2 minutes.");
}
