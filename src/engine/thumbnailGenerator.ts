import { getGenAIClient, GENAI_MODELS } from '../config/genai.js';
import path from 'path';
import fs from 'fs';

export async function generateThumbnail(
  prompt: string,
  overlayText: string,
  jobId: string
): Promise<string> {
  const outputDir = path.join(process.cwd(), 'data', 'assets', jobId, 'thumbnails');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const thumbnailPath = path.join(outputDir, 'thumbnail.png');

  try {
    const ai = getGenAIClient();
    const response = await ai.models.generateImages({
      model: GENAI_MODELS.IMAGEN_3,
      prompt: `${prompt}, high contrast hero thumbnail, ultra sharp focus, dramatic lighting`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '16:9',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const imageBytes = response.generatedImages[0].image.imageBytes;
      const buffer = Buffer.from(imageBytes, 'base64');
      fs.writeFileSync(thumbnailPath, buffer);
      console.log(`🖼️ Imagen 3 Thumbnail generated -> ${thumbnailPath}`);
      return thumbnailPath;
    }
  } catch (error) {
    console.warn(`⚠️ Imagen 3 API unavailable for thumbnail, creating SVG fallback:`, (error as any).message);
  }

  // Fallback high-impact SVG thumbnail generator
  const svgContent = `
<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#311b92" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000" flood-opacity="0.9"/>
    </filter>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <circle cx="640" cy="360" r="280" fill="#FFE600" opacity="0.1" />
  <text x="640" y="380" font-family="Impact, sans-serif" font-size="84" font-weight="900" fill="#FFE600" text-anchor="middle" filter="url(#shadow)">
    ${escapeXml(overlayText.toUpperCase())}
  </text>
</svg>
  `.trim();

  fs.writeFileSync(thumbnailPath, svgContent);
  console.log(`🖼️ Fallback SVG Thumbnail created -> ${thumbnailPath}`);
  return thumbnailPath;
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
