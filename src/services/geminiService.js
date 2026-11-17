import { config } from '../config/env.js';

/**
 * Executes a prompt against Google Gemini models with automatic fallback on failure/503.
 */
async function callGemini(prompt, systemInstruction = '') {
  if (!config.googleApiKey) {
    throw new Error('Google Gemini API Key is missing. Please set Google_API_key in .env file.');
  }

  let lastError = null;

  for (const model of config.geminiModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.googleApiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status}`;
        console.warn(`Model ${model} returned error (${response.status}): ${errorMsg}. Trying next model...`);
        lastError = new Error(`[${model}] ${errorMsg}`);
        continue;
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = new Error(`Model ${model} returned empty content.`);
        continue;
      }

      // Parse JSON, cleaning code blocks if model included markdown delimiters
      let cleaned = text.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      return JSON.parse(cleaned);
    } catch (err) {
      console.warn(`Error calling ${model}: ${err.message}. Trying next fallback...`);
      lastError = err;
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Parses raw resume text into structured candidate information using Gemini.
 * If a jobDescription is provided, it also evaluates the match score, reasons, and missing skills.
 */
export async function parseResumeWithGemini(rawText, jobDescription = null) {
  const systemInstruction = `
You are an expert HR Technology AI and ATS (Applicant Tracking System) parser.
Extract all relevant candidate entities from the provided resume text into clean, structured JSON.
Be accurate, do not fabricate details not present in the document.
If a field is missing, use empty strings or empty arrays as appropriate.
Ensure numbers (such as totalExperience) are numeric.
`;

  let prompt = `
Extract the candidate profile from the following resume text:

--- RESUME TEXT START ---
${rawText}
--- RESUME TEXT END ---

Return a valid JSON object matching exactly this schema:
{
  "fullName": "Candidate full name",
  "email": "Email address or empty string",
  "phone": "Phone number with country code if available or empty string",
  "location": "City, Country or Location",
  "linkedin": "LinkedIn profile URL or empty string",
  "portfolio": "Portfolio or GitHub or website URL or empty string",
  "summary": "Executive summary or professional overview",
  "totalExperience": 4, // Number of years of total professional experience as integer or float
  "currentDesignation": "Most recent job title or designation",
  "currentCompany": "Most recent company name",
  "education": [
    {
      "degree": "Degree (e.g. B.Tech, M.S., B.S.)",
      "specialization": "Specialization or Major (e.g. Computer Science)",
      "institution": "University or College name",
      "graduationYear": "Year of graduation (e.g. 2020)"
    }
  ],
  "experience": [
    {
      "designation": "Role title",
      "company": "Company name",
      "duration": "Tenure window (e.g. Jul 2022 – Present)",
      "responsibilities": [
        "Key responsibility or achievement 1",
        "Key responsibility or achievement 2"
      ]
    }
  ],
  "skills": {
    "programmingLanguages": ["JavaScript", "Python"],
    "frameworks": ["React", "Node.js"],
    "tools": ["Git", "Docker"]
  },
  "certifications": ["Certification name with year if available"],
  "projects": ["Project title: brief description of impact/tech stack"],
  "languages": ["English", "Spanish"]
}
`;

  if (jobDescription && jobDescription.trim()) {
    prompt += `

Additionally, evaluate this candidate against the following Job Description (JD):
--- JOB DESCRIPTION START ---
${jobDescription.trim()}
--- JOB DESCRIPTION END ---

Include a "jdMatch" field in the root of the JSON response with the following schema:
"jdMatch": {
  "jobTitle": "Target role title inferred from JD",
  "matchScore": 82, // Integer 0 to 100 representing percentage match
  "scoreBreakdown": {
    "skillsScore": 80,
    "experienceScore": 85,
    "educationScore": 90,
    "domainScore": 75
  },
  "summary": "Executive assessment summary of the candidate's alignment with the role.",
  "reasons": [
    "Specific strength or match factor 1",
    "Specific gap or misalignment factor 2"
  ],
  "missingSkills": [
    "Skill or requirement mentioned in JD that is not evidenced in the resume"
  ],
  "matchingSkills": [
    "Skill or competency that directly matches JD requirements"
  ],
  "recommendation": "Strong Hire / Interview / Potential Match / Low Match with key guidance."
}
`;
  }

  const result = await callGemini(prompt, systemInstruction);

  // Normalize structure to ensure all keys exist
  return {
    fullName: result.fullName || 'Unnamed Candidate',
    email: result.email || '',
    phone: result.phone || '',
    location: result.location || '',
    linkedin: result.linkedin || '',
    portfolio: result.portfolio || '',
    summary: result.summary || '',
    totalExperience: typeof result.totalExperience === 'number' ? result.totalExperience : Number(result.totalExperience) || 0,
    currentDesignation: result.currentDesignation || '',
    currentCompany: result.currentCompany || '',
    education: Array.isArray(result.education) ? result.education : [],
    experience: Array.isArray(result.experience) ? result.experience : [],
    skills: {
      programmingLanguages: Array.isArray(result.skills?.programmingLanguages) ? result.skills.programmingLanguages : [],
      frameworks: Array.isArray(result.skills?.frameworks) ? result.skills.frameworks : [],
      tools: Array.isArray(result.skills?.tools) ? result.skills.tools : []
    },
    certifications: Array.isArray(result.certifications) ? result.certifications : [],
    projects: Array.isArray(result.projects) ? result.projects : [],
    languages: Array.isArray(result.languages) ? result.languages : [],
    rawText: rawText,
    jdMatch: result.jdMatch || null
  };
}

/**
 * Compares an existing candidate profile or resume text against a Job Description.
 */
export async function matchResumeWithJobDescription(resumeData, jobDescription) {
  if (!jobDescription || !jobDescription.trim()) {
    throw new Error('Job description text is required for matching.');
  }

  const systemInstruction = `
You are an advanced AI Recruitment and Talent Matching Specialist.
Analyze the candidate's resume/profile in detail against the Job Description (JD).
Evaluate core technical competencies, depth of experience, tool stack, education, and domain requirements.
Provide an objective match score (0-100), explicit reasons behind the score, and an accurate list of missing skills.
`;

  const resumePayload = typeof resumeData === 'string'
    ? resumeData
    : JSON.stringify({
        fullName: resumeData.fullName,
        summary: resumeData.summary,
        totalExperience: resumeData.totalExperience,
        currentDesignation: resumeData.currentDesignation,
        experience: resumeData.experience,
        skills: resumeData.skills,
        education: resumeData.education,
        certifications: resumeData.certifications,
        projects: resumeData.projects
      }, null, 2);

  const prompt = `
Please compare the following candidate profile against the Job Description:

--- CANDIDATE PROFILE ---
${resumePayload}

--- JOB DESCRIPTION ---
${jobDescription.trim()}

Return a valid JSON object strictly matching this schema:
{
  "matchScore": 78, // Integer 0 to 100 overall match percentage
  "scoreBreakdown": {
    "technicalSkills": 75, // 0 to 100
    "experienceRelevance": 80, // 0 to 100
    "educationFit": 90, // 0 to 100
    "domainKnowledge": 70 // 0 to 100
  },
  "verdict": "Strong Match" | "Moderate Match" | "Partial Match" | "Low Match",
  "summary": "Concise 2-3 sentence overview of the candidate's fit for this role.",
  "reasons": [
    "Detailed positive or negative reason 1 explaining the score",
    "Detailed positive or negative reason 2 explaining the score",
    "Detailed positive or negative reason 3 explaining the score"
  ],
  "missingSkills": [
    "Missing Skill or Certification 1 explicitly requested in the JD",
    "Missing Skill or Domain Tool 2"
  ],
  "matchingSkills": [
    "Skill 1 that matches the JD requirement",
    "Skill 2 that matches the JD requirement"
  ],
  "strengths": [
    "Key candidate strength 1 relative to JD",
    "Key candidate strength 2 relative to JD"
  ],
  "gaps": [
    "Key candidate gap or concern 1 relative to JD",
    "Key candidate gap or concern 2 relative to JD"
  ],
  "interviewQuestions": [
    "Suggested targeted technical interview question 1 to probe gaps",
    "Suggested targeted technical interview question 2"
  ],
  "recommendations": "Actionable recruitment recommendation for hiring managers."
}
`;

  return await callGemini(prompt, systemInstruction);
}
