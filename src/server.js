const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");

const { port, mongoUri } = require("./config");
const chatRoute = require("./routes/chat");
const healthRoute = require("./routes/health"); // ✅ NEW
const swaggerSpec = require("./swagger");

const app = express();

app.use(cors());
app.use(express.json());

// Swagger Docs
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/health", healthRoute); // ✅ NEW
app.use("/chat", chatRoute);

// MongoDB connection
mongoose.connect(mongoUri)
  .then(() => console.log("Mongo Connected"))
  .catch(err => console.error(err));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Swagger Docs: http://localhost:${port}/docs`);
});
