import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { rateLimitMiddleware } from './middlewares/rateLimit.middleware';
import { initElasticSearch } from './services/search.service';

import authRoutes from './routes/auth.routes';
import noteRoutes from './routes/note.routes';
import reportRoutes from './routes/report.routes';
import adminRoutes from './routes/admin.routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded mock files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Apply rate limiter to /api
app.use('/api/', rateLimitMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await initElasticSearch();
});
