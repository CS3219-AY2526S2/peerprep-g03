
# AI Service

AI-powered explanation service for PeerPrep.

This service provides **real-time streamed explanations** using Google Gemini via the AI SDK. It is designed to act as a **CS tutor**, helping users understand concepts instead of giving direct answers.

---

## 🧠 Features

- Streaming AI responses (low latency UX)
- Concept-based explanations (not direct solutions)
- Context-aware hints (code / problem descriptions)
- Rate-limited to prevent abuse
- Docker-ready

---

## 🌐 Base URL

`http://localhost:3006`

---

## 📦 Prerequisites

- Node.js 20+
- Docker (if running via compose)
- Google Gemini API Key

---

## 🚀 Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

---

## ⚙️ Environment Variables

| Variable            | Required | Description             | Default |
| ------------------- | -------- | ----------------------- | ------- |
| `PORT`              | No       | Port the server runs on | `3006`  |
| `GEMINI_AI_API_KEY` | Yes      | Google Gemini API key   | -       |

---

## 📜 Available Scripts

| Script        | Description                   |
| ------------- | ----------------------------- |
| `npm run dev` | Start service with hot reload |
| `npm start`   | Run production build          |

---

## 🧩 Middleware & Config

### CORS

* Allows all origins (`*`)
* Supports streaming headers:

  * `x-vercel-ai-data-stream`

### Rate Limiting

* Applied to AI endpoint only
* **10 requests per 2 seconds per IP**

### Logging

* Logs all incoming requests
* Logs AI request lifecycle + errors

---

## 🔌 API Routes

### `POST /api/ai/explain`

Streams an AI-generated explanation.

---

### 📥 Request Body

```json
{
  "prompt": "Explain this code snippet",
  "body": {
    "context": "code"
  }
}
```

| Field          | Type   | Required | Description                             |
| -------------- | ------ | -------- | --------------------------------------- |
| `prompt`       | string | Yes      | Highlighted user input                  |
| `body.context` | string | No       | Context type (`code`, `question`, etc.) |

---

### 📤 Response

* **Streaming response** (chunked)
* Uses `text/event-stream` under the hood

The response is streamed progressively to the client.

---

## 🧠 AI Behavior

The AI follows strict tutoring rules:

* ❌ Does NOT explain the exact user code
* ❌ Does NOT give direct answers
* ✅ Explains the **underlying concept**
* ✅ Provides a **separate example**
* ✅ Ends with a **guiding question**

Example:

> If user highlights a loop → AI explains iteration concept instead

---

## ⚡ Streaming Implementation

* Uses `streamText` from `ai` SDK
* Pipes directly to response:

```js
result.pipeDataStreamToResponse(res)
```

* Supports real-time UI updates

---

## 🛑 Error Handling

* SDK-level errors logged via `onError`
* Controller-level errors return:

```json
{
  "error": "message"
}
```

---

## 🐳 Docker Notes

* Runs as part of the PeerPrep microservices system
* Environment variables injected via `docker-compose`
* Accessible internally at:

```
http://ai-service:3006
```

---

## 🔗 Integration

Frontend connects via:

```
VITE_AI_SERVICE_URL=http://ai-service:3006
```

---

## 🧪 Notes

* Stateless service (no database)
* Optimized for low-latency streaming UX
* Safe for concurrent usage with rate limiting
* Designed to be easily extensible (e.g., hints, feedback, analysis)

---

## 🚧 Future Improvements

* Add `/ai/hints` endpoint
* Add request validation & size limits
* Add authentication (JWT)
* Add usage monitoring / analytics
* Support multiple models

---

```
```
