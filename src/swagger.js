const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Jarvis AI Backend",
      version: "1.0.0",
      description: "AI Streaming Backend with Grok + MongoDB + Upstash Redis",
    },
    servers: [
      {
        url: "/",
      },
    ],
  },
  apis: [path.join(__dirname, "routes/*.js")], // Important
};

module.exports = swaggerJsdoc(options);
