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

    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateImages({
        model: GENAI_MODELS.IMAGEN_3,
        prompt: `${scene.imagen_prompt}, vertical 9:16 ratio, 8k resolution, highly detailed`,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '9:16',
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        const imageBytes = response.generatedImages[0].image.imageBytes;
        const buffer = Buffer.from(imageBytes, 'base64');
        fs.writeFileSync(filePath, buffer);
        console.log(`🖼️ Generated Imagen 3 Scene ${scene.scene_number} -> ${filePath}`);
      } else {
        createFallbackPlaceholder(filePath, scene);
      }
    } catch (error) {
      console.warn(`⚠️ Imagen 3 API unavailable for scene ${scene.scene_number}, creating high-contrast placeholder:`, (error as any).message);
      createFallbackPlaceholder(filePath, scene);
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

function createFallbackPlaceholder(filePath: string, scene: StoryboardScene): void {
  // Generates a clean 1080x1920 SVG placeholder for local testing / offline mode
  const svgContent = `
<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <circle cx="540" cy="800" r="300" fill="#3b82f6" opacity="0.15" />
  <text x="540" y="900" font-family="sans-serif" font-size="64" font-weight="bold" fill="#f8fafc" text-anchor="middle">Scene ${scene.scene_number}</text>
  <text x="540" y="1000" font-family="sans-serif" font-size="32" fill="#94a3b8" text-anchor="middle" width="800">${escapeXml(scene.narration_segment.substring(0, 50))}...</text>
</svg>
  `.trim();

  fs.writeFileSync(filePath, svgContent);
  console.log(`🖼️ Created Scene ${scene.scene_number} Placeholder -> ${filePath}`);
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
