import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import path from 'path';

/**
 * Extracts raw textual content from uploaded file buffers (PDF, DOCX, TXT).
 * @param {Buffer} buffer - File buffer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - Uploaded mime type
 * @returns {Promise<string>} - Extracted text
 */
export async function extractTextFromFile(buffer, originalName = '', mimeType = '') {
  if (!buffer || buffer.length === 0) {
    throw new Error('File buffer is empty.');
  }

  const ext = path.extname(originalName).toLowerCase();

  try {
    if (ext === '.pdf' || mimeType === 'application/pdf') {
      const data = await pdfParse(buffer);
      const text = (data.text || '').trim();
      if (!text) {
        throw new Error('No readable text found in PDF. The document may be an image scan or protected.');
      }
      return text;
    }

    if (
      ext === '.docx' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || '').trim();
      if (!text) {
        throw new Error('No readable text found in DOCX file.');
      }
      return text;
    }

    if (ext === '.txt' || mimeType === 'text/plain') {
      return buffer.toString('utf-8').trim();
    }

    throw new Error(`Unsupported file format '${ext}'. Only PDF and DOCX files are supported.`);
  } catch (err) {
    if (err.message.includes('No readable text') || err.message.includes('Unsupported file')) {
      throw err;
    }
    throw new Error(`Failed to extract text from document: ${err.message}`);
  }
}
