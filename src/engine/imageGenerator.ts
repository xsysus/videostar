import { getGenAIClient } from '../config/genai.js';
import { ENV } from '../config/env.js';
import { StoryboardScene } from './storyboard.js';
import { WordTimestamp } from './voiceover.js';
import path from 'path';
import fs from 'fs';

export interface GeneratedSceneAsset {
  sceneNumber: number;
  imagePath: string;
  durationInFrames: number;
  zoomDirection: 'in' | 'out';
}

function extractSceneKeywords(prompt: string, narration: string): string[] {
  const combined = `${prompt} ${narration}`.toLowerCase();
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'from', 'up', 'about', 'into', 'over', 'after', 'did', 'you', 'know', 'that', 'this',
    'how', 'why', 'was', 'were', 'is', 'are', 'been', 'being', 'have', 'has', 'had', 'shot',
    'vertical', 'aspect', 'ratio', 'cinematic', 'resolution', 'photorealistic', 'frame', '8k'
  ]);

  const words = combined.replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const filtered = words.filter(w => w.length > 3 && !stopWords.has(w));
  const unique = Array.from(new Set(filtered));
  return unique.slice(0, 4);
}

export async function generateSceneImages(
  scenes: StoryboardScene[],
  jobId: string,
  fps = 30,
  wordTimestamps: WordTimestamp[] = []
): Promise<GeneratedSceneAsset[]> {
  const outputDir = path.join(process.cwd(), 'data', 'assets', jobId, 'images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const assets: GeneratedSceneAsset[] = [];
  let currentTimestampIdx = 0;
  const totalAudioDuration = wordTimestamps.length > 0 ? wordTimestamps[wordTimestamps.length - 1].end : 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const isLastScene = i === scenes.length - 1;
    const filePath = path.join(outputDir, `scene_${scene.scene_number}.png`);

    let sceneDurationSeconds = scene.duration_seconds || 4;

    if (wordTimestamps.length > 0) {
      const sceneWords = scene.narration_segment.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 0);
      const startWordIdx = currentTimestampIdx;
      currentTimestampIdx = Math.min(wordTimestamps.length - 1, currentTimestampIdx + sceneWords.length);

      const startTime = wordTimestamps[startWordIdx]?.start || 0;
      const endTime = isLastScene
        ? totalAudioDuration
        : (wordTimestamps[currentTimestampIdx]?.start || startTime + 4);

      sceneDurationSeconds = Math.max(1.5, endTime - startTime);
    }

    const durationInFrames = Math.round(sceneDurationSeconds * fps);
    let generated = false;

    // 1. Primary: Try Imagen 3 AI Image Generator
    const imagenModels = ['imagen-3.0-generate-002', 'imagen-3.0-fast-generate-001', 'imagen-3.0-generate-001'];
    for (const modelName of imagenModels) {
      try {
        const ai = getGenAIClient();
        const response = await ai.models.generateImages({
          model: modelName,
          prompt: `${scene.imagen_prompt}, vertical 9:16 aspect ratio, cinematic lighting, 8k resolution, photorealistic`,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: '9:16',
          },
        });

        if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image?.imageBytes) {
          const imageBytes = response.generatedImages[0].image.imageBytes;
          const buffer = Buffer.from(imageBytes, 'base64');
          fs.writeFileSync(filePath, buffer);
          console.log(`🖼️ Imagen 3 generated Scene ${scene.scene_number} (${modelName}, ${durationInFrames} frames) -> ${filePath}`);
          generated = true;
          break;
        }
      } catch (error) {
        // Try next model or fallback
      }
    }

    // 2. Secondary: Content-Matched Stock Photo Search (Pexels / Unsplash / Zero-Config Keyword Endpoint)
    if (!generated) {
      const keywords = extractSceneKeywords(scene.imagen_prompt, scene.narration_segment);
      console.log(`🔍 Seeking content-matched visual for Scene ${scene.scene_number} (${durationInFrames} frames) [Keywords: ${keywords.join(', ')}]...`);
      generated = await fetchContentMatchedImage(keywords, scene.scene_number, filePath);
    }

    // 3. Fallback: Atmospheric SVG Gradient Backdrop
    if (!generated) {
      createFallbackGradientBackdrop(filePath, scene);
    }

    assets.push({
      sceneNumber: scene.scene_number,
      imagePath: filePath,
      durationInFrames,
      zoomDirection: scene.scene_number % 2 === 0 ? 'in' : 'out',
    });
  }

  return assets;
}

