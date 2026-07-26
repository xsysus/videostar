import { ENV } from '../config/env.js';
import path from 'path';
import fs from 'fs';

export interface WordTimestamp {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface VoiceoverAsset {
  audioPath: string;
  durationSeconds: number;
  timestamps: WordTimestamp[];
}

// Default ElevenLabs pre-made voices supported across all accounts (including free tier)
const DEFAULT_ELEVENLABS_VOICE_IDS: Record<string, string> = {
  Adam_Docu_Baritone: 'pNInz6obpgDQGcFmaJgB', // Adam
  Rachel_Warm_Storyteller: '21m00Tcm4TlvDq8ikWAM', // Rachel
  Josh_Upbeat_Tech: 'pNInz6obpgDQGcFmaJgB', // Adam
  Marcus_Corporate_Narrator: 'ErXwobaYiN019PkySvjV', // Antoni
  Orion_Space_Narrator: 'AZnzlk1XvdvUeBnXmlld', // Domi
  Tactical_Baritone_Command: 'pNInz6obpgDQGcFmaJgB', // Adam
  Gritt_Survival_Voice: 'ErXwobaYiN019PkySvjV', // Antoni
  Nova_Science_Voice: 'EXAVITQu4vr4xnSDxMaL', // Bella
};

function resolveElevenLabsVoiceId(inputVoiceId: string): string {
  if (DEFAULT_ELEVENLABS_VOICE_IDS[inputVoiceId]) {
    return DEFAULT_ELEVENLABS_VOICE_IDS[inputVoiceId];
  }
  if (inputVoiceId && inputVoiceId.length === 20 && !inputVoiceId.includes('_')) {
    return inputVoiceId;
  }
  return 'pNInz6obpgDQGcFmaJgB'; // Default Adam voice
}

export async function generateVoiceover(
  scriptText: string,
  rawVoiceId: string,
  jobId: string
): Promise<VoiceoverAsset> {
  const outputDir = path.join(process.cwd(), 'data', 'assets', jobId, 'audio');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const audioPath = path.join(outputDir, 'narration.mp3');
  const voiceId = resolveElevenLabsVoiceId(rawVoiceId);

  // Check if ElevenLabs API key is present
  if (ENV.ELEVENLABS_API_KEY && ENV.ELEVENLABS_API_KEY !== 'your_elevenlabs_api_key_here') {
    try {
      console.log(`🎙️ Calling ElevenLabs API (Voice ID: ${voiceId})...`);
      
      // Try with timestamps endpoint first
      let response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ENV.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: scriptText,
          model_id: 'eleven_multilingual_v2',
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        const audioBuffer = Buffer.from(data.audio_base64, 'base64');
        fs.writeFileSync(audioPath, audioBuffer);

        const timestamps: WordTimestamp[] = (data.alignment?.characters || []).reduce(
          (acc: WordTimestamp[], char: string, idx: number) => {
            const startTime = data.alignment.character_start_times_seconds[idx];
            const endTime = data.alignment.character_end_times_seconds[idx];

            if (acc.length === 0 || char === ' ' || acc[acc.length - 1].word.endsWith(' ')) {
              acc.push({ word: char, start: startTime, end: endTime });
            } else {
              acc[acc.length - 1].word += char;
              acc[acc.length - 1].end = endTime;
            }
            return acc;
          },
          []
        ).map((item: WordTimestamp) => ({
          word: item.word.trim(),
          start: item.start,
          end: item.end,
        })).filter((item: WordTimestamp) => item.word.length > 0);

        const durationSeconds = timestamps.length > 0 ? timestamps[timestamps.length - 1].end : 45;
        console.log(`✅ ElevenLabs Voiceover generated (${timestamps.length} words, ${durationSeconds.toFixed(1)}s audio)`);

        return { audioPath, durationSeconds, timestamps };
      }

      // Fallback to standard TTS endpoint if with-timestamps API returns 404/400/402
      console.log(`⚠️ ElevenLabs with-timestamps status ${response.status}, trying standard TTS endpoint...`);
      response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ENV.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: scriptText,
          model_id: 'eleven_multilingual_v2',
        }),
      });

      if (response.ok) {
        const audioBuffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(audioPath, audioBuffer);

        const words = scriptText.split(/\s+/).filter(w => w.length > 0);
        const wordsPerSecond = 2.8;
        let currentTime = 0.2;

        const timestamps: WordTimestamp[] = words.map(word => {
          const wordDuration = Math.max(0.2, (word.length / 5) * (1 / wordsPerSecond));
          const start = currentTime;
          const end = currentTime + wordDuration;
          currentTime = end + 0.08;
          return { word, start, end };
        });

        console.log(`✅ ElevenLabs Voiceover MP3 generated!`);
        return { audioPath, durationSeconds: currentTime, timestamps };
      } else {
        const errText = await response.text();
        console.warn(`⚠️ ElevenLabs API error ${response.status}: ${errText}`);
      }
    } catch (e: any) {
      console.warn(`⚠️ ElevenLabs API failed: ${e.message}`);
    }
  }

  // Fallback mode for local testing without ElevenLabs API key
  console.log(`🎙️ Generating estimated word timestamps for local audio test...`);
  const words = scriptText.split(/\s+/).filter(w => w.length > 0);
  const wordsPerSecond = 2.8;
  let currentTime = 0.2;

  const timestamps: WordTimestamp[] = words.map(word => {
    const wordDuration = Math.max(0.2, (word.length / 5) * (1 / wordsPerSecond));
    const start = currentTime;
    const end = currentTime + wordDuration;
    currentTime = end + 0.08; // subtle gap between words
    return { word, start, end };
  });

  return {
    audioPath: '', // Return empty audioPath when live TTS is not configured
    durationSeconds: currentTime,
    timestamps,
  };
}
