require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const basicAuth = require("express-basic-auth");

const { port, mongoUri } = require("./config");
const chatRoute = require("./routes/chat");
const healthRoute = require("./routes/health");
const swaggerSpec = require("./swagger");

const app = express();

// ===============================
// Global Middlewares
// ===============================
app.use(cors());
app.use(express.json());

// ===============================
// 🔐 Swagger Protection
// ===============================
if (process.env.NODE_ENV !== "production") {
  app.use(
    "/docs",
    basicAuth({
      users: {
        [process.env.SWAGGER_USER]: process.env.SWAGGER_PASS,
      },
      challenge: true,
    }),
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
    })
  );

  console.log("📄 Swagger enabled at /docs");
} else {
  console.log("🚫 Swagger disabled in production");
}

// ===============================
// Routes
// ===============================
app.use("/health", healthRoute);
app.use("/chat", chatRoute);

// ===============================
// MongoDB Connection
// ===============================
mongoose
  .connect(mongoUri, {
    autoIndex: true,
  })
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });

// ===============================
// Global Error Handler (Optional)
// ===============================
app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err.stack);
  res.status(500).json({ error: "Something went wrong" });
});

// ===============================
// Start Server
// ===============================
app.listen(port, () => {
  console.log("=================================");
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📡 Health: http://localhost:${port}/health`);
  console.log(`📄 Swagger: http://localhost:${port}/docs`);
  console.log("=================================");
});