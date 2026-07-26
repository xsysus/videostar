import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';

const DB_PATH = ENV.DATABASE_PATH || path.join(process.cwd(), 'data', 'platform_db.json');

export interface TopicRecord {
  id: string;
  niche: string;
  raw_title: string;
  hook_concept: string;
  virality_score: number;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PRODUCED';
  created_at: string;
}

export interface VideoJobRecord {
  id: string;
  topic_id: string;
  niche: string;
  status: 'QUEUED' | 'SCRIPTING' | 'GENERATING_ASSETS' | 'RENDERING' | 'PUBLISHED' | 'FAILED';
  language?: string;
  tone_style?: string;
  script_json?: string;
  audio_url?: string;
  word_timestamps_json?: string;
  rendered_video_path?: string;
  youtube_video_id?: string;
  created_at: string;
}

export interface DbSchema {
  topics: TopicRecord[];
  video_jobs: VideoJobRecord[];
}

export class JsonDatabase {
  private filePath: string;
  private data: DbSchema;

  constructor(filePath: string) {
    this.filePath = filePath;
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.topics) this.data.topics = [];
        if (!this.data.video_jobs) this.data.video_jobs = [];
      } catch (e) {
        this.data = { topics: [], video_jobs: [] };
      }
    } else {
      this.data = { topics: [], video_jobs: [] };
      this.save();
    }
  }

  private save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  public exec(sql: string): void {
    this.save();
  }

  public prepare(sql: string) {
    const self = this;
    const sqlLower = sql.trim().toLowerCase();

    return {
      run(...args: any[]) {
        if (sqlLower.startsWith('insert into topics')) {
          const id = args[0];
          const niche = args[1];
          const raw_title = args[2];
          const hook_concept = args[3] || '';
          const virality_score = Number(args[4] || 50);

          const isExplicitApproved = sqlLower.includes("'approved'") && !sqlLower.includes("'pending_approval'");
          const status = isExplicitApproved ? 'APPROVED' : 'PENDING_APPROVAL';

          const idx = self.data.topics.findIndex(t => t.id === id);
          const record: TopicRecord = {
            id,
            niche,
            raw_title,
            hook_concept,
            virality_score,
            status,
            created_at: new Date().toISOString(),
          };
          if (idx >= 0) self.data.topics[idx] = record;
          else self.data.topics.push(record);
          self.save();
          return { changes: 1 };
        }

        if (sqlLower.startsWith('update topics set status')) {
          const [status, id] = args;
          const topic = self.data.topics.find(t => t.id === id);
          if (topic) {
            topic.status = status;
            self.save();
          }
          return { changes: 1 };
        }

        if (sqlLower.startsWith('insert into video_jobs')) {
          const [id, topic_id, niche, status] = args;
          const record: VideoJobRecord = {
            id,
            topic_id,
            niche,
            status: status || 'QUEUED',
            created_at: new Date().toISOString(),
          };
          self.data.video_jobs.push(record);
          self.save();
          return { changes: 1 };
        }

        if (sqlLower.startsWith('update video_jobs set status = \'scripting\'')) {
          const [id] = args;
          const job = self.data.video_jobs.find(j => j.id === id);
          if (job) { job.status = 'SCRIPTING'; self.save(); }
          return { changes: 1 };
        }

        if (sqlLower.startsWith('update video_jobs set status = \'generating_assets\'')) {
          const [script_json, id] = args;
          const job = self.data.video_jobs.find(j => j.id === id);
          if (job) { job.status = 'GENERATING_ASSETS'; job.script_json = script_json; self.save(); }
          return { changes: 1 };
        }

        if (sqlLower.startsWith('update video_jobs set audio_url')) {
          const [audio_url, word_timestamps_json, id] = args;
          const job = self.data.video_jobs.find(j => j.id === id);
          if (job) { job.audio_url = audio_url; job.word_timestamps_json = word_timestamps_json; self.save(); }
          return { changes: 1 };
        }

        if (sqlLower.startsWith('update video_jobs set status = \'rendering\'')) {
          const [id] = args;
          const job = self.data.video_jobs.find(j => j.id === id);
          if (job) { job.status = 'RENDERING'; self.save(); }
          return { changes: 1 };
        }

        if (sqlLower.startsWith('update video_jobs set rendered_video_path')) {
          const [rendered_video_path, id] = args;
          const job = self.data.video_jobs.find(j => j.id === id);
          if (job) { job.rendered_video_path = rendered_video_path; self.save(); }
          return { changes: 1 };
        }

        if (sqlLower.startsWith('update video_jobs set status = \'published\'')) {
          const [youtube_video_id, id] = args;
          const job = self.data.video_jobs.find(j => j.id === id);
          if (job) { job.status = 'PUBLISHED'; job.youtube_video_id = youtube_video_id; self.save(); }
          return { changes: 1 };
        }

        return { changes: 0 };
      },

      get(...args: any[]) {
        if (sqlLower.includes('from topics where raw_title =')) {
          const title = args[0];
          return self.data.topics.find(t => t.raw_title === title) || null;
        }
        if (sqlLower.startsWith('select * from video_jobs where id = ?')) {
          const id = args[0];
          return self.data.video_jobs.find(j => j.id === id) || null;
        }
        if (sqlLower.startsWith('select * from topics where id = ?')) {
          const id = args[0];
          return self.data.topics.find(t => t.id === id) || null;
        }
        return null;
      },

      all(...args: any[]) {
        if (sqlLower.includes('from topics where status =')) {
          const targetStatus = (args[0] || (sqlLower.includes("'approved'") && !sqlLower.includes("'pending_approval'") ? 'APPROVED' : 'PENDING_APPROVAL'));
          return self.data.topics
            .filter(t => t.status === targetStatus)
            .sort((a, b) => b.virality_score - a.virality_score);
        }

        if (sqlLower.startsWith('select * from topics')) {
          return self.data.topics;
        }

        if (sqlLower.startsWith('select * from video_jobs')) {
          return self.data.video_jobs;
        }

        return [];
      }
    };
  }
}

