import http from 'http';
import url from 'url';
import { getDatabase } from './db/init.js';
import { NICHE_PORTFOLIO } from './config/niches.js';
import crypto from 'crypto';

const PORT = process.env.PORT || 3000;

export function startServer() {
  const db = getDatabase();

  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname || '/';
    const method = req.method || 'GET';

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 1. API: Get pending topics
    if (pathname === '/api/topics' && method === 'GET') {
      const status = parsedUrl.query.status || 'PENDING_APPROVAL';
      const rows = db.prepare('SELECT * FROM topics WHERE status = ? ORDER BY virality_score DESC, created_at DESC').all(status);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, topics: rows }));
      return;
    }

    // 2. API: Approve Topic
    if (pathname.match(/^\/api\/topics\/[^\/]+\/approve$/) && method === 'POST') {
      const parts = pathname.split('/');
      const topicId = parts[3];

      db.prepare("UPDATE topics SET status = 'APPROVED' WHERE id = ?").run(topicId);

      const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId) as any;
      const jobId = `job_${crypto.randomBytes(6).toString('hex')}`;

      if (topic) {
        db.prepare(`
          INSERT INTO video_jobs (id, topic_id, niche, status)
          VALUES (?, ?, ?, 'QUEUED')
        `).run(jobId, topicId, topic.niche);

        // Trigger production pipeline in background
        import('./pipeline.js').then(m => m.processVideoJob(jobId)).catch(err => {
          console.error(`❌ Background video job ${jobId} failed:`, err);
        });
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, jobId, message: `Topic ${topicId} approved and job ${jobId} queued!` }));
      return;
    }

    // 3. API: Reject Topic
    if (pathname.match(/^\/api\/topics\/[^\/]+\/reject$/) && method === 'POST') {
      const parts = pathname.split('/');
      const topicId = parts[3];

      db.prepare("UPDATE topics SET status = 'REJECTED' WHERE id = ?").run(topicId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: `Topic ${topicId} rejected.` }));
      return;
    }

    // 4. API: Create Custom Topic
    if (pathname === '/api/topics/custom' && method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { title, niche } = JSON.parse(body || '{}');
          if (!title || !niche) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Title and niche are required' }));
            return;
          }

          const topicId = `top_${crypto.randomBytes(6).toString('hex')}`;
          const jobId = `job_${crypto.randomBytes(6).toString('hex')}`;

          db.prepare(`
            INSERT INTO topics (id, niche, raw_title, hook_concept, virality_score, status)
            VALUES (?, ?, ?, ?, 100, 'APPROVED')
          `).run(topicId, niche, title, title);

          db.prepare(`
            INSERT INTO video_jobs (id, topic_id, niche, status)
            VALUES (?, ?, ?, 'QUEUED')
          `).run(jobId, topicId, niche);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, topicId, jobId }));
        } catch (e: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    // 5. Dashboard UI HTML Page
    if (pathname === '/' && (method === 'GET' || method === 'HEAD')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(getDashboardHtml());
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 VideoStar Dashboard running at: http://localhost:${PORT}`);
  });
}

function getDashboardHtml(): string {
  const nicheOptions = Object.values(NICHE_PORTFOLIO)
    .map(n => `<option value="${n.id}">${n.name}</option>`)
    .join('');

  return `
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <title>VideoStar - YouTube Automation Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-8">
  <div class="max-w-5xl mx-auto space-y-8">
    
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-slate-800 pb-6">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-amber-400">🎬 VideoStar Control Center</h1>
        <p class="text-slate-400 text-sm mt-1">Human-in-the-Loop Topic Approvals & Production Pipeline</p>
      </div>
      <button onclick="loadTopics()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition">
        🔄 Refresh Topics
      </button>
    </div>

    <!-- Custom Topic Form -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      <h2 class="text-lg font-semibold text-slate-200 mb-4">✍️ Submit Custom Video Topic</h2>
      <form id="customForm" onsubmit="submitCustomTopic(event)" class="flex gap-4">
        <input type="text" id="customTitle" placeholder="e.g. Why Roman Concrete Self-Heals When It Rains" required
               class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400">
        <select id="customNiche" class="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100">
          ${nicheOptions}
        </select>
        <button type="submit" class="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition text-sm">
          Approve & Create Short
        </button>
      </form>
    </div>

    <!-- Candidate Topics List -->
    <div>
      <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
        🔥 Pending Topic Approvals
      </h2>
      <div id="topicsContainer" class="space-y-4">
        <p class="text-slate-500 text-sm">Loading topic suggestions...</p>
      </div>
    </div>

  </div>

  <script>
    async function loadTopics() {
      const res = await fetch('/api/topics?status=PENDING_APPROVAL');
      const data = await res.json();
      const container = document.getElementById('topicsContainer');

      if (!data.topics || data.topics.length === 0) {
        container.innerHTML = \`<div class="p-8 bg-slate-900 rounded-xl text-center text-slate-500 border border-slate-800">
          No pending topic proposals right now. Check back soon or submit a custom topic above!
        </div>\`;
        return;
      }

      container.innerHTML = data.topics.map(t => {
        let analysis = {};
        try { analysis = JSON.parse(t.ai_analysis_json || '{}'); } catch(e) {}
        
        return \`
          <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-6 flex items-start justify-between gap-6 transition">
            <div class="space-y-2 flex-1">
              <div class="flex items-center gap-3">
                <span class="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold rounded-full">
                  Score: \${t.virality_score}/100
                </span>
                <span class="text-xs font-mono text-slate-500 uppercase tracking-wider">\${t.niche}</span>
              </div>
              <h3 class="text-lg font-bold text-slate-100">\${t.raw_title}</h3>
              \${t.hook_concept ? \`<p class="text-sm text-slate-400">💡 <strong>Hook:</strong> "\${t.hook_concept}"</p>\` : ''}
              \${analysis.confidence_reason ? \`<p class="text-xs text-slate-500">🎯 <strong>Why Viral:</strong> \${analysis.confidence_reason}</p>\` : ''}
            </div>
            <div class="flex items-center gap-3">
              <button onclick="approveTopic('\${t.id}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-lg text-sm transition">
                ✓ Approve & Produce
              </button>
              <button onclick="rejectTopic('\${t.id}')" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-sm transition">
                ✕ Reject
              </button>
            </div>
          </div>
        \`;
      }).join('');
    }

    async function approveTopic(id) {
      await fetch(\`/api/topics/\${id}/approve\`, { method: 'POST' });
      loadTopics();
    }

    async function rejectTopic(id) {
      await fetch(\`/api/topics/\${id}/reject\`, { method: 'POST' });
      loadTopics();
    }

    async function submitCustomTopic(e) {
      e.preventDefault();
      const title = document.getElementById('customTitle').value;
      const niche = document.getElementById('customNiche').value;
      await fetch('/api/topics/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, niche })
      });
      document.getElementById('customTitle').value = '';
      loadTopics();
    }

    loadTopics();
  </script>
</body>
</html>
  `;
}

import { fileURLToPath } from 'url';

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}
