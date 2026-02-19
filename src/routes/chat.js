const express = require("express");
const router = express.Router();
const { streamGrok } = require("../services/grokService");
const Chat = require("../models/Chat");

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Stream AI response
 *     description: Checks MongoDB first, otherwise calls Groq and stores response.
 *     tags:
 *       - Chat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: Explain Kubernetes in simple words
 *     responses:
 *       200:
 *         description: Streaming response (SSE)
 *       400:
 *         description: Prompt required
 *       500:
 *         description: Internal server error
 */
router.post("/", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt required" });
    }

    console.log("📩 Incoming request:", prompt);

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const normalizedPrompt = prompt.trim().toLowerCase();

    // ==========================
    // 1️⃣ Check MongoDB
    // ==========================
    const mongoData = await Chat.findOne({
      prompt: normalizedPrompt,
    });

    if (mongoData) {
      console.log("🗄 Serving from MongoDB");

      res.write(`data: ${mongoData.response}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    // ==========================
    // 2️⃣ Call Groq
    // ==========================
    console.log("🤖 Calling Groq API...");

    let fullResponse = "";

    await streamGrok(prompt, (chunk) => {
      fullResponse += chunk;
      res.write(`data: ${chunk}\n\n`);
    });

    if (fullResponse) {
      console.log("💾 Saving to MongoDB");

      await Chat.create({
        prompt: normalizedPrompt,
        response: fullResponse,
      });

      console.log("✅ Stored successfully in MongoDB");
    }

    res.write("data: [DONE]\n\n");
    res.end();

  } catch (error) {
    console.error("❌ Chat route error:", error);
    res.write("data: Error occurred\n\n");
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

module.exports = router;
