const axios = require("axios");
const { grokApiUrl, grokApiKey } = require("../config");

async function streamGrok(prompt, onChunk) {
  try {
    const response = await axios({
      method: "post",
      url: grokApiUrl,
      headers: {
        Authorization: `Bearer ${grokApiKey}`,
        "Content-Type": "application/json",
      },
      data: {
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        stream: true,
      },
      responseType: "stream",
      timeout: 60000,
    });

    return new Promise((resolve, reject) => {
      let fullResponse = "";
      let buffer = "";

      response.data.on("data", (chunk) => {
        buffer += chunk.toString();

        const lines = buffer.split("\n");

        // Keep last incomplete line in buffer
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const data = trimmed.replace("data:", "").trim();

          if (data === "[DONE]") {
            resolve(fullResponse);
            return;
          }

          try {
            const parsed = JSON.parse(data);

            const content = parsed?.choices?.[0]?.delta?.content;

            if (content) {
              fullResponse += content;
              onChunk(content);
            }

            // Finish reason check
            if (parsed?.choices?.[0]?.finish_reason) {
              resolve(fullResponse);
              return;
            }

          } catch (err) {
            // Ignore partial JSON errors safely
          }
        }
      });

      response.data.on("end", () => {
        resolve(fullResponse);
      });

      response.data.on("error", (err) => {
        reject(err);
      });
    });

  } catch (error) {
    console.error(
      "❌ Groq API Error:",
      error.response?.data || error.message
    );
    throw error;
  }
}

module.exports = { streamGrok };