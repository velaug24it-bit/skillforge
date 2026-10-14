# SkillForge — Programming Skill Assessment Portal

SkillForge is a full-stack centralized programming skill assessment portal designed for college examination and evaluation workflows.

---

## Technology Stack

- **Frontend**: React (v18), Vite, TypeScript, Tailwind CSS, React Router, Axios, Lucide React, Monaco Editor.
- **Backend**: Node.js, Express.js, TypeScript, REST API architecture.
- **Database**: MongoDB (Atlas or local instance) via Mongoose ODM (with automated in-memory fallback for testing & local development).
- **Authentication**: JWT with secure HTTP-only cookies, bcrypt password hashing.
- **Code Execution**: Configurable Judge0-compatible API runner with resource restrictions.

---

## Directory Structure

```
skillforge/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment & Database connections
│   │   ├── controllers/     # API controllers (Auth, Courses, Assessments, Bookings)
│   │   ├── middlewares/     # Error handling, Auth, Rate limiters
│   │   ├── models/          # Mongoose Schemas (User, Course, Question, Booking, etc.)
│   │   ├── routes/          # REST route handlers
│   │   ├── services/        # Business logic & Code execution adapter
│   │   ├── app.ts           # Express application configuration
│   │   └── server.ts        # Server entrypoint
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Student portal pages
│   │   ├── services/        # Axios API client
│   │   ├── App.tsx          # Application shell
│   │   └── main.tsx         # React root
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── README.md
└── PROJECT_PROGRESS.md
```

---

## Setup & Running Instructions

### 1. Backend Installation & Startup

```bash
cd backend
npm install
npm run dev
```

The backend server will run at: `http://localhost:5000`
Health Check API: `http://localhost:5000/api/health`

To run backend tests:
```bash
npm test
```

### 2. Frontend Installation & Startup

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server will run at: `http://localhost:5173`
(API requests to `/api` are automatically proxied to `http://localhost:5000`).

---

## Environment Variables

### Backend (`backend/.env`)
- `PORT`: Port number for Express server (default `5000`).
- `NODE_ENV`: `development` | `production` | `test`.
- `CLIENT_URL`: URL of the frontend application (`http://localhost:5173`).
- `MONGODB_URI`: MongoDB connection string.
- `JWT_SECRET`: Secret key for JWT authentication.
- `JWT_EXPIRES_IN`: Expiration time for tokens (default `7d`).
- `JUDGE0_API_URL`: Judge0 API URL endpoint.
- `JUDGE0_API_KEY`: API Key for code execution service.
- `CAMPUS_TIMEZONE`: Scheduled exam timezone (default `Asia/Kolkata`).

### Frontend (`frontend/.env`)
- `VITE_API_URL`: Base API route (`/api`).
