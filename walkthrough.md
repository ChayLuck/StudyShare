# StudyShare App Walkthrough

We have successfully engineered the complete scaffolding and codebase foundation for **StudyShare** based on our implementation plan.

> [!CAUTION]
> Docker must be running on your system for `docker-compose up -d` to succeed. Additionally, you will need to push the Prisma schema and run the actual Node/React Native servers respectively for full operation. 

## 1. Environment & Infrastructure Backend Architecture

Using a Node.js + Express setup, I have constructed a robust REST API tailored exactly to the project requirements.

- **Docker orchestration:** Your `docker-compose.yml` holds configurations for a `postgres` DB, a `redis` cache instance (for rate-limiting), and an `elasticsearch` node. 
- **Prisma ORM:** Your schema includes full data modeling for `User`, `Note`, `NoteFavorite`, and `Report` resources, including necessary cascading relationships and booleans like `isVerified` and `isHidden`.

## 2. Authentication & Rate Limiting

The application provides Guest vs User boundaries safely.

- **JWT Tokens:** `generateAccessToken` and `generateRefreshToken` logic implemented within `utils/jwt.util.ts`.
- **Ethereal Nodemailer Mock:** Your `email.service.ts` spins up a mock email client automatically so you can test email verification and password resets offline.
- **Login/Register/Verify Endpoints:** Auth middleware automatically strips out bad tokens or enforces boundaries (`requireAdmin`, `requireAuth`, `optionalAuth`).
- **Redis Rate Limiter:** An overarching API rate limiter sits in front of the application routes limiting 10 requests per minute using the `rate-limiter-flexible` library backed by Redis.

## 3. Note Processing & Security

Ensuring the content of StudyShare remains pristine and safe.

> [!TIP]
> The magic number file validation logic avoids superficial file extension attacks.

- **Magic Numbers:** Configured inside `file.util.ts` to strictly allow specific Magic Headers (Hex prefixes matching PDF, JPEG, PNG, DOCX) and rigorously rejecting formats containing MP4/Videos.
- **Max File Size:** The Multer memory engine pipeline stops buffers natively above 10MB.
- **Mock Storage Engine:** S3 integration is stubbed gracefully inside `storage.service.ts`, saving files to a local `./uploads` directory with a publicly visible alias automatically.

## 4. Profanity Checks and Search Indexing

- **Profanity Service:** Integrated `bad-words` and added Turkish variants (`amk`, `siktir`, ...) internally. If a bad word is detected on either `schoolName`, `courseName`, or `description`, it rejects the Note entirely.
- **ElasticSearch Metadata:** When a valid note comes in, the backend forcibly uppercases `schoolName` and `courseName` and pushes a metadata tag to ElasticSearch.
- **Fuzzy Search API:** The `GET /api/notes/search` endpoint pipes queries straight into an ElasticSearch fuzzy text query.

## 5. Reports & Admin Interventions

We incorporated the flagging system reliably:
- Normal users can fire a `POST /api/reports` pointing to a User's Note.
- The `report.controller` logic observes if the count hits >= 3 exactly. If so, it updates the Note to `isHidden: true` and `needsReview: true`.
- An Admin user can trigger `verifyNote` endpoints effectively wiping the report count and switching the note into an untouchable, pure `isVerified: true` mode.

## 6. React Native Frontend

We used `expo-app` to deploy the required scaffolding for clients natively mapping exactly to the workflow.

- **Navigation Flow:** `HomeScreen`, `AuthScreen`, `UploadScreen`, and `AdminScreen`.
- **Axios & Tokens:** Integrated using `expo-secure-store` locally, auto-injecting the token on every request.
- **UI Logic:** The `UploadScreen` features dynamically updating suggestions mapped to ElasticSearch in real time. It utilizes `expo-document-picker` to handle native file grabbing natively.

### Next Steps to Run Locally

You must perform the following bash commands manually since your system requires the direct running of Docker and native execution policies:

```bash
# 1. Start databases
cd StudyShare
docker-compose up -d

# 2. Deploy schema from backend
cd backend
npx prisma db push
npm run dev

# 3. Launch mobile client
cd ../mobile
npm run start
```
