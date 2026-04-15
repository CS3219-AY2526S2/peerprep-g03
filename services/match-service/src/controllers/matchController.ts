export class MatchController {
    private readonly matchService;

    constructor(matchService) {
        this.matchService = matchService;
    }


    findMatch = async (req, res) => {
        try {

            const { userId, language, topic, difficulty } = req.body;
            const serviceResponse = await this.matchService.findMatchService(userId, language, topic, difficulty);
            res.status(201).json(serviceResponse);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }


    getMatchStatus = async (req, res) => {
        try {
            const { userId } = req.params;
            const serviceResponse = await this.matchService.pollMatchStatus(userId);
            console.log("getMatchStatus", serviceResponse)
            if (!serviceResponse) return res.status(404).json({ message: "Match request not found" });
            res.status(200).json(serviceResponse);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    exitTab = async (req, res) => {

                    try {
                    const { userId } = req.params;

                    const serviceResponse = await this.matchService.cancelMatchService(userId);



                    return res.status(200).json({ message: "Successfully exited match" });
                    } catch (error) {
                        console.log(error)
                        res.status(500).json({ error: error.message });
                    }
                }

    cancelMatch = async (req, res) => {
        try {
        const { userId } = req.params;

        const serviceResponse = await this.matchService.cancelMatchService(userId);

        if (serviceResponse.status == 'error') {
            return res.status(400).json({ error: serviceResponse.message || "Failed to cancel match" })
        };

        res.status(200).json({ message: "Successfully exited match" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

