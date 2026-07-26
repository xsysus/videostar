import { getDatabase } from './db/init.js';
import { getNicheConfig } from './config/niches.js';
import { generateStoryboard } from './engine/storyboard.js';
import { generateSceneImages } from './engine/imageGenerator.js';
import { generateVoiceover } from './engine/voiceover.js';
import { renderShortVideo } from './engine/remotionRenderer.js';
import { generateSeoMetadata } from './engine/seoGenerator.js';
import { generateThumbnail } from './engine/thumbnailGenerator.js';
import { uploadVideoToYoutube } from './publisher/youtube.js';
import { RemotionShortProps } from './remotion/MainShortComposition.js';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

function toMediaUrl(filePath: string): string {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:') || filePath.startsWith('file://')) {
    return filePath;
  }
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath);
    const contentStr = content.toString('utf-8', 0, 100).trim();
    if (contentStr.startsWith('<svg') || contentStr.startsWith('<?xml')) {
      return `data:image/svg+xml;base64,${content.toString('base64')}`;
    }
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.png') return `data:image/png;base64,${content.toString('base64')}`;
    if (ext === '.svg') return `data:image/svg+xml;base64,${content.toString('base64')}`;
    if (ext === '.jpg' || ext === '.jpeg') return `data:image/jpeg;base64,${content.toString('base64')}`;
    if (ext === '.mp3') return `data:audio/mp3;base64,${content.toString('base64')}`;
    return pathToFileURL(path.resolve(filePath)).href;
  }
  return filePath;
}

export async function processVideoJob(jobId: string): Promise<void> {
  const db = getDatabase();
  const job = db.prepare('SELECT * FROM video_jobs WHERE id = ?').get(jobId) as any;

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(job.topic_id) as any;
  if (!topic) {
    throw new Error(`Topic ${job.topic_id} not found`);
  }

  console.log(`\n======================================================`);
  console.log(`🎬 STARTING END-TO-END VIDEO PRODUCTION JOB: ${jobId}`);
  console.log(`   Topic: "${topic.raw_title}"`);
  console.log(`   Niche: ${job.niche}`);
  console.log(`======================================================\n`);

  db.prepare("UPDATE video_jobs SET status = 'SCRIPTING' WHERE id = ?").run(jobId);

  // 1. Storyboard & Script Generation (Gemini 1.5 Pro)
  const nicheConfig = getNicheConfig(job.niche);
  const storyboard = await generateStoryboard(
    topic.raw_title,
    job.niche,
    job.language || 'en-US',
    job.tone_style || 'standard'
  );

  db.prepare("UPDATE video_jobs SET status = 'GENERATING_ASSETS', script_json = ? WHERE id = ?").run(
    JSON.stringify(storyboard),
    jobId
  );

  // 2. Asset Generation (TTS Voiceover First -> Word Timestamps -> Visual Scene Generator)
  console.log(`\n🎨 Step 2: Generating Voiceover Audio & Word-Synced Scene Visuals...`);
  const voiceoverAsset = await generateVoiceover(storyboard.full_narration, nicheConfig.voicePreset.voiceId, jobId);

  db.prepare("UPDATE video_jobs SET audio_url = ?, word_timestamps_json = ? WHERE id = ?").run(
    voiceoverAsset.audioPath,
    JSON.stringify(voiceoverAsset.timestamps),
    jobId
  );

  const sceneAssets = await generateSceneImages(storyboard.scenes, jobId, 30, voiceoverAsset.timestamps);

  // Calculate total frames dynamically based on exact voiceover length + 0.5s end padding (15 frames)
  const audioFramesNeeded = Math.ceil((voiceoverAsset.durationSeconds + 0.5) * 30);
  const visualFramesSum = sceneAssets.reduce((sum, a) => sum + a.durationInFrames, 0);

  const totalFrames = Math.max(audioFramesNeeded, visualFramesSum);

  // If visual frames sum is less than totalFrames, extend the last scene to cover the end padding
  if (visualFramesSum < totalFrames && sceneAssets.length > 0) {
    sceneAssets[sceneAssets.length - 1].durationInFrames += (totalFrames - visualFramesSum);
  }

  // 3. Remotion Video Rendering Engine
  console.log(`\n🎞️ Step 3: Assembling & Rendering Remotion Short MP4 (${totalFrames} frames / ${(totalFrames / 30).toFixed(1)}s)...`);
  db.prepare("UPDATE video_jobs SET status = 'RENDERING' WHERE id = ?").run(jobId);

  const remotionProps: RemotionShortProps = {
    theme: nicheConfig.theme,
    voiceoverUrl: toMediaUrl(voiceoverAsset.audioPath),
    scenes: sceneAssets.map(a => ({
      imageUrl: toMediaUrl(a.imagePath),
      durationInFrames: a.durationInFrames,
      zoomDirection: a.zoomDirection,
    })),
    words: voiceoverAsset.timestamps,
  };

  const renderedVideoPath = await renderShortVideo(remotionProps, jobId, totalFrames);

  db.prepare("UPDATE video_jobs SET rendered_video_path = ? WHERE id = ?").run(renderedVideoPath, jobId);

  // 4. SEO Metadata & AI Thumbnail Generation
  console.log(`\n📝 Step 4: Generating SEO Metadata & High-CTR Thumbnail...`);
  const seoMetadata = await generateSeoMetadata(storyboard.full_narration, job.niche);
  const thumbnailPath = await generateThumbnail(
    seoMetadata.thumbnailPrompt,
    seoMetadata.thumbnailOverlayText,
    jobId
  );

  // 5. YouTube Data API Upload
  console.log(`\n📡 Step 5: Publishing & Scheduling Video to YouTube...`);
  const uploadResult = await uploadVideoToYoutube(renderedVideoPath, thumbnailPath, seoMetadata);

  db.prepare(`
    UPDATE video_jobs 
    SET status = 'PUBLISHED', youtube_video_id = ? 
    WHERE id = ?
  `).run(uploadResult.videoId, jobId);

  db.prepare("UPDATE topics SET status = 'PRODUCED' WHERE id = ?").run(topic.id);

  console.log(`\n======================================================`);
  console.log(`🎉 VIDEO PRODUCTION COMPLETE! JOB: ${jobId}`);
  console.log(`   Video URL: ${uploadResult.youtubeUrl}`);
  console.log(`======================================================\n`);
}
