# Implementation Plan: StudyShare (Notes App)

The goal is to develop a mobile application for students to share notes, featuring a guest mode, user authentication, strict file upload constraints, a profanity filter, a reporting system, an administrative review flow, and various production-grade features like Redis rate limiting, ElasticSearch, and more.

## Architecture Overview

We will structure the project under the root directory with backend, mobile, and optionally an admin-panel. The backend will be built with Node.js and Express. The mobile app will be built with React Native. Services like Redis, ElasticSearch, and the primary database will be orchestrated via Docker Compose.

### Tech Stack Choices
*   **Mobile App:** React Native (Expo is recommended for faster scaffolding and ease of testing).
*   **Backend:** Node.js with Express.js.
*   **Primary Database:** PostgreSQL (strongly recommended for relational data like Users, Notes, Reports).
*   **Search Engine:** ElasticSearch (for fuzzy search and advanced filtering on courses and schools).
*   **Cache & Rate Limiting:** Redis.
*   **File Storage:** AWS S3 or Cloudinary.
*   **Infrastructure:** Docker & Docker Compose for local development (Backend + DB + Redis + ElasticSearch).

## Proposed Layout

```text
StudyShare/
│
├── backend/                  # Node.js Express API
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── models/           # DB schema/models
│   │   ├── routes/           # Express routes
│   │   ├── middlewares/      # Auth, Rate Limit, Upload validation
│   │   ├── services/         # S3, ElasticSearch, Email, Profanity check
│   │   ├── utils/            # Magic numbers checker, Token generator
│   │   └── app.js            # Express setup
│   ├── Dockerfile
│   └── package.json
│
├── background-services/      # (Optional) Worker for notifications/emails
│
├── mobile/                   # React Native app
│   ├── src/                  # App source
│   ├── package.json
│   └── app.json
│
├── admin-panel/              # (Optional) React web app for Admin 
│
├── docker-compose.yml        # Orchestrates Postgres, Redis, ElasticSearch, Node API
└── README.md
```

## Step-by-Step Execution Plan

### Phase 1: Environment & Infrastructure
1.  Initialize `backend` and `mobile` folder structures inside `c:\Users\Barbaros\Desktop\StudyShare`.
2.  Write `docker-compose.yml` defining services:
    *   `postgres` database.
    *   `redis` for caching and rate limiting.
    *   `elasticsearch` for the fuzzy search capability.
    *   `backend` API service.
3.  Set up the base `backend` environment (`package.json`, Express server, DB ORM like Prisma or Sequelize).

### Phase 2: Core Authentications & User Handling
1.  Implement internal user models (UUID, email, password, roles: USER, ADMIN).
2.  Implement JWT generation (access & refresh tokens).
3.  Implement Email Verification and Password Reset APIs (using Nodemailer with ethereal email for dev).
4.  Write middlewares to extract and verify the user token, falling back to an unauthenticated "guest" context.

### Phase 3: Notes & Upload Infrastructure
1.  **File Upload Controller:** Implement Multer for handling multipart/form-data.
2.  **Magic Number Validation:** Read the hex headers of the buffer to tightly restrict to PDF, image formats, etc. Reject MP4/video files. Confine sizes under 10MB.
3.  **Cloud Storage Integration:** Provide an S3 (or Cloudinary) integration to upload the sanitized files.
4.  **Database Integration:** Save the Note metadata (Uploader, URL, Size, Type).

### Phase 4: Profanity Filter & Search Engine
1.  **Profanity Filter:** Add an advanced multi-language open-source library (or custom regex wordlist) to reject bad words in Course titles, School names, and Note descriptions.
2.  **ElasticSearch Integration (Fuzzy Search):** When adding a note, index the School and Course name in ElasticSearch. Use ElasticSearch's fuzzy matching endpoint so the mobile app can query existing, dynamically capitalizing all terms.

### Phase 5: Reporting, Admin & Interactions
1.  **Save/Favorite:** Add join tables for users saving notes.
2.  **Reporting:** Add a `reports` table. If `reports.count >= 3`, flag `isHidden = true` and `needsReview = true`.
3.  **Admin Endpoints:** Fetch items needing review. Admins can update `isVerified = true`. Verified notes wipe out their report counts and block future reporting.
4.  **Rate Limiting:** Protect core endpoints (login, register, upload, report) using a Redis-backed rate limiter (e.g. `rate-limiter-flexible`).

### Phase 6: Mobile Client Development (React Native)
1.  Setup typical React Native scaffolding (screens: Home [Guest view], Login, Upload, Admin [hidden for normal users]).
2.  Integrate infinite scroll/pagination for fetching notes.
3.  Design fuzzy search autocomplete fields for School / Course when uploading.

---

> [!IMPORTANT]
> ## User Review Required - Open Questions
> To proceed accurately, I need a few clarifications:
>
> 1. **Primary Database:** Is **PostgreSQL** okay for the main relational database, or do you strongly prefer MongoDB? PostgreSQL fits excellently with structured relations (Users -> Notes -> Reports).
> 2. **Mobile Framework:** Should I initialize the React Native project with **Expo** (simpler, faster to run) or standard **React Native CLI**?
> 3. **Admin Panel:** Do you want a separate `admin-panel` React web folder, or would you prefer the admin views to simply be special screens dynamically available within the mobile app for admin users?
> 4. **Storage:** Do you have an immediate preference between AWS S3 vs Cloudinary? I can build the service interface to accommodate either and mock it locally.
> 5. **Email Service:** For email verification/pass reset, I will set up NodeMailer initially with a mock provider (like Ethereal). Later you can plug in SendGrid etc. Is this acceptable?
