require("dotenv").config();

module.exports = {
  port: process.env.PORT || 8000,
  mongoUri: process.env.MONGO_URI,
  grokApiKey: process.env.GROK_API_KEY,
  grokApiUrl: process.env.GROK_API_URL,
  redisUrl: process.env.UPSTASH_REDIS_REST_URL,
  redisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
};
