import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback to current working directory

export const config = {
  port: process.env.PORT || 5000,
  googleApiKey: process.env.Google_API_key || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '',
  // Models in priority order: Gemini 3.5 Flash Lite is exceptionally fast, followed by 3.5 Flash and 3.8 Flash
  geminiModels: [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest'
  ]
};

if (!config.googleApiKey) {
  console.warn('⚠️ WARNING: Google_API_key is not set in environment or .env file!');
} else {
  console.log('✅ Google Generative AI key loaded successfully.');
}
