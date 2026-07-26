import { getGenAIClient } from '../config/genai.js';
import { StoryboardScene } from './storyboard.js';
import { WordTimestamp } from './voiceover.js';
import { ENV } from '../config/env.js';
import path from 'path';
import fs from 'fs';

export interface GeneratedSceneAsset {
  sceneNumber: number;
  imagePath: string;
  durationInFrames: number;
  zoomDirection: 'in' | 'out';
}

/**
 * Extract 3-5 high-relevance search keywords from scene narration and visual prompt.
 */
export function extractSceneKeywords(prompt: string, narration: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'over', 'after', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'shot', 'frame',
    'vertical', '9:16', 'cinematic', 'resolution', 'photorealistic', 'dramatic', 'lighting',
    'golden', 'hour', 'close-up', 'wide', 'angle', 'view', '8k', 'high', 'quality',
  ]);

  const rawWords = `${narration} ${prompt}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/);

  const keywords: string[] = [];
  for (const word of rawWords) {
    if (word.length >= 4 && !stopWords.has(word) && !keywords.includes(word)) {
      keywords.push(word);
      if (keywords.length >= 4) break;
    }
  }

  return keywords.length > 0 ? keywords : ['abstract', 'cinematic'];
}

export async function generateSceneImages(
  scenes: StoryboardScene[],
  jobId: string,
  fps = 30,
  wordTimestamps: WordTimestamp[] = [],
  forceRefresh = false
): Promise<GeneratedSceneAsset[]> {
  const outputDir = path.join(process.cwd(), 'data', 'assets', jobId, 'images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const assets: GeneratedSceneAsset[] = [];
  const totalAudioDuration = wordTimestamps.length > 0
    ? wordTimestamps[wordTimestamps.length - 1].end
    : 45;

  let currentTimestampIdx = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const isLastScene = i === scenes.length - 1;
    const filePath = path.join(outputDir, `scene_${scene.scene_number}.png`);

    let sceneDurationSeconds = scene.duration_seconds || 4;

    if (wordTimestamps.length > 0) {
      const sceneWords = scene.narration_segment.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w: string) => w.length > 0);
      const startWordIdx = currentTimestampIdx;
      currentTimestampIdx = Math.min(wordTimestamps.length - 1, currentTimestampIdx + sceneWords.length);

      const startTime = wordTimestamps[startWordIdx]?.start || 0;
      const endTime = isLastScene
        ? totalAudioDuration
        : (wordTimestamps[currentTimestampIdx]?.start || startTime + 4);

      sceneDurationSeconds = Math.max(1.5, endTime - startTime);
    }

    const durationInFrames = Math.round(sceneDurationSeconds * fps);

    // Check disk cache first unless forceRefresh is true
    if (!forceRefresh && fs.existsSync(filePath) && fs.statSync(filePath).size > 100) {
      console.log(`♻️ Reusing cached scene visual for Scene ${scene.scene_number} (${durationInFrames} frames) -> ${filePath}`);
      assets.push({
        sceneNumber: scene.scene_number,
        imagePath: filePath,
        durationInFrames,
        zoomDirection: scene.scene_number % 2 === 0 ? 'in' : 'out',
      });
      continue;
    }

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
  filePath: string
): Promise<boolean> {
  const query = encodeURIComponent(keywords.join(' '));

  // A. Pexels API
  if (ENV.PEXELS_API_KEY && ENV.PEXELS_API_KEY !== 'your_pexels_api_key_here') {
    try {
      const res = await fetch(`https://api.pexels.com/v1/search?query=${query}&orientation=portrait&per_page=5`, {
        headers: { Authorization: ENV.PEXELS_API_KEY },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.photos && data.photos.length > 0) {
          const photoUrl = data.photos[0].src.large2x || data.photos[0].src.large;
          const imgRes = await fetch(photoUrl);
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            fs.writeFileSync(filePath, buffer);
            console.log(`📷 Content-Matched Pexels Visual for Scene ${sceneNumber} -> ${filePath}`);
            return true;
          }
        }
      }
    } catch (e: any) {
      console.warn(`⚠️ Pexels API failed: ${e.message}`);
    }
  }

  // B. Unsplash API
  if (ENV.UNSPLASH_ACCESS_KEY && ENV.UNSPLASH_ACCESS_KEY !== 'your_unsplash_access_key_here') {
    try {
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${query}&orientation=portrait&per_page=5`, {
        headers: { Authorization: `Client-ID ${ENV.UNSPLASH_ACCESS_KEY}` },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.results && data.results.length > 0) {
          const photoUrl = data.results[0].urls.regular;
          const imgRes = await fetch(photoUrl);
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            fs.writeFileSync(filePath, buffer);
            console.log(`📷 Content-Matched Unsplash Visual for Scene ${sceneNumber} -> ${filePath}`);
            return true;
          }
        }
      }
    } catch (e: any) {
      console.warn(`⚠️ Unsplash API failed: ${e.message}`);
    }
  }

  // C. Unsplash Source Public Keyword Fallback
  try {
    const fallbackUrl = `https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1080&h=1920&q=80`;
    const imgRes = await fetch(fallbackUrl);
    if (imgRes.ok) {
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      console.log(`📷 Content-Matched Keyword Visual for Scene ${sceneNumber} -> ${filePath}`);
      return true;
    }
  } catch (e) {}

  return false;
}

function createFallbackGradientBackdrop(filePath: string, scene: StoryboardScene): void {
  const gradients = [
    { start: '#1e3c72', end: '#2a5298' },
    { start: '#0f2027', end: '#2c5364' },
    { start: '#373b44', end: '#4286f4' },
    { start: '#11998e', end: '#38ef7d' },
    { start: '#8e2de2', end: '#4a00e0' },
  ];
  const g = gradients[(scene.scene_number - 1) % gradients.length];

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${g.start}"/>
          <stop offset="100%" stop-color="${g.end}"/>
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#bg)"/>
      <circle cx="540" cy="960" r="300" fill="white" opacity="0.05"/>
      <text x="540" y="960" font-family="sans-serif" font-size="42" font-weight="bold" fill="white" text-anchor="middle" opacity="0.8">Scene ${scene.scene_number}</text>
    </svg>
  `.trim();

  fs.writeFileSync(filePath, Buffer.from(svgContent));
  console.log(`🎨 Gradient SVG Visual created for Scene ${scene.scene_number} -> ${filePath}`);
}
