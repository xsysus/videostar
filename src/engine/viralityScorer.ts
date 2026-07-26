import { getGenAIClient, GENAI_MODELS } from '../config/genai.js';
import { getDatabase } from '../db/init.js';
import { ScrapedPost } from '../scrapers/reddit.js';
import crypto from 'crypto';

export interface EvaluatedTopic {
  id: string;
  nicheId: string;
  rawTitle: string;
  viralityScore: number;
  hookConcept: string;
  proposedTitles: string[];
  confidenceReason: string;
}

export function isTopicDuplicate(rawTitle: string): boolean {
  const db = getDatabase();
  const row = db.prepare('SELECT id FROM topics WHERE raw_title = ?').get(rawTitle);
  return !!row;
}

export async function evaluateAndSavePost(post: ScrapedPost): Promise<EvaluatedTopic | null> {
  if (isTopicDuplicate(post.title)) {
    console.log(`⏩ Skipping duplicate topic: "${post.title.substring(0, 40)}..."`);
    return null;
  }

  const ai = getGenAIClient();
  const prompt = `
You are a viral YouTube Shorts producer. Analyze this raw trend post for a 45-second YouTube Short in the '${post.nicheId}' niche.

Post Title: "${post.title}"
Subreddit: r/${post.subreddit}
Upvotes: ${post.score}

Return a valid JSON object with the following fields:
{
  "virality_score": number (1-100),
  "confidence_reason": string,
  "hook_concept": string (1-sentence magnetic hook),
  "proposed_titles": array of 3 strings
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
    const topicId = `top_${crypto.randomBytes(6).toString('hex')}`;

    const db = getDatabase();
    db.prepare(`
      INSERT INTO topics (id, niche, raw_title, hook_concept, virality_score, status, ai_analysis_json)
      VALUES (?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?)
    `).run(
      topicId,
      post.nicheId,
      post.title,
      result.hook_concept || post.title,
      result.virality_score || 70,
      JSON.stringify(result)
    );

    console.log(`✅ Saved Topic [${result.virality_score}/100]: "${post.title.substring(0, 50)}..."`);

    return {
      id: topicId,
      nicheId: post.nicheId,
      rawTitle: post.title,
      viralityScore: result.virality_score || 70,
      hookConcept: result.hook_concept || post.title,
      proposedTitles: result.proposed_titles || [post.title],
      confidenceReason: result.confidence_reason || '',
    };
  } catch (error) {
    console.error(`❌ Failed to evaluate topic with Gemini:`, error);
    return null;
  }
}

export async function processNicheTrends(nicheId: string, limit = 5): Promise<EvaluatedTopic[]> {
  const { fetchNicheTrends } = await import('../scrapers/reddit.js');
  const posts = await fetchNicheTrends(nicheId);
  const results: EvaluatedTopic[] = [];

  for (const post of posts.slice(0, limit)) {
    const evaluated = await evaluateAndSavePost(post);
    if (evaluated) results.push(evaluated);
  }

  return results;
}
