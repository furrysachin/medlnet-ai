import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { askRoute } from './routes/ask.js';
import { chatRoute } from './routes/chat.js';
import researchRoute from './routes/research.js';
import { trendRoute } from './routes/trend.js';
import { streamRoute } from './routes/stream.js';
import { buildReport } from './utils/reportBuilder.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB (optional)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(() => console.log('⚠️  MongoDB skipped'));

// Routes
app.use('/api', askRoute);
app.use('/api/chat', chatRoute);
app.use('/api/research', researchRoute);
app.use('/api', trendRoute);
app.use('/api', streamRoute);
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Report generation endpoint
app.post('/api/report', (req, res) => {
  try {
    const { disease, query, answer, papers, trials, confidence } = req.body;
    const report = buildReport({ disease, query, answer, papers, trials, confidence });
    res.json({ success: true, content: report.content, filename: report.filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 CuraLink backend → http://localhost:${PORT}`));
