import express from 'express';
import multer from 'multer';
import { parserController } from '../controllers/parserController.js';
import { config } from '../config/env.js';

const router = express.Router();

// Configure Multer for memory storage (buffers)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];
    const isDoc = file.originalname.match(/\.(pdf|docx|doc|txt)$/i);
    if (allowed.includes(file.mimetype) || isDoc) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX documents are supported.'), false);
    }
  }
});

// Middleware to accept file with field name 'resume' or 'file'
const uploadSingleResume = (req, res, next) => {
  const handler = upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'file', maxCount: 1 }
  ]);

  handler(req, res, err => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ ok: false, error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }

    if (req.files?.resume?.[0]) {
      req.file = req.files.resume[0];
    } else if (req.files?.file?.[0]) {
      req.file = req.files.file[0];
    }

    next();
  });
};

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    status: 'ONLINE',
    service: 'AI Resume Parser & JD Matcher Server',
    models: config.geminiModels,
    apiKeyConfigured: Boolean(config.googleApiKey)
  });
});

// Parse a single resume
router.post('/parse', uploadSingleResume, parserController.parseResume);

// Parse multiple resumes in one batch
router.post('/parse-batch', upload.array('resumes', 10), parserController.parseBatch);

// Match an existing candidate profile or resume text against a Job Description
router.post('/match', express.json(), parserController.matchJD);

// Upload a resume file and match it against a Job Description
router.post('/parse-and-match', uploadSingleResume, parserController.parseAndMatch);

export default router;
