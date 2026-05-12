import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { rateLimitMiddleware } from './middlewares/rateLimit.middleware';
import { initElasticSearch } from './services/search.service';

import authRoutes from './routes/auth.routes';
import noteRoutes from './routes/note.routes';
import reportRoutes from './routes/report.routes';
import adminRoutes from './routes/admin.routes';
import favoriteRoutes from './routes/favorite.routes';
import questionRoutes from './routes/question.routes';
import answerRoutes from './routes/answer.routes';

dotenv.config();
console.log("DB URL:", process.env.DATABASE_URL); // ← ekle

const app = express();

app.use(cors());
app.use(express.json());
app.post('/test', (req, res) => {
  console.log('BODY:', req.body);
  res.json({ ok: true });
});
app.use(express.urlencoded({ extended: true }));

// Serve uploaded mock files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Apply rate limiter to /api
// app.use('/api/', rateLimitMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 4000;

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("🔴 GLOBAL ERROR:", err);
  res.status(500).json({ message: err.message, stack: err.stack });
});

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  try {
    await initElasticSearch();
  } catch (e) {
    console.error('ElasticSearch init failed:', e);
  }
});

// Triggering restart for Prisma Client update
