
# High-Level Architecture

```
Client (Future FE)
        |
        v
Node.js API (Express)
        |
        |---- Check Redis Cache (Upstash)
        |         |
        |         |-- HIT → Stream cached response
        |         |
        |         |-- MISS → Call Grok API
        |                      |
        |                      v
        |                Stream Response
        |                      |
        |                Save to Redis
        |                Save to MongoDB

```
# Project Structure

```
jarvis-backend/
│
├── src/
│   ├── server.js
│   ├── routes/chat.js
│   ├── services/
│   │     ├── grokService.js
│   │     ├── cacheService.js
│   │     └── mongoService.js
│   ├── models/Chat.js
│   └── config.js
│
├── .env
├── package.json

```

