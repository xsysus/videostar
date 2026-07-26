import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export const ENV = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '',
  PEXELS_API_KEY: process.env.PEXELS_API_KEY || '',
  UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY || '',
  REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID || '',
  REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET || '',
  DATABASE_PATH: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'platform.db'),
  PORT: parseInt(process.env.PORT || '3000', 10),
};

export function validateEnvironment(): void {
  const missing: string[] = [];
  if (!ENV.GEMINI_API_KEY) missing.push('GEMINI_API_KEY');
  if (missing.length > 0) {
    console.warn(`⚠️ Warning: Missing environmental variables: ${missing.join(', ')}. Set them in .env before running live jobs.`);
  }
}
