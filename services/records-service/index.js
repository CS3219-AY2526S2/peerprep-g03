import express from "express";
import cors from "cors";
import recordRoutes from "./routes/recordRoutes.js";

const app = express();

app.use(cors());

app.use(express.json());

// logging middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

app.use("/", recordRoutes);

const PORT = 3004;

app.listen(PORT, () => {
  console.log(`[STARTED] Records service running on port ${PORT}`);
});