import { getGenAIClient, GENAI_MODELS } from '../config/genai.js';
import { StoryboardScene } from './storyboard.js';
import path from 'path';
import fs from 'fs';

export interface GeneratedSceneAsset {
  sceneNumber: number;
  imagePath: string;
  durationInFrames: number;
  zoomDirection: 'in' | 'out';
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export async function generateSceneImages(
  scenes: StoryboardScene[],
  jobId: string,
  fps = 30
): Promise<GeneratedSceneAsset[]> {
  const outputDir = path.join(process.cwd(), 'data', 'assets', jobId, 'images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const assets: GeneratedSceneAsset[] = [];

  for (const scene of scenes) {
    const filePath = path.join(outputDir, `scene_${scene.scene_number}.png`);
    const durationInFrames = Math.round((scene.duration_seconds || 4) * fps);

    let generated = false;

    // 1. Try Imagen 3 API models
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
          console.log(`🖼️ Imagen 3 generated Scene ${scene.scene_number} (${modelName}) -> ${filePath}`);
          generated = true;
          break;
        }
      } catch (error) {
        // Try next model or fallback
      }
    }

    // 2. If Imagen 3 API is unavailable/rate-limited, download high-res photographic visual
    if (!generated) {
      await createFallbackPlaceholder(filePath, scene, jobId);
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

async function createFallbackPlaceholder(filePath: string, scene: StoryboardScene, jobId: string): Promise<void> {
  try {
    const seed = Math.abs(hashString(`${jobId}_${scene.scene_number}`));
    const imageUrl = `https://picsum.photos/seed/${seed}/1080/1920`;
    const res = await fetch(imageUrl, { redirect: 'follow' });

    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      console.log(`📷 Downloaded HD Photographic Visual for Scene ${scene.scene_number} -> ${filePath}`);
      return;
    }
  } catch (e) {
    // Ignore network error and render rich cinematic gradient
  }

  // Rich cinematic gradient SVG backdrop (no text overlay)
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
  console.log(`🖼️ Created Cinematic SVG Backdrop for Scene ${scene.scene_number} -> ${filePath}`);
}
