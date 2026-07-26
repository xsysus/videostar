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

export async function generateVoiceover(
  scriptText: string,
  voiceId: string,
  jobId: string
): Promise<VoiceoverAsset> {
  const outputDir = path.join(process.cwd(), 'data', 'assets', jobId, 'audio');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const audioPath = path.join(outputDir, 'narration.mp3');

  // Check if ElevenLabs API key is present
  if (ENV.ELEVENLABS_API_KEY) {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`, {
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
        console.log(`🎙️ ElevenLabs Voiceover generated (${timestamps.length} words, ${durationSeconds.toFixed(1)}s)`);

        return { audioPath, durationSeconds, timestamps };
      }
    } catch (e: any) {
      console.warn(`⚠️ ElevenLabs API failed, using fallback synthesizer: ${e.message}`);
    }
  }

  // Fallback voiceover synthesizer for testing / offline mode
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

  const durationSeconds = currentTime;
  // Write a silent / simple MP3 stub if audio file doesn't exist
  fs.writeFileSync(audioPath, Buffer.alloc(1024));

  return {
    audioPath,
    durationSeconds,
    timestamps,
  };
}
