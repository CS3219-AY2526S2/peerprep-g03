import express from "express";
import { createRecordController, getRecordsController, getRecord } from "../controllers/recordController.js";

const router = express.Router();

router.post("/records", createRecordController)
router.get("/records", getRecordsController)
router.get('/records/:id', getRecord);

export default router;
