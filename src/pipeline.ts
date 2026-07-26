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

  // 2. Parallel Asset Generation (Imagen 3 Visuals + TTS Voiceover)
  console.log(`\n🎨 Step 2: Generating Scene Images & Voiceover Audio...`);
  const [sceneAssets, voiceoverAsset] = await Promise.all([
    generateSceneImages(storyboard.scenes, jobId),
    generateVoiceover(storyboard.full_narration, nicheConfig.voicePreset.voiceId, jobId),
  ]);

  db.prepare("UPDATE video_jobs SET audio_url = ?, word_timestamps_json = ? WHERE id = ?").run(
    voiceoverAsset.audioPath,
    JSON.stringify(voiceoverAsset.timestamps),
    jobId
  );

  // 3. Remotion Video Rendering Engine
  console.log(`\n🎞️ Step 3: Assembling & Rendering Remotion Short MP4...`);
  db.prepare("UPDATE video_jobs SET status = 'RENDERING' WHERE id = ?").run(jobId);

  const remotionProps: RemotionShortProps = {
    theme: nicheConfig.theme,
    voiceoverUrl: voiceoverAsset.audioPath,
    scenes: sceneAssets.map(a => ({
      imageUrl: a.imagePath,
      durationInFrames: a.durationInFrames,
      zoomDirection: a.zoomDirection,
    })),
    words: voiceoverAsset.timestamps,
  };

  const totalFrames = sceneAssets.reduce((sum, a) => sum + a.durationInFrames, 0);
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
