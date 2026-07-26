import { getGenAIClient, GENAI_MODELS } from '../config/genai.js';
import { getNicheConfig } from '../config/niches.js';

export interface StoryboardScene {
  scene_number: number;
  narration_segment: string;
  duration_seconds: number;
  imagen_prompt: string;
  motion_type: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right';
}

export interface StoryboardResult {
  title: string;
  target_duration_seconds: number;
  niche: string;
  language: string;
  tone_style: string;
  full_narration: string;
  scenes: StoryboardScene[];
}

export async function generateStoryboard(
  topicTitle: string,
  nicheId: string,
  language = 'en-US',
  toneStyle = 'standard'
): Promise<StoryboardResult> {
  const niche = getNicheConfig(nicheId);
  const ai = getGenAIClient();

  const prompt = `
You are an elite YouTube Shorts director and scriptwriter.
Create a high-retention 45-second YouTube Short script (approx 120-140 words total) in target language '${language}' for the topic below.

Topic: "${topicTitle}"
Niche Category: "${niche.name}"
Tone Style: "${toneStyle === 'standard' ? niche.voicePreset.toneDescription : toneStyle}"

CRITICAL RULES:
1. The first sentence MUST be a magnetic, curiosity-gap hook within the first 1.5 seconds.
2. Break the script into 10 to 12 distinct visual scenes (approx 3-5 seconds each).
3. For EVERY scene, craft a highly detailed, cinematic Imagen 3 visual prompt optimized for a 9:16 vertical video. Style: photorealistic, 8k resolution, dramatic lighting.

Return a valid JSON object strictly adhering to this schema:
{
  "title": string,
  "target_duration_seconds": 45,
  "niche": "${nicheId}",
  "language": "${language}",
  "tone_style": "${toneStyle}",
  "full_narration": string,
  "scenes": [
    {
      "scene_number": number,
      "narration_segment": string,
      "duration_seconds": number,
      "imagen_prompt": string,
      "motion_type": "zoom_in" | "zoom_out" | "pan_left" | "pan_right"
    }
  ]
}
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: GENAI_MODELS.TEXT_PRO,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = JSON.parse(response.text || '{}') as StoryboardResult;
    console.log(`🎬 Storyboard generated for "${topicTitle.substring(0, 40)}..." (${result.scenes?.length || 0} scenes)`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to generate storyboard:`, error);
    throw error;
  }
}
