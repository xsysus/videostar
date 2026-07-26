import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'platform.db');

export function getDatabase(): Database.Database {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  return db;
}

export function initializeDatabase(): void {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      niche TEXT NOT NULL,
      raw_title TEXT UNIQUE NOT NULL,
      hook_concept TEXT,
      virality_score INTEGER NOT NULL,
      status TEXT CHECK(status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PRODUCED')) DEFAULT 'PENDING_APPROVAL',
      ai_analysis_json TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS video_jobs (
      id TEXT PRIMARY KEY,
      topic_id TEXT REFERENCES topics(id),
      niche TEXT NOT NULL,
      language TEXT DEFAULT 'en-US',
      tone_style TEXT DEFAULT 'standard',
      status TEXT CHECK(status IN ('QUEUED', 'SCRIPTING', 'GENERATING_ASSETS', 'RENDERING', 'READY_FOR_PUBLISH', 'PUBLISHED', 'FAILED')) DEFAULT 'QUEUED',
      script_json TEXT,
      audio_url TEXT,
      word_timestamps_json TEXT,
      rendered_video_path TEXT,
      youtube_video_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS youtube_channels (
      id TEXT PRIMARY KEY,
      channel_name TEXT NOT NULL,
      niche TEXT NOT NULL,
      language TEXT DEFAULT 'en-US',
      credentials_json TEXT NOT NULL,
      default_privacy_status TEXT DEFAULT 'scheduled',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log(`✅ Database initialized successfully at: ${DB_PATH}`);
}

if (require.main === module) {
  initializeDatabase();
}
