# 🎬 VideoStar - Automated YouTube Video Creation Platform

[![OpenSpec](https://img.shields.io/badge/OpenSpec-spec--driven-blue.svg)](openspec/changes/automated-youtube-video-platform)
[![Docker](https://img.shields.io/badge/Docker-ready-blue)](docker-compose.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](package.json)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**VideoStar** is an end-to-end, human-in-the-loop automated YouTube video creation platform. It monitors internet trends 24/7, scores topics for virality, generates 45-second scripts, renders 1080x1920 vertical Shorts via **Remotion**, generates **Imagen 3** visuals, and publishes videos to YouTube—requiring only **one click** from you to approve topics.

---

## 🌟 Key Features

- **🛰️ 24/7 Trend Scraper & Virality Scorer**: Scrapes Reddit subreddits and trend feeds across 8 curated niches, scoring candidate topics (1–100) using **Gemini 1.5 Flash**.
- **🎯 1-Click Human Approval Control Center**: Embedded dark-mode Tailwind web UI at `http://localhost:3000/` for approving topics, rejecting candidates, or submitting custom video ideas.
- **📜 Hook-First Scriptwriting & Imagen 3 Storyboard**: Generates high-retention 45-second scripts with curiosity hooks in the first 1.5 seconds + scene-by-scene 9:16 **Imagen 3** prompts across 100+ languages.
- **🎥 Remotion 9:16 Rendering Engine**: 
  - Smooth **Ken Burns** pan/zoom image interpolations.
  - TikTok-style kinetic pop-up word captions synced to TTS timestamps.
  - Dynamic retention progress bars and custom niche badge overlays.
  - Multi-track audio engine with voiceover, auto-ducked background music, and transition sound effects.
- **📡 YouTube Publishing & AI Thumbnail Engine**: Auto-generates high-CTR thumbnails with bold text overlays, search-optimized SEO metadata (titles, descriptions, tags), and schedules uploads via YouTube Data API v3.

---

## 🏗️ Architecture Overview

```
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                        1. TREND & TOPIC ENGINE                          │
 │  • Reddit API & RSS trend scrapers                                       │
 │  • Gemini 1.5 Flash virality scoring & deduplication                    │
 │  • User Approval Queue Dashboard (1-click Approve / Reject / Tweak)     │
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                 2. SCRIPTWRITER & STORYBOARD ENGINE                     │
 │  • Gemini 1.5 Pro Hook-first 45s script (120-140 words)                 │
 │  • Multilingual (EN, ES, DE, PT, etc.) & Tone presets (Tactical, Warm)  │
 │  • Imagen 3 9:16 visual prompts (10-12 scenes)                           │
 │  • TTS Voiceover + Word-level Timestamps JSON                           │
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                     3. REMOTION VIDEO RENDERER                          │
 │  • Ken Burns pan/zoom image animations                                  │
 │  • Kinetic pop-up dynamic captions with spring physics                  │
 │  • Niche-specific styling presets & progress bar                        │
 │  • Multi-track audio with auto-ducked background music & transition SFX  │
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                   4. YOUTUBE PUBLISHING & SEO ENGINE                    │
 │  • Gemini SEO Metadata (High-CTR Title, Description, Tags)              │
 │  • Imagen 3 AI Thumbnail + Remotion Text Overlay                        │
 │  • YouTube Data API v3 OAuth auto-upload & scheduling                   │
 └─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Curated Niche Portfolio

| Niche ID | Name | Focus | Preset Aesthetic |
| :--- | :--- | :--- | :--- |
| `ancient_history` | Ancient History & Curiosities | Unexplained anomalies, ancient tech | Parchment Gold & Dark Umber |
| `tech_and_ai` | Tech, AI & Future Tech | Mind-bending AI tools, quantum tech | Neon Cyan & Deep Space |
| `business_stories` | Business & Financial Stories | Corporate rivalries, wealth tricks | Emerald Green & Charcoal |
| `sci_fi_space` | Sci-Fi, Space & Astronomy | Black holes, Fermi paradox, cosmos | Electric Violet & Cosmic Black |
| `human_relations` | Human Relations & Psychology | Dark psychology, cognitive biases | Crimson Coral & Dark Night |
| `modern_warfare` | Modern Warfare & Tactics | Stealth aircraft, military strategy | Tactical Gold & Slate |
| `survival_feats` | Survival & Extreme Feats | Miraculous survival, disaster logs | Burning Amber & Dark Rust |
| `everyday_science` | Everyday Science | Microscopic science, biological quirks | Bright Teal & Deep Obsidian |

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js 20+](https://nodejs.org/) or [Docker & Docker Compose](https://www.docker.com/)
- [Google AI Studio API Key](https://aistudio.google.com/) (Required for Gemini & Imagen 3)

---

### Option A: Local Running (Node.js)

1. **Clone the repository**:
   ```bash
   git clone git@github.com-xsysus:xsysus/videostar.git
   cd videostar
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env and paste your GEMINI_API_KEY
   ```

4. **Initialize Database & Start Server**:
   ```bash
   npm run db:init
   npm start
   ```

5. **Open Control Center**:
   Navigate to **[http://localhost:3000/](http://localhost:3000/)** in your browser!

---

### Option B: Docker Compose (Recommended for Servers)

1. **Configure `.env`**:
   ```bash
   cp .env.example .env
   # Edit .env and paste your GEMINI_API_KEY
   ```

2. **Launch with Docker Compose**:
   ```bash
   docker compose up --build -d
   ```

3. **View Logs**:
   ```bash
   docker logs -f videostar_app
   ```

---

## 📂 Project Structure

```
videostar/
├── Dockerfile                   # Node 20 + Chromium container definition
├── docker-compose.yml           # Docker Compose orchestration
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript & JSX configuration
├── openspec/                    # OpenSpec change specifications & proposals
│   └── changes/automated-youtube-video-platform/
└── src/
    ├── config/                  # Niche presets, environment & GenAI SDK configs
    │   ├── env.ts
    │   ├── genai.ts
    │   └── niches.ts
    ├── db/                      # Zero-native-dependency JSON DB engine
    │   └── init.ts
    ├── engine/                  # Core AI & Video Generation modules
    │   ├── viralityScorer.ts    # Gemini trend scoring & deduplication
    │   ├── storyboard.ts        # Gemini scriptwriter & storyboarder
    │   ├── imageGenerator.ts    # Imagen 3 scene visual generator
    │   ├── voiceover.ts         # TTS Voice & word timestamp engine
    │   ├── remotionRenderer.ts  # @remotion/renderer MP4 exporter
    │   ├── seoGenerator.ts      # Gemini SEO metadata generator
    │   └── thumbnailGenerator.ts# Imagen 3 thumbnail overlay generator
    ├── remotion/                # Remotion React compositions & components
    │   ├── DynamicCaptions.tsx  # Pop-up kinetic word captions
    │   ├── KenBurnsImage.tsx    # Interpolated pan/zoom motion
    │   ├── Overlays.tsx         # Progress bar, niche badge, audio engine
    │   ├── MainShortComposition.tsx
    │   └── index.ts
    ├── publisher/               # YouTube Data API upload module
    │   └── youtube.ts
    ├── pipeline.ts              # End-to-end production orchestrator
    └── server.ts                # HTTP API & Tailwind Approval Dashboard UI
```

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
