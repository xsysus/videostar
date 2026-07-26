# Tasks: Automated YouTube Video Creation Platform

## Phase 1: Core Foundation & Data Layer
- [x] 1.1 Initialize project workspace with database schemas (SQLite / PostgreSQL) for topics, video_jobs, and youtube_channels.
- [x] 1.2 Setup Google GenAI SDK configuration with Gemini 1.5/2.0 Flash/Pro and Imagen 3 API keys.
- [x] 1.3 Create Niche Configuration system supporting all 8 target niches, color themes, fonts, and voice presets.

## Phase 2: Trend & Topic Finder Engine
- [x] 2.1 Implement AsyncPRAW Reddit scraper for niche subreddits (todayilearned, technology, space, psychology, etc.).
- [x] 2.2 Implement Gemini Virality Scorer & Deduplication check.
- [x] 2.3 Build lightweight Next.js / Tailwind Approval Dashboard with 1-click Approve, Reject, and Custom Topic input.

## Phase 3: Scriptwriter & Asset Generation Pipeline
- [x] 3.1 Implement Gemini 1.5 Pro Storyboard Generator returning structured JSON script, scene breakdown, and 9:16 Imagen 3 prompts.
- [x] 3.2 Implement Imagen 3 parallel image generation worker saving 9:16 PNGs to asset storage.
- [x] 3.3 Implement TTS Voiceover integration (ElevenLabs / OpenAI Audio) returning MP3 voiceover and word-level timestamps JSON.
- [x] 3.4 Support multilingual script translation and voice persona selection per niche.

## Phase 4: Remotion Video Rendering Engine
- [x] 4.1 Create Remotion project setup with 1080x1920 9:16 composition.
- [x] 4.2 Build `KenBurnsImage` component with smooth `interpolate` pan/zoom animations.
- [x] 4.3 Build `DynamicCaptions` kinetic pop-up word component with `spring` physics and custom font styling.
- [x] 4.4 Build `VideoProgressBar`, `NicheBadge`, and `AudioEngine` (auto-ducking BGM + Whoosh SFX).
- [x] 4.5 Implement Node.js `@remotion/renderer` build script to render 1080p MP4 from input JSON props.

## Phase 5: YouTube Publishing & SEO Automation
- [x] 5.1 Implement Gemini SEO Metadata Generator (Titles, Descriptions, Tags).
- [x] 5.2 Implement AI Thumbnail Engine combining Imagen 3 hero image with bold Remotion text overlay.
- [x] 5.3 Integrate YouTube Data API v3 OAuth 2.0 client for automated chunked video uploading and scheduling.
- [x] 5.4 Perform end-to-end integration test from Topic Approval to Scheduled YouTube Video.
