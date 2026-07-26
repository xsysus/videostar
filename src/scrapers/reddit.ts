import { NICHE_PORTFOLIO, getNicheConfig } from '../config/niches.js';

export interface ScrapedPost {
  id: string;
  subreddit: string;
  title: string;
  score: number;
  numComments: number;
  url: string;
  permalink: string;
  nicheId: string;
}

export async function fetchRedditPostsForSubreddit(subreddit: string, nicheId: string, limit = 25): Promise<ScrapedPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) VideoStar/1.0',
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ Failed to fetch r/${subreddit}: HTTP ${response.status}`);
      return [];
    }

    const data = (await response.json()) as any;
    const posts: ScrapedPost[] = [];

    if (data?.data?.children) {
      for (const child of data.data.children) {
        const p = child.data;
        // Filter out stickied posts and posts with low upvotes
        if (!p.stickied && p.score >= 500) {
          posts.push({
            id: p.id,
            subreddit: p.subreddit,
            title: p.title,
            score: p.score,
            numComments: p.num_comments,
            url: p.url,
            permalink: `https://reddit.com${p.permalink}`,
            nicheId,
          });
        }
      }
    }

    return posts;
  } catch (error) {
    console.error(`❌ Error scraping r/${subreddit}:`, error);
    return [];
  }
}

export async function fetchNicheTrends(nicheId: string): Promise<ScrapedPost[]> {
  const niche = getNicheConfig(nicheId);
  const allPosts: ScrapedPost[] = [];

  for (const subreddit of niche.subreddits) {
    const posts = await fetchRedditPostsForSubreddit(subreddit, nicheId, 20);
    allPosts.push(...posts);
  }

  // Sort by upvotes descending
  return allPosts.sort((a, b) => b.score - a.score);
}
