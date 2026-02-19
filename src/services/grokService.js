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
        model: "llama-3.1-8b-instant", // ✅ FREE TIER MODEL
        messages: [{ role: "user", content: prompt }],
        stream: true,
      },
      responseType: "stream",
    });

    return new Promise((resolve, reject) => {
      let fullResponse = "";

      response.data.on("data", (chunk) => {
        const lines = chunk.toString().split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.replace("data: ", "").trim();

            if (data === "[DONE]") {
              resolve(fullResponse);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;

              if (content) {
                fullResponse += content;
                onChunk(content);
              }
            } catch (e) {}
          }
        }
      });

      response.data.on("error", reject);
    });

  } catch (error) {
    console.error("Groq API Error:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = { streamGrok };
