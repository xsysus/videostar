import { initializeDatabase, getDatabase } from '../db/init.js';
import { processNicheTrends, evaluateAndSavePost } from '../engine/viralityScorer.js';
import { processVideoJob } from '../pipeline.js';
import crypto from 'crypto';

async function runSmokeTest() {
  console.log(`\n======================================================`);
  console.log(`🧪 STARTING VIDEOSTAR END-TO-END SMOKE TEST`);
  console.log(`======================================================\n`);

  // Step 1: Initialize DB
  console.log(`▶ Step 1: Initializing Database...`);
  initializeDatabase();
  const db = getDatabase();

  // Step 2: Create / Evaluate a Test Candidate Topic
  console.log(`\n▶ Step 2: Creating Test Candidate Topic...`);
  const testTopicId = `smoke_${crypto.randomBytes(4).toString('hex')}`;
  const testTitle = "Why Roman Concrete Lasted 2,000 Years";
  const niche = "ancient_history";

  db.prepare(`
    INSERT INTO topics (id, niche, raw_title, hook_concept, virality_score, status)
    VALUES (?, ?, ?, ?, 95, 'PENDING_APPROVAL')
  `).run(testTopicId, niche, testTitle, "Did you know 2,000-year-old Roman buildings repair themselves when it rains?");

  console.log(`✅ Candidate Topic Created: [ID: ${testTopicId}] "${testTitle}"`);

  // Step 3: Simulate 1-Click User Approval
  console.log(`\n▶ Step 3: Simulating 1-Click Human Approval...`);
  db.prepare("UPDATE topics SET status = 'APPROVED' WHERE id = ?").run(testTopicId);

  const jobId = `job_smoke_${crypto.randomBytes(4).toString('hex')}`;
  db.prepare(`
    INSERT INTO video_jobs (id, topic_id, niche, status)
    VALUES (?, ?, ?, 'QUEUED')
  `).run(jobId, testTopicId, niche);

  console.log(`✅ Topic Approved! Created Production Job [ID: ${jobId}]`);

  // Step 4: Run End-to-End Production Pipeline
  console.log(`\n▶ Step 4: Running Full Production Pipeline (Script -> Audio -> Visuals -> Remotion Render -> SEO -> Publish)...`);
  await processVideoJob(jobId);

  // Step 5: Verify Final Output
  console.log(`\n▶ Step 5: Verifying Job Results...`);
  const finalJob = db.prepare('SELECT * FROM video_jobs WHERE id = ?').get(jobId) as any;

  console.log(`\n======================================================`);
  console.log(`📊 SMOKE TEST VERIFICATION RESULTS:`);
  console.log(`   • Job ID: ${finalJob.id}`);
  console.log(`   • Job Status: ${finalJob.status}`);
  console.log(`   • Rendered MP4 Path: ${finalJob.rendered_video_path}`);
  console.log(`   • YouTube Video ID: ${finalJob.youtube_video_id}`);
  console.log(`======================================================\n`);

  if (finalJob.status === 'PUBLISHED' && finalJob.rendered_video_path) {
    console.log(`🎉 ALL CHECKS PASSED! END-TO-END SMOKE TEST SUCCESSFUL!`);
  } else {
    console.error(`❌ Smoke test failed: job status is ${finalJob.status}`);
    process.exit(1);
  }
}

runSmokeTest().catch((err) => {
  console.error(`❌ Smoke test encountered an error:`, err);
  process.exit(1);
});
