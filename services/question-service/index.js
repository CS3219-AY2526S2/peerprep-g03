const express = require('express');
const cors = require('cors');
const questionRoutes = require('./routes/question.route');

const app = express();

app.use(cors());
app.use(express.json()); // Essential for parsing POST/PUT bodies

// Use the routes
app.use('/api/questions', questionRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Question Service running on port ${PORT}`);
});