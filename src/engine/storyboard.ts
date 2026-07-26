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

  try {
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

    const response = await ai.models.generateContent({
      model: GENAI_MODELS.TEXT_FLASH,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = JSON.parse(response.text || '{}') as StoryboardResult;
    if (result.scenes && result.scenes.length > 0) {
      console.log(`🎬 Storyboard generated via Gemini for "${topicTitle.substring(0, 40)}..." (${result.scenes.length} scenes)`);
      return result;
    }
  } catch (error) {
    console.warn(`⚠️ Gemini API error or offline mode, generating fallback storyboard:`, (error as any).message);
  }

  // Fallback Storyboard Generator for offline / test pipeline
  return createFallbackStoryboard(topicTitle, nicheId, language, toneStyle);
}

function createFallbackStoryboard(
  topicTitle: string,
  nicheId: string,
  language: string,
  toneStyle: string
): StoryboardResult {
  const fullNarration = `Did you know ${topicTitle}? For centuries, scientists and historians were baffled by how this was even possible. The secret lies in a fascinating chemical reaction that researchers only recently uncovered under advanced microscopes. When rainwater seeps in, it activates hidden mineral crystals, causing them to dissolve, expand, and automatically seal damage. This incredible natural process makes the structure virtually indestructible!`;

  return {
    title: topicTitle,
    target_duration_seconds: 45,
    niche: nicheId,
    language,
    tone_style: toneStyle,
    full_narration: fullNarration,
    scenes: [
      {
        scene_number: 1,
        narration_segment: `Did you know ${topicTitle}?`,
        duration_seconds: 4.5,
        imagen_prompt: `Cinematic dramatic close-up shot of ${topicTitle}, golden hour lighting, 9:16 vertical frame, 8k resolution`,
        motion_type: 'zoom_in',
      },
      {
        scene_number: 2,
        narration_segment: 'For centuries, scientists and historians were baffled by how this was even possible.',
        duration_seconds: 4.0,
        imagen_prompt: 'Historical researchers inspecting ancient ruins in atmospheric sunlight, 9:16 vertical photorealistic',
        motion_type: 'pan_left',
      },
      {
        scene_number: 3,
        narration_segment: 'The secret lies in a fascinating chemical reaction that researchers only recently uncovered under advanced microscopes.',
        duration_seconds: 4.5,
        imagen_prompt: 'Macro shot of glowing mineral crystals under a high-tech microscope, neon blue accents, 9:16 frame',
        motion_type: 'zoom_out',
      },
      {
        scene_number: 4,
        narration_segment: 'When rainwater seeps in, it activates hidden mineral crystals, causing them to dissolve, expand, and automatically seal damage.',
        duration_seconds: 4.5,
        imagen_prompt: 'Water droplets seeping into microscopic stone cracks causing a sparkling self-repairing chemical glow, 9:16 vertical frame',
        motion_type: 'pan_right',
      },
      {
        scene_number: 5,
        narration_segment: 'This incredible natural process makes the structure virtually indestructible!',
        duration_seconds: 4.5,
        imagen_prompt: 'Epic wide angle vertical view of an unbreakable ancient monument standing strong under stormy skies, 8k resolution',
        motion_type: 'zoom_in',
      },
    ],
  };
}
