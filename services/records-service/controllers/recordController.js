import { createRecordService, getRecordsService, fetchRecordById } from "../services/recordService.js";

// POST /records
export const createRecordController = async (req, res) => {
  try {
    const record = await createRecordService(req.body);
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// GET /records?user_id=1
export const getRecordsController = async (req, res) => {
  try {
    const { user_id } = req.query;

    const records = await getRecordsService(user_id);
    res.status(200).json(records);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await fetchRecordById(id);

    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch record" });
  }
};
