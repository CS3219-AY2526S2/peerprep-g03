import * as service from "../services/recordService.js";

export const createRecord = async (req, res) => {
  try {
    const { user_id, question_id, collaborators, submitted_code, result } = req.body;

    if (!user_id || !question_id || !submitted_code) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    const record = await service.createRecord({
      user_id,
      question_id,
      collaborators,
      submitted_code,
      result,
    });

    console.log("[SUCCESS] Record created:", record.id);

    res.status(201).json(record);
  } catch (err) {
    console.error("[REAL ERROR]", err);

    res.status(500).json({
      error: err.message,          
      detail: err.detail || null,
      code: err.code || null
    });
  }
};

export const getUserRecords = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        error: "user_id query param required",
      });
    }

    const records = await service.getUserRecords(user_id);
    res.json(records);
  } catch (err) {
    console.error("[ERROR] Fetch user records failed:", err);
    res.status(500).json({ error: "Failed to fetch records" });
  }
};

export const getRecord = async (req, res) => {
  try {
    const record = await service.getRecord(req.params.id);

    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.json(record);
  } catch (err) {
    console.error("[ERROR] Fetch record failed:", err);
    res.status(500).json({ error: "Failed to fetch record" });
  }
};

export const createBulkRecords = async (req, res) => {
  try {
    const { users, question_id, submitted_code, result } = req.body;

    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: "users array required" });
    }

    if (!question_id || !submitted_code) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const records = await service.createBulkRecords({
      users,
      question_id,
      submitted_code,
      result,
    });

    res.status(201).json(records);

  } catch (err) {
    console.error("[REAL ERROR BULK]", err);

    res.status(500).json({
      error: err.message,
      detail: err.detail || null,
      code: err.code || null
    });
  }
};