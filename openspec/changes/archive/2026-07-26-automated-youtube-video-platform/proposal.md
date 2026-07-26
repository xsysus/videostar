# Proposal: Automated YouTube Video Creation Platform

## Executive Summary

Build a human-in-the-loop, automated YouTube video creation platform that generates high-retention videos with minimal manual effort. The system monitors trends, proposes video topics across curated niches, and generates complete scripts, voiceovers, scene visuals, Remotion-rendered videos, SEO metadata, and AI thumbnails—requiring only one-click approval from the user.

## Scope & Phasing

- **Phase 1 (Initial Focus)**: YouTube Shorts (9:16 vertical format, 30–60 seconds length). Highly optimized for fast rendering, virality, dynamic pop-up captions, and high retention.
- **Phase 2 (Future Extension)**: Long-form YouTube videos (16:9 horizontal format, 5–12 minutes length) using the same core topic, scriptwriting, and rendering pipeline.

## Target Niche Portfolio

1. **Ancient History & Historical Curiosities**: Unexplained anomalies, ancient engineering secrets, bizarre historical events.
2. **Tech, AI & Future Innovations**: Mind-bending tech breakthroughs, AI tools, futurism.
3. **Business & Financial Stories**: Corporate rivalries, marketing genius, wealth breakdowns.
4. **Sci-Fi, Space & Astronomy**: Cosmic mysteries, black holes, Fermi Paradox.
5. **Human Relations & Psychology**: Dark psychology, body language, social paradoxes.
6. **Modern Warfare & Tactical Tech**: Stealth aircraft, military strategy, weapon engineering.
7. **Survival & Extreme Human Feats**: Miraculous survival stories, extreme endurance.
8. **Everyday Science & "Did You Know"**: Microscopic science, biological quirks.

## Resource & Hardware Strategy

- **Google AI Pro (Gemini 1.5/2.0 & Imagen 3)**: Scriptwriting, scene storyboarding, multilingual translation, SEO generation, and 9:16 AI image generation.
- **Remote Linux Server (20–64GB RAM)**: 24/7 background trend scraper (Reddit, Google Trends, YouTube API), database host, web dashboard server, and headless rendering node.
- **MacBook Pro M2 (32GB RAM)**: Local development, instant React/Remotion component previews, and M2 Metal GPU accelerated video rendering.

## Core System Architecture

```
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                        1. TREND & TOPIC ENGINE                          │
 │  • Reddit API, Google Trends, YouTube Data API trend scrapers           │
 │  • Gemini 1.5 Flash virality scoring & deduplication                    │
 │  • User Approval Queue Dashboard (1-click Approve / Reject / Tweak)     │
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                 2. SCRIPTWRITER & STORYBOARD ENGINE                     │
 │  • Gemini Hook-first 45s script (120-140 words)                         │
 │  • Multilingual (EN, ES, DE, PT, etc.) & Tone presets (Tactical, Warm)  │
 │  • Imagen 3 9:16 visual prompts (10-12 scenes)                           │
 │  • TTS Voiceover + Word-level Timestamps JSON                           │
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                     3. REMOTION VIDEO RENDERER                          │
 │  • Ken Burns pan/zoom image animations                                  │
 │  • TikTok-style kinetic pop-up dynamic captions                         │
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

## Success Metrics

- **Minimal Touchpoint**: User spends < 1 minute per video (only approving or tweaking topics).
- **Fast Production**: Entire pipeline executes in < 30 seconds from approval to final MP4 render.
- **Cost Efficiency**: Leveraging existing Gemini AI Pro subscription and owned hardware ($0 SaaS video generation overhead).
