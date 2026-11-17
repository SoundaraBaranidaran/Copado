import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import { config } from './config/env.js';

const app = express();

// Enable CORS for frontend clients (Vite dev server, production origin, etc.)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parser middleware for JSON payloads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Root info route
app.get('/', (req, res) => {
  res.json({
    name: 'AI Resume Parser & JD Matching API',
    version: '1.0.0',
    status: 'ACTIVE',
    endpoints: {
      health: 'GET /api/health',
      parse: 'POST /api/parse (multipart form: "resume" or "file", optional "jobDescription")',
      parseBatch: 'POST /api/parse-batch (multipart form: "resumes")',
      match: 'POST /api/match (json: candidate/resumeText, jobDescription)',
      parseAndMatch: 'POST /api/parse-and-match (multipart form: "resume", "jobDescription")'
    }
  });
});

// Mount API routes
app.use('/api', apiRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    ok: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`🚀 Resume Parser Server running on http://localhost:${config.port}`);
  console.log(`📡 Health endpoint: http://localhost:${config.port}/api/health`);
  console.log(`🤖 Powered by Google Gemini (${config.geminiModels[0]})`);
  console.log(`====================================================`);
});
