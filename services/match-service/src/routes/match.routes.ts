import { Router } from "express";
import { validateUserParams, validateNewMatchRequest, limiter, throttle } from "../middleware/matchValidators.ts";

export class MatchRoutes {
    public router = Router();

    private readonly controller;


    constructor(controller) {
        this.controller = controller;
        this.initializeRoutes();
    }


    private initializeRoutes() {
        this.router.post("/match", throttle, limiter, this.controller.findMatch);
        this.router.post("/match/exit-tab/:userId", throttle, limiter, this.controller.exitTab);
        // this.router.post("/match",throttle, limiter, validateNewMatchRequest, this.controller.findMatch);
        this.router.get("/match/status/:userId", throttle, limiter, validateUserParams, this.controller.getMatchStatus);
        this.router.delete("/match/cancel/:userId", throttle, limiter, validateUserParams, this.controller.cancelMatch);
    }
}
