# AI Resume Parser & Job Description Matcher Backend Server

A high-performance Node.js / Express backend server powered by **Google Gemini AI** that extracts structured candidate data from resumes (PDF / DOCX) and performs intelligent Job Description (JD) matching with detailed scores, justification reasons, and missing skills identification.

---

## 🚀 Features

- **Document Text Extraction**: Supports `.pdf`, `.docx`, and `.txt` files with `pdf-parse` and `mammoth`.
- **Intelligent Entity Parsing**: Uses Google Gemini to extract:
  - Personal Details & Telemetry (Full Name, Email, Phone, Location, LinkedIn, Portfolio)
  - Career History & Chronological Work Experience
  - Academic Credentials & Degrees
  - Categorized Competency Taxonomy (Programming Languages, Frameworks, Tools)
  - Projects, Certifications, and Natural Languages
- **Job Description (JD) Matching**:
  - Overall Matching Score ($0-100\%$)
  - Score Breakdown (Technical Skills, Experience, Education, Domain Fit)
  - Executive Alignment Summary & Rationale (Strengths & Gaps)
  - Missing Skills Detection (Critical JD requirements absent from resume)
  - Matched Competencies Highlight
  - Actionable Interview Questions & Recommendations
- **Resilient AI Pipeline**: Automatic fallback between Gemini models (`gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.8-flash`) with error resilience against spikes in demand.
- **RESTful API**: Clean JSON responses designed for seamless front-end integration.

---

## 🛠️ API Endpoints

### 1. `GET /api/health`
Check server and Gemini model availability.

**Response:**
```json
{
  "ok": true,
  "status": "ONLINE",
  "service": "AI Resume Parser & JD Matcher Server",
  "apiKeyConfigured": true
}
```

### 2. `POST /api/parse`
Extract structured candidate entities from a resume file.

- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `resume` or `file` (Binary File: `.pdf` or `.docx`)
  - `jobDescription` (Optional string: Target JD text for simultaneous matching)

**Response:**
```json
{
  "ok": true,
  "data": {
    "fullName": "Rahul Sharma",
    "email": "rahul@example.com",
    "phone": "+91 9876543210",
    "location": "Bengaluru",
    "totalExperience": 4,
    "skills": {
      "programmingLanguages": ["JavaScript", "Python", "SQL"],
      "frameworks": ["React", "Node.js", "Express"],
      "tools": ["Git", "Docker"]
    },
    "jdMatch": { ... }
  }
}
```

### 3. `POST /api/match`
Evaluate candidate alignment against a Job Description.

- **Content-Type**: `application/json`
- **Body**:
```json
{
  "candidate": { ... }, // or "resumeText": "..."
  "jobDescription": "Senior Full Stack Developer with React, Node.js, AWS, Kubernetes..."
}
```

**Response:**
```json
{
  "ok": true,
  "match": {
    "matchScore": 84,
    "scoreBreakdown": {
      "technicalSkills": 85,
      "experienceRelevance": 82,
      "educationFit": 90,
      "domainKnowledge": 80
    },
    "verdict": "Strong Match",
    "summary": "Candidate possesses strong core competencies in React and Node.js...",
    "reasons": [
      "Extensive 4+ years practical experience with required stack",
      "Demonstrated experience in microservices and API development"
    ],
    "missingSkills": [
      "Kubernetes production cluster orchestration",
      "AWS CloudWatch configuration"
    ],
    "matchingSkills": [
      "React",
      "Node.js",
      "Express",
      "Docker",
      "Git"
    ],
    "recommendations": "Advance to technical round focusing on AWS infrastructure."
  }
}
```

### 4. `POST /api/parse-and-match`
Upload resume and JD together to get both parsed candidate and in-depth match analysis in a single request.

---

## 📦 Setup & Installation

1. **Clone repository:**
   ```bash
   git clone https://github.com/SoundaraBaranidaran/Copado.git
   cd Copado
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   Google_API_key=YOUR_GOOGLE_GEMINI_API_KEY
   ```

4. **Start the Server:**
   ```bash
   npm start
   ```
   For development with hot-reload:
   ```bash
   npm run dev
   ```

---

## 👥 Authors & License
Developed for Resume Intelligence & ATS Automation.
Licensed under ISC.
