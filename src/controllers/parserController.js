import { extractTextFromFile } from '../services/fileExtractor.js';
import { parseResumeWithGemini, matchResumeWithJobDescription } from '../services/geminiService.js';

export const parserController = {
  /**
   * Parse a single resume file (PDF or DOCX).
   * Optional jobDescription in req.body for instant JD alignment scoring.
   */
  async parseResume(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          ok: false,
          error: 'No resume file provided. Please upload a PDF or DOCX file under key "resume" or "file".'
        });
      }

      const file = req.file;
      const jobDescription = req.body?.jobDescription || req.body?.jd || null;

      // Extract raw text
      const rawText = await extractTextFromFile(file.buffer, file.originalname, file.mimetype);

      // Parse with Gemini model
      const candidateData = await parseResumeWithGemini(rawText, jobDescription);

      // Attach file metadata
      const candidate = {
        ...candidateData,
        fileName: file.originalname,
        fileSize: file.size,
        uploadedAt: new Date().toISOString()
      };

      return res.status(200).json({
        ok: true,
        data: candidate
      });
    } catch (err) {
      console.error('Error parsing resume:', err);
      return res.status(500).json({
        ok: false,
        error: err.message || 'An error occurred while parsing the resume.'
      });
    }
  },

  /**
   * Parse multiple resume files in batch.
   */
  async parseBatch(req, res) {
    try {
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({
          ok: false,
          error: 'No files provided.'
        });
      }

      const jobDescription = req.body?.jobDescription || req.body?.jd || null;
      const results = [];

      for (const file of files) {
        try {
          const rawText = await extractTextFromFile(file.buffer, file.originalname, file.mimetype);
          const candidateData = await parseResumeWithGemini(rawText, jobDescription);
          results.push({
            fileName: file.originalname,
            ok: true,
            data: {
              ...candidateData,
              fileName: file.originalname,
              fileSize: file.size,
              uploadedAt: new Date().toISOString()
            }
          });
        } catch (fileErr) {
          results.push({
            fileName: file.originalname,
            ok: false,
            error: fileErr.message
          });
        }
      }

      return res.status(200).json({
        ok: true,
        results
      });
    } catch (err) {
      console.error('Error in batch parse:', err);
      return res.status(500).json({
        ok: false,
        error: err.message || 'Batch parsing failed.'
      });
    }
  },

  /**
   * Compares candidate details or raw resume text against a Job Description.
   */
  async matchJD(req, res) {
    try {
      const { candidate, resumeText, jobDescription } = req.body || {};

      if (!jobDescription || !jobDescription.trim()) {
        return res.status(400).json({
          ok: false,
          error: 'Field "jobDescription" is required.'
        });
      }

      const resumeData = candidate || resumeText;
      if (!resumeData) {
        return res.status(400).json({
          ok: false,
          error: 'Either "candidate" profile object or "resumeText" is required.'
        });
      }

      const matchResult = await matchResumeWithJobDescription(resumeData, jobDescription);

      return res.status(200).json({
        ok: true,
        match: matchResult
      });
    } catch (err) {
      console.error('Error matching JD:', err);
      return res.status(500).json({
        ok: false,
        error: err.message || 'An error occurred while matching resume with Job Description.'
      });
    }
  },

  /**
   * Upload resume file + JD in one call to get both parsed candidate and match analysis.
   */
  async parseAndMatch(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          ok: false,
          error: 'No resume file provided.'
        });
      }

      const jobDescription = req.body?.jobDescription || req.body?.jd;
      if (!jobDescription || !jobDescription.trim()) {
        return res.status(400).json({
          ok: false,
          error: 'Field "jobDescription" is required for matching.'
        });
      }

      const file = req.file;
      const rawText = await extractTextFromFile(file.buffer, file.originalname, file.mimetype);

      // Parse with Gemini including JD
      const candidateData = await parseResumeWithGemini(rawText, jobDescription);
      const matchResult = candidateData.jdMatch
        && (Array.isArray(candidateData.jdMatch.missingSkills) || Array.isArray(candidateData.jdMatch.matchingSkills))
        ? candidateData.jdMatch
        : await matchResumeWithJobDescription(candidateData, jobDescription);

      const normalizedMatch = {
        ...matchResult,
        matchScore: Number(matchResult?.matchScore) || 0,
        reasons: Array.isArray(matchResult?.reasons) ? matchResult.reasons : [],
        missingSkills: Array.isArray(matchResult?.missingSkills) ? matchResult.missingSkills : [],
        matchingSkills: Array.isArray(matchResult?.matchingSkills) ? matchResult.matchingSkills : [],
        strengths: Array.isArray(matchResult?.strengths) ? matchResult.strengths : [],
        gaps: Array.isArray(matchResult?.gaps) ? matchResult.gaps : [],
        interviewQuestions: Array.isArray(matchResult?.interviewQuestions) ? matchResult.interviewQuestions : []
      };

      const candidate = {
        ...candidateData,
        fileName: file.originalname,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        jdMatch: normalizedMatch
      };

      return res.status(200).json({
        ok: true,
        data: candidate,
        match: normalizedMatch
      });
    } catch (err) {
      console.error('Error in parse and match:', err);
      return res.status(500).json({
        ok: false,
        error: err.message || 'Failed to parse and match resume.'
      });
    }
  }
};