async function fetchContentMatchedImage(
  keywords: string[],
  sceneNumber: number,
  outputPath: string
): Promise<boolean> {
  const queryStr = keywords.join(' ') || 'cinematic portrait';

  // Option A: Pexels API
  if (ENV.PEXELS_API_KEY) {
    try {
      const pexelsRes = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(queryStr)}&orientation=portrait&per_page=5`, {
        headers: { Authorization: ENV.PEXELS_API_KEY },
      });
      if (pexelsRes.ok) {
        const data = (await pexelsRes.json()) as any;
        if (data.photos && data.photos.length > 0) {
          const photoUrl = data.photos[(sceneNumber - 1) % data.photos.length].src.portrait;
          const imgRes = await fetch(photoUrl);
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            fs.writeFileSync(outputPath, buffer);
            console.log(`📷 Content-Matched Pexels Visual for Scene ${sceneNumber} -> ${outputPath}`);
            return true;
          }
        }
      }
    } catch (e: any) {
      console.warn(`⚠️ Pexels fetch warning: ${e.message}`);
    }
  }

  // Option B: Unsplash API
  if (ENV.UNSPLASH_ACCESS_KEY) {
    try {
      const unsplashRes = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(queryStr)}&orientation=portrait&per_page=5`, {
        headers: { Authorization: `Client-ID ${ENV.UNSPLASH_ACCESS_KEY}` },
      });
      if (unsplashRes.ok) {
        const data = (await unsplashRes.json()) as any;
        if (data.results && data.results.length > 0) {
          const photoUrl = data.results[(sceneNumber - 1) % data.results.length].urls.regular;
          const imgRes = await fetch(photoUrl);
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            fs.writeFileSync(outputPath, buffer);
            console.log(`📷 Content-Matched Unsplash Visual for Scene ${sceneNumber} -> ${outputPath}`);
            return true;
          }
        }
      }
    } catch (e: any) {
      console.warn(`⚠️ Unsplash fetch warning: ${e.message}`);
    }
  }

  // Option C: Zero-Config Keyword Image Search Endpoint
  try {
    const zeroConfigUrl = `https://loremflickr.com/1080/1920/${encodeURIComponent(keywords.slice(0, 2).join(','))}`;
    const imgRes = await fetch(zeroConfigUrl, { redirect: 'follow' });
    if (imgRes.ok) {
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      fs.writeFileSync(outputPath, buffer);
      console.log(`📷 Content-Matched Keyword Visual for Scene ${sceneNumber} -> ${outputPath}`);
      return true;
    }
  } catch (e: any) {
    console.warn(`⚠️ Keyword image download warning: ${e.message}`);
  }

  return false;
}

function createFallbackGradientBackdrop(filePath: string, scene: StoryboardScene): void {
  const svgContent = `
<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="60%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="20" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <circle cx="540" cy="700" r="350" fill="#38bdf8" opacity="0.12" filter="url(#glow)"/>
  <circle cx="300" cy="1100" r="250" fill="#f59e0b" opacity="0.08" filter="url(#glow)"/>
</svg>
  `.trim();

  fs.writeFileSync(filePath, svgContent);
  console.log(`🖼️ Created Atmospheric Gradient Backdrop for Scene ${scene.scene_number} -> ${filePath}`);
}
