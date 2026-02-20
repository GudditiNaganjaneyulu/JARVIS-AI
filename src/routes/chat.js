const express = require("express");
const router = express.Router();
const { streamGrok } = require("../services/grokService");
const Chat = require("../models/Chat");
const authMiddleware = require("../middleware/auth");

// ===============================
// 🔤 Text Normalization
// ===============================
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const stopWords = ["in", "the", "is", "a", "an", "of", "to", "for"];

function tokenize(text) {
  return normalizeText(text)
    .split(" ")
    .filter(word => word.length > 2 && !stopWords.includes(word));
}

// ===============================
// 🧠 Similarity Score
// ===============================
function calculateMatchScore(dbPrompt, userPrompt) {
  const dbWords = tokenize(dbPrompt);
  const userWords = tokenize(userPrompt);

  let matchCount = 0;

  userWords.forEach(word => {
    if (dbWords.includes(word)) {
      matchCount++;
    }
  });

  return matchCount / Math.max(userWords.length, 1);
}

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Ask AI (JSON or Stream mode)
 *     description: Uses cache before calling Groq.
 *     tags:
 *       - Chat
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum: [json, stream]
 *         description: Response mode (json for Swagger, stream for frontend)
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
 *                 example: Famous places in Malaysia
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { prompt } = req.body;
    const mode = req.query.mode || "stream";

    if (!prompt) {
      return res.status(400).json({ error: "Prompt required" });
    }

    const normalizedPrompt = normalizeText(prompt);
    console.log("📩 Incoming request:", prompt);

    // ==========================
    // 1️⃣ EXACT MATCH
    // ==========================
    const exactMatch = await Chat.findOne({ prompt: normalizedPrompt });

    if (exactMatch) {
      console.log("🗄 Serving EXACT match");

      if (mode === "json") {
        return res.json({
          source: "cache-exact",
          response: exactMatch.response,
        });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.write(`data: ${exactMatch.response}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    // ==========================
    // 2️⃣ SMART TEXT SEARCH
    // ==========================
    const textMatches = await Chat.find(
      { $text: { $search: normalizedPrompt } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(5);

    let bestMatch = null;
    let highestScore = 0;

    for (let chat of textMatches) {
      const score = calculateMatchScore(chat.prompt, normalizedPrompt);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = chat;
      }
    }

    if (highestScore >= 0.5 && bestMatch) {
      console.log(`🧠 Smart Match Found (${highestScore})`);

      if (mode === "json") {
        return res.json({
          source: "cache-smart",
          similarity: highestScore,
          response: bestMatch.response,
        });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.write(`data: ${bestMatch.response}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    // ==========================
    // 3️⃣ CALL GROQ
    // ==========================
    console.log("🤖 Calling Groq API...");

    let fullResponse = "";

    if (mode === "json") {
      await streamGrok(prompt, (chunk) => {
        fullResponse += chunk;
      });

      await Chat.create({
        prompt: normalizedPrompt,
        response: fullResponse,
      });

      return res.json({
        source: "groq",
        response: fullResponse,
      });
    }

    // STREAM MODE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    await streamGrok(prompt, (chunk) => {
      fullResponse += chunk;
      res.write(`data: ${chunk}\n\n`);
    });

    await Chat.create({
      prompt: normalizedPrompt,
      response: fullResponse,
    });

    res.write("data: [DONE]\n\n");
    res.end();

  } catch (error) {
    console.error("❌ Chat route error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /chat/history:
 *   get:
 *     summary: Get chat history (paginated)
 *     tags:
 *       - Chat
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Paginated chat history
 */
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Chat.countDocuments();

    const chats = await Chat.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
      data: chats,
    });

  } catch (error) {
    console.error("❌ History route error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;