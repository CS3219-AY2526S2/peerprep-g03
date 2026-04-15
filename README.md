[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/HpD0QZBI)
# CS3219 Project (PeerPrep) - AY2526S2
## Group: G03


# PeerPrep

A technical interview preparation platform where students can find peers and practice whiteboard-style coding questions together in real-time.

Built using a **distributed microservices architecture** for scalability, modularity, and high availability.

---

## 🏗️ Architecture

PeerPrep follows a **microservices-per-domain pattern**, where each service owns its own database.

---

## 🚀 Service Overview

| Service | Port | Description |
|--------|------|-------------|
| **Frontend** | `5173` | Vite-powered React application |
| **User Service** | `3000` | Authentication (JWT), user accounts |
| **Question Service** | `3001` | Question bank (CRUD), categories |
| **Collab Rooms** | `3002` | Session metadata & history |
| **Match Service** | `3003` | Peer matching via Redis |
| **Collab WebSocket** | `3012` | Real-time code sync |
| **AI Service** | `3006` | Gemini-powered hints & explanations |

---

## 🧱 Infrastructure Overview

### Databases

| Service | DB Type |
|--------|--------|
| user-service | PostgreSQL |
| question-service | PostgreSQL |
| collab-service | PostgreSQL |
| match-service | Redis |

---

## 📦 Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/)
- Google Gemini API Key

---

## ⚙️ Environment Setup

Create a `.env` file in the root directory:

```bash
echo "GEMINI_AI_API_KEY=your_key_here" > .env
````

---

## ▶️ Running the Project

### 1. Frontend (Local Dev)

```bash
cd frontend
npm install
npm run dev
```

Open the URL shown in your terminal (usually `http://localhost:5173`).

---

### 2. Backend (Docker)

```bash
cd ..
docker compose down
docker compose up --build
```

other commands
```bash
docker compose up -d --build collab-service-rooms
docker restart collab-service-websocket
```

---

## 🐘 Database Access (PostgreSQL)

To access the collaboration database:

```bash
docker compose exec collab-db psql -U postgres -d collabdb
```

Useful commands:

```sql
\dt
\d sessions
\d session_users

SELECT * FROM sessions;
SELECT * FROM session_users;
SELECT * FROM submissions;
```
To seed questions: 
```bash
docker exec -it question-service node scripts/seedQuestions.mjs
```

## Backend Unit Tests

service-names
- user-service
- question-service
- match-service
- collab-service-websocket
- collab-service-rooms
- ai-service

```bash
cd service
cd <service-name>
npm test
```

---

## 🧩 Services Breakdown

### 🔐 User Service (`3000`)

* JWT authentication
* User account management
* PostgreSQL-backed

---

### 📚 Question Service (`3001`)

* CRUD for coding questions
* Categorization support
* PostgreSQL-backed

---

### 🤝 Match Service (`3003`)

* Matches users based on:

  * Difficulty
  * Topic
* Uses Redis for fast matchmaking

---

### 🧑‍💻 Collaboration Services

#### Collab Rooms (`3002`)

* Session metadata including question details
* Session users metadata for user active, disconnected, left, submitted
* Submission History


#### Collab WebSocket (`3012`)

* Real-time code syncing
* WebSocket-based communication
* Document Persistence with PostgreSQL

---

### 🤖 AI Service (`3006`)

* Integrates with Gemini API
* Provides:

  * Hints
  * Explanations

---

### 🎨 Frontend (`5173`)

* Built with Vite + React
* Communicates with backend via internal Docker network

---

## 🛠️ Adding a New Service

### 1. Database

1. Copy an existing DB block (e.g., `user-db`)
2. Rename:

   * Service name
   * Container name
   * `POSTGRES_DB`
   * Volume name
   * Init script path

---

### 2. Backend Service

1. Copy an existing service (e.g., `user-service`)
2. Update:

   * Service name
   * Build path
   * Ports
   * `DATABASE_URL`

Example:

```yaml
DATABASE_URL: postgres://postgres:secret@your-db:5432/yourdb
```

---

## 🌐 Networking

All services run on a shared Docker bridge network:

```yaml
networks:
  app-network:
    driver: bridge
```

---

## 📂 Volumes

Persistent storage:

```yaml
volumes:
  user-db-data:
  question-db-data:
  collab-db-data:
```

---

## 🧪 Notes

* Each service is **independently deployable**
* Internal communication uses **Docker service names**
* Environment variables are injected via Docker Compose
* Redis is used for **low-latency matchmaking**

```
```
