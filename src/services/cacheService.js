const axios = require("axios");
const { redisUrl, redisToken } = require("../config");

const headers = {
  Authorization: `Bearer ${redisToken}`,
  "Content-Type": "application/json",
};

async function getCache(key) {
  try {
    const res = await axios.get(
      `${redisUrl}/get/${key}`,
      { headers }
    );

    return res.data?.result || null;
  } catch (error) {
    console.error(
      "Redis GET error:",
      error.response?.data || error.message
    );
    return null;
  }
}

async function setCache(key, value, ttl = 3600) {
  try {
    // IMPORTANT: wrap value in quotes (like curl -d '"value"')
    await axios.post(
      `${redisUrl}/set/${key}?EX=${ttl}`,
      `"${value}"`,   // ✅ correct format
      { headers }
    );
  } catch (error) {
    console.error(
      "Redis SET error:",
      error.response?.data || error.message
    );
  }
}

module.exports = { getCache, setCache };
