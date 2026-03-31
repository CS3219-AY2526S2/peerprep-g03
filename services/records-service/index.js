import express from "express";
import recordRoutes from "./routes/recordRoutes.js";

const app = express();

app.use(express.json());

// logging middleware (important for demo)
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

app.use("/records", recordRoutes);

const PORT = 3004;

app.listen(PORT, () => {
  console.log(`[STARTED] Records service running on port ${PORT}`);
});