import express from "express";
import { createRecordController, getRecordsController } from "../controllers/recordController.js";

const router = express.Router();

// router.post("/", controller.createRecord);
// router.get("/", controller.getUserRecords);   // ?user_id=XXX
// router.get("/:id", controller.getRecord);
// router.post("/bulk", controller.createBulkRecords);
router.post("/records", createRecordController)
router.get("/records", getRecordsController)


export default router;