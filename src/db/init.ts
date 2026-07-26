import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'platform_db.json');

export interface DbStore {
  topics: any[];
  video_jobs: any[];
  youtube_channels: any[];
}

class JsonDatabase {
  private dbPath: string;
  private data: DbStore;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(dbPath)) {
      try {
        const raw = fs.readFileSync(dbPath, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (e) {
        this.data = { topics: [], video_jobs: [], youtube_channels: [] };
      }
    } else {
      this.data = { topics: [], video_jobs: [], youtube_channels: [] };
      this.save();
    }
  }

  private save(): void {
    fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
  }

  public exec(sql: string): void {
    // Initialization no-op for JSON DB
    this.save();
  }

  public prepare(sql: string) {
    const self = this;

    return {
      run(...args: any[]) {
        const sqlLower = sql.toLowerCase().trim();

        if (sqlLower.startsWith('insert into topics')) {
          const [id, niche, raw_title, hook_concept, virality_score, status, ai_analysis_json] = args;
          const newTopic = {
            id,
            niche,
            raw_title,
            hook_concept: hook_concept || raw_title,
            virality_score: virality_score || 70,
            status: status || 'PENDING_APPROVAL',
            ai_analysis_json: ai_analysis_json || '{}',
            created_at: new Date().toISOString(),
          };
          // Deduplicate by raw_title
          self.data.topics = self.data.topics.filter(t => t.raw_title !== raw_title);
          self.data.topics.push(newTopic);
          self.save();
          return { changes: 1 };
        }

        if (sqlLower.startsWith('update topics')) {
          if (sqlLower.includes('status = \'approved\'')) {
            const topicId = args[0];
            const topic = self.data.topics.find(t => t.id === topicId);
            if (topic) topic.status = 'APPROVED';
          } else if (sqlLower.includes('status = \'rejected\'')) {
            const topicId = args[0];
            const topic = self.data.topics.find(t => t.id === topicId);
            if (topic) topic.status = 'REJECTED';
          } else if (sqlLower.includes('status = \'produced\'')) {
            const topicId = args[0];
            const topic = self.data.topics.find(t => t.id === topicId);
            if (topic) topic.status = 'PRODUCED';
          }
          self.save();
          return { changes: 1 };
        }

        if (sqlLower.startsWith('insert into video_jobs')) {
          const [id, topic_id, niche, status] = args;
          const newJob = {
            id,
            topic_id,
            niche,
            language: 'en-US',
            tone_style: 'standard',
            status: status || 'QUEUED',
            script_json: null,
            audio_url: null,
            word_timestamps_json: null,
            rendered_video_path: null,
            youtube_video_id: null,
            created_at: new Date().toISOString(),
          };
          self.data.video_jobs.push(newJob);
          self.save();
          return { changes: 1 };
        }

        if (sqlLower.startsWith('update video_jobs')) {
          const jobId = args[args.length - 1];
          const job = self.data.video_jobs.find(j => j.id === jobId);
          if (job) {
            if (sqlLower.includes('status = \'scripting\'')) job.status = 'SCRIPTING';
            if (sqlLower.includes('status = \'generating_assets\'')) {
              job.status = 'GENERATING_ASSETS';
              job.script_json = args[0];
            }
            if (sqlLower.includes('audio_url =')) {
              job.audio_url = args[0];
              job.word_timestamps_json = args[1];
            }
            if (sqlLower.includes('status = \'rendering\'')) job.status = 'RENDERING';
            if (sqlLower.includes('rendered_video_path =')) job.rendered_video_path = args[0];
            if (sqlLower.includes('status = \'published\'')) {
              job.status = 'PUBLISHED';
              job.youtube_video_id = args[0];
            }
            self.save();
          }
          return { changes: 1 };
        }

        if (sqlLower.startsWith('insert into youtube_channels')) {
          const [id, channel_name, niche, language, credentials_json, default_privacy_status] = args;
          self.data.youtube_channels.push({
            id, channel_name, niche, language, credentials_json, default_privacy_status
          });
          self.save();
          return { changes: 1 };
        }

        return { changes: 0 };
      },

      get(...args: any[]) {
        const sqlLower = sql.toLowerCase().trim();

        if (sqlLower.startsWith('select id from topics where raw_title =')) {
          const rawTitle = args[0];
          return self.data.topics.find(t => t.raw_title === rawTitle);
        }

        if (sqlLower.startsWith('select * from topics where id =')) {
          const topicId = args[0];
          return self.data.topics.find(t => t.id === topicId);
        }

        if (sqlLower.startsWith('select * from video_jobs where id =')) {
          const jobId = args[0];
          return self.data.video_jobs.find(j => j.id === jobId);
        }

        if (sqlLower.startsWith('select * from youtube_channels')) {
          if (args.length > 0) {
            return self.data.youtube_channels.find(c => c.id === args[0]);
          }
          return self.data.youtube_channels[0] || null;
        }

        return null;
      },

      all(...args: any[]) {
        const sqlLower = sql.toLowerCase().trim();

        if (sqlLower.startsWith('select * from topics')) {
          const status = args[0] || 'PENDING_APPROVAL';
          return self.data.topics
            .filter(t => t.status === status)
            .sort((a, b) => b.virality_score - a.virality_score);
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
  }
  return dbInstance;
}

export function initializeDatabase(): void {
  const db = getDatabase();
  db.exec('');
  console.log(`✅ Database initialized successfully at: ${DB_PATH}`);
}

if (require.main === module) {
  initializeDatabase();
}
