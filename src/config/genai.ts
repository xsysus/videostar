import { GoogleGenAI } from '@google/genai';
import { ENV } from './env.js';

export function getGenAIClient(): GoogleGenAI {
  const apiKey = ENV.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({ apiKey });
}

export const GENAI_MODELS = {
  TEXT_FLASH: 'gemini-2.5-flash',
  TEXT_PRO: 'gemini-2.5-flash',
  IMAGEN_3: 'imagen-3.0-generate-002',
};
