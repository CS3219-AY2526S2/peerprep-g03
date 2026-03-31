import express from "express";
import * as controller from "../controllers/recordController.js";

const router = express.Router();

router.post("/", controller.createRecord);
router.get("/", controller.getUserRecords);   // ?user_id=XXX
router.get("/:id", controller.getRecord);
router.post("/bulk", controller.createBulkRecords);

export default router;