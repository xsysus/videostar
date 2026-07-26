# Design Specification: Automated YouTube Video Creation Platform

## System Architecture

```
                               ┌────────────────────────────────┐
                               │  User Dashboard (Next.js/React)│
                               └───────────────┬────────────────┘
                                               │ (API Requests)
                                               ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         BACKEND SERVICE LAYER (Node.js/Python)              │
 │                                                                             │
 │ ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────┐ │
 │ │  Trend Scraper Worker│  │  AI Storyboard Engine│  │  Remotion Renderer │ │
 │ │  (Reddit/Trends/YT)  │  │  (Gemini + Imagen 3) │  │  (M2/Server Metal) │ │
 │ └──────────┬───────────┘  └──────────┬───────────┘  └─────────┬──────────┘ │
 └────────────┼─────────────────────────┼────────────────────────┼────────────┘
              │                         │                        │
              ▼                         ▼                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                          DATABASE & ASSETS STORAGE                          │
 │  • SQLite / PostgreSQL (Topics, Channels, Video Metadata, Render Status)   │
 │  • File System / S3 (/tmp/assets/audio, /tmp/assets/images, /tmp/renders)   │
 └─────────────────────────────────────────────────────────────────────────────┘
```

## Data Schema & Models

### SQL Schema (SQLite / PostgreSQL)

```sql
-- Topic Approval Queue Table
CREATE TABLE topics (
    id TEXT PRIMARY KEY,
    niche TEXT NOT NULL,
    raw_title TEXT UNIQUE NOT NULL,
    hook_concept TEXT,
    virality_score INTEGER NOT NULL,
    status TEXT CHECK(status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PRODUCED')) DEFAULT 'PENDING_APPROVAL',
    ai_analysis_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Video Generation Jobs Table
CREATE TABLE video_jobs (
    id TEXT PRIMARY KEY,
    topic_id TEXT REFERENCES topics(id),
    niche TEXT NOT NULL,
    language TEXT DEFAULT 'en-US',
    tone_style TEXT DEFAULT 'standard',
    status TEXT CHECK(status IN ('QUEUED', 'SCRIPTING', 'GENERATING_ASSETS', 'RENDERING', 'READY_FOR_PUBLISH', 'PUBLISHED', 'FAILED')),
    script_json TEXT,
    audio_url TEXT,
    word_timestamps_json TEXT,
    rendered_video_path TEXT,
    youtube_video_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- YouTube Channel Configuration
CREATE TABLE youtube_channels (
    id TEXT PRIMARY KEY,
    channel_name TEXT NOT NULL,
    niche TEXT NOT NULL,
    language TEXT DEFAULT 'en-US',
    credentials_json TEXT NOT NULL,
    default_privacy_status TEXT DEFAULT 'scheduled'
);
```

## Data Contracts & JSON Schemas

### Gemini Storyboard Engine Output Contract

```typescript
export interface StoryboardScene {
  scene_number: number;
  narration_segment: string;
  duration_seconds: number;
  imagen_prompt: string;
  motion_type: "zoom_in" | "zoom_out" | "pan_left" | "pan_right";
}

export interface StoryboardOutput {
  title: string;
  target_duration_seconds: number;
  niche: string;
  language: string;
  full_narration: string;
  scenes: StoryboardScene[];
}
```

### Remotion Render Input Props Contract

```typescript
export interface RemotionWordTimestamp {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface RemotionRenderProps {
  niche: string;
  theme: {
    primaryColor: string;
    backgroundColor: string;
    fontFamily: string;
    badgeText: string;
  };
  audioUrl: string;
  scenes: Array<{
    imageUrl: string;
    durationInFrames: number;
    zoomDirection: "in" | "out";
  }>;
  words: RemotionWordTimestamp[];
  sfxWhooshUrl?: string;
  bgmUrl?: string;
}
```

## Remotion Component Hierarchy

```
<MainShortComposition>
  ├── <AudioEngine> (Voiceover + Auto-Ducked BGM + Transition SFX)
  ├── <SequenceContainer>
  │     └── <Sequence> (Per scene)
  │           └── <KenBurnsImage> (Zoom/Pan Interpolation)
  ├── <NicheBadge> (Top-left overlay pill)
  ├── <VideoProgressBar> (Top retention progress bar)
  └── <DynamicCaptions> (Pop-up active word with spring bounce)
```

## API Integrations

1. **Google GenAI API (Gemini 1.5/2.0 & Imagen 3)**: `google-genai` SDK for script generation & 9:16 image generation.
2. **TTS Service**: ElevenLabs / OpenAI Audio API / Google Cloud TTS for voiceover & word timestamps.
3. **Trend Scraping**: AsyncPRAW (Reddit), Google Trends RSS, YouTube Data API.
4. **YouTube Publishing**: `google-api-python-client` / `googleapis` OAuth 2.0.
