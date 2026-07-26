import { getGenAIClient, GENAI_MODELS } from '../config/genai.js';
import { getNicheConfig } from '../config/niches.js';

export interface YoutubeSeoMetadata {
  title: string;
  description: string;
  tags: string[];
  thumbnailPrompt: string;
  thumbnailOverlayText: string;
}

export async function generateSeoMetadata(
  scriptText: string,
  nicheId: string
): Promise<YoutubeSeoMetadata> {
  const niche = getNicheConfig(nicheId);
  const ai = getGenAIClient();

  const prompt = `
You are an expert YouTube SEO manager. Based on this video script in the '${niche.name}' niche, generate YouTube metadata and thumbnail design:

Script: "${scriptText}"

Return a valid JSON object with the following fields:
{
  "title": string (engaging, high-curiosity title under 60 characters with relevant emoji),
  "description": string (3-sentence engaging summary + social call to action + 5 relevant hashtags like #Shorts #${niche.id}),
  "tags": array of 15 relevant SEO search keyword strings,
  "thumbnail_prompt": string (Imagen 3 prompt for a dramatic, high-contrast hero image),
  "thumbnail_overlay_text": string (2 to 4 words in ALL CAPS for the thumbnail text overlay)
}
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: GENAI_MODELS.TEXT_FLASH,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = JSON.parse(response.text || '{}');
    console.log(`📝 SEO Metadata generated: "${result.title}"`);

    return {
      title: result.title || 'Must-See Story 🏛️',
      description: result.description || '#Shorts #Viral',
      tags: result.tags || ['shorts', nicheId],
      thumbnailPrompt: result.thumbnail_prompt || 'Cinematic dramatic close-up, 16:9 ratio',
      thumbnailOverlayText: result.thumbnail_overlay_text || 'MUST SEE!',
    };
  } catch (error) {
    console.error(`❌ Failed to generate SEO metadata:`, error);
    return {
      title: 'Viral YouTube Short 🚀',
      description: '#Shorts #Viral',
      tags: ['shorts', nicheId],
      thumbnailPrompt: 'High contrast dramatic shot, 16:9 ratio',
      thumbnailOverlayText: 'SHOCKING TRUTH',
    };
  }
}