let dbInstance: JsonDatabase | null = null;

export function getDatabase(): JsonDatabase {
  if (!dbInstance) {
    dbInstance = new JsonDatabase(DB_PATH);
    seedInitialTopicsIfEmpty();
  }
  return dbInstance;
}

export function seedInitialTopicsIfEmpty(): void {
  if (!dbInstance) return;
  const pending = dbInstance.prepare("SELECT * FROM topics WHERE status = 'PENDING_APPROVAL'").all();
  if (pending.length === 0) {
    const seedTopics = [
      { id: 'top_seed_1', niche: 'ancient_history', raw_title: 'Why Roman Concrete Lasted 2,000 Years', hook: 'Did you know 2,000-year-old Roman buildings repair themselves when it rains?', score: 96 },
      { id: 'top_seed_2', niche: 'tech_and_ai', raw_title: 'Quantum Computers Just Broke Encryption', hook: 'What happens when a computer solves a 1,000-year math problem in 3 seconds?', score: 94 },
      { id: 'top_seed_3', niche: 'sci_fi_space', raw_title: 'The James Webb Telescope Found an Impossible Structure', hook: 'Astronauts and scientists cannot explain what is glowing at the edge of the universe.', score: 92 },
      { id: 'top_seed_4', niche: 'business_stories', raw_title: 'How Red Bull Secretly Tricks Your Brain into Buying', hook: 'Red Bull spent zero dollars on traditional ads when launching. Here is how they won.', score: 90 },
      { id: 'top_seed_5', niche: 'human_relations', raw_title: 'The 3-Second Psychological Trick to Read Anyone', hook: 'How FBI interrogators spot deception before you even finish your sentence.', score: 89 },
    ];

    for (const t of seedTopics) {
      dbInstance.prepare(`
        INSERT INTO topics (id, niche, raw_title, hook_concept, virality_score, status)
        VALUES (?, ?, ?, ?, ?, 'PENDING_APPROVAL')
      `).run(t.id, t.niche, t.raw_title, t.hook, t.score);
    }
    console.log(`🌱 Seeded ${seedTopics.length} initial candidate topics into database.`);
  }
}

export function initializeDatabase(): void {
  getDatabase();
  console.log(`✅ Database initialized successfully at: ${DB_PATH}`);
}

import { fileURLToPath } from 'url';

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  initializeDatabase();
}
