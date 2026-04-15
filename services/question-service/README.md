
# Question Service

Manages the question bank for PeerPrep.

This service handles **CRUD operations**, **random question retrieval**, and **topic relationships**, with admin-protected endpoints for managing content.

---

## 🌐 Base URL

`http://localhost:3001`

---

## 📦 Prerequisites

- Node.js 20+
- PostgreSQL
- Docker (optional, recommended)

---

## 🚀 Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

---

## ⚙️ Environment Variables

| Variable       | Required | Description                       | Default |
| -------------- | -------- | --------------------------------- | ------- |
| `PORT`         | No       | Port the server runs on           | `3001`  |
| `DATABASE_URL` | Yes      | PostgreSQL connection string      | -       |
| `JWT_SECRET`   | Yes      | Secret for verifying admin tokens | -       |

---

## 📜 Available Scripts

| Script        | Description                   |
| ------------- | ----------------------------- |
| `npm run dev` | Start service with hot reload |
| `npm start`   | Run production build          |

---

## 🔐 Authentication

* Admin routes are protected using `verifyAdmin` middleware
* Requires valid JWT token in:

```
Authorization: Bearer <token>
```

---

## 🔌 API Routes

### 📖 Public Routes

---

### `GET /questions`

Get all questions.

---

### `GET /questions/random`

Get a random question.

---

### `GET /questions/topic-relations`

Retrieve relationships between topics (used for matching / recommendations).

---

## 🔒 Admin Routes

> All routes below require admin authentication

---

### `GET /questions/:id`

Get full details of a specific question.

---

### `POST /questions`

Create a new question.

#### Request Body

```json
{
  "title": "Two Sum",
  "description": "Find two numbers...",
  "difficulty": "easy",
  "topics": ["array", "hashmap"]
}
```

---

### `PUT /questions/:id`

Update an existing question.

---

### `POST /questions/:id/unlock`

Unlock a question (for admin control / gating logic).

---

### `DELETE /questions/:id`

Soft delete a question (remains in database for history).

---

## 🧱 Architecture Notes

* Uses **PostgreSQL** as the primary database
* Follows **controller-service pattern**
* Questions are not permanently deleted (soft delete)

---

## 🐳 Docker Notes

* Service runs in Docker as:

```
http://question-service:3001
```

* Database container:

```
question-db
```

---

## 🔗 Integration

Frontend connects via:

```
VITE_QUESTION_SERVICE_URL=http://question-service:3001
```

---

## 🧪 Notes

* Designed for scalability (independent service)
* Admin-only mutations ensure data integrity
* Supports future extensions:

  * tagging system
  * difficulty tuning
  * analytics

---


```
```
