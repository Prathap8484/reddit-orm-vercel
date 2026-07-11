import { db } from '../../src/db/index.js';
import * as schema from '../../src/db/schema.js';
import { desc } from 'drizzle-orm';
import SentimentChart from '../components/SentimentChart.js';

export const dynamic = 'force-dynamic';

function cleanRedditUrl(url: string): string {
  if (!url) return '#';
  
  // If it's a relative URL, make it absolute
  if (url.startsWith('/r/') || url.startsWith('/user/')) {
    return `https://www.reddit.com${url}`;
  }
  
  // Replace old.reddit.com with www.reddit.com
  return url.replace('old.reddit.com', 'www.reddit.com');
}

export default async function Dashboard() {
  const clients = await db.select().from(schema.clients);
  
  // Patched to use the 'logs' table based on schema.ts
  const mentions = await db.select()
    .from(schema.logs)
    .orderBy(desc(schema.logs.timestamp))
    .limit(100);

  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  // Process mentions to derive subreddit and sentiment
  const processedMentions = mentions.map((mention) => {
    // Extract subreddit from URL
    const subredditMatch = mention.postId.match(/\/r\/([^\/]+)/);
    const subreddit = subredditMatch ? `r/${subredditMatch[1]}` : 'r/unknown';

    // Derive sentiment based on engine.ts logic (REJECTED = Negative, else Positive/Neutral)
    let sentiment = 'Neutral';
    let badgeColor = 'bg-slate-500/10 text-slate-400 border-slate-500/20';

    if (mention.content.startsWith('REJECTED:')) {
      sentiment = 'Negative';
      badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      negativeCount++;
    } else if (mention.content.length > 5) { // Assuming generated comments are positive actions
      sentiment = 'Positive';
      badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      positiveCount++;
    } else {
      neutralCount++;
    }

    return { ...mention, subreddit, sentiment, badgeColor, cleanUrl: cleanRedditUrl(mention.postId) };
  });

  const totalMentions = mentions.length;
  const positivePercent = totalMentions > 0 ? Math.round((positiveCount / totalMentions) * 100) : 0;
  const negativePercent = totalMentions > 0 ? Math.round((negativeCount / totalMentions) * 100) : 0;

  const chartData = [
    { name: 'Positive', value: positiveCount, color: '#10b981' }, 
    { name: 'Neutral', value: neutralCount, color: '#94a3b8' },   
    { name: 'Negative', value: negativeCount, color: '#f43f5e' }  
  ].filter(d => d.value > 0);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col gap-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-sm">
              Agency Intelligence
            </h1>
            <p className="text-slate-400 mt-2 text-sm font-medium tracking-wide">Real-time Reddit Brand Mentions</p>
          </div>

          {/* UNIFIED NAVIGATION */}
          <div className="flex gap-4 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <a href="/" className="text-slate-400 font-medium text-sm px-3 py-1 hover:text-white transition-colors">
              Core Tools
            </a>
            <a href="/dashboard" className="text-white font-semibold text-sm bg-white/10 px-3 py-1 rounded-full">
              Analytics Dashboard
            </a>
          </div>
        </header>

        {/* High-Level Metric Ribbon */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl transition-all hover:bg-white/[0.07]">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Mentions</p>
            <div className="text-4xl font-black text-white">{totalMentions}</div>
          </div>
          <div className="bg-emerald-500/5 backdrop-blur-md border border-emerald-500/10 p-6 rounded-2xl shadow-xl transition-all hover:bg-emerald-500/10">
            <p className="text-xs font-bold text-emerald-400/80 uppercase tracking-wider mb-2">Positive Sentiment</p>
            <div className="text-4xl font-black text-emerald-400">{positivePercent}%</div>
          </div>
          <div className="bg-rose-500/5 backdrop-blur-md border border-rose-500/10 p-6 rounded-2xl shadow-xl transition-all hover:bg-rose-500/10">
            <p className="text-xs font-bold text-rose-400/80 uppercase tracking-wider mb-2">Negative Sentiment</p>
            <div className="text-4xl font-black text-rose-400">{negativePercent}%</div>
          </div>
        </section>

        {/* Main Content Area */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Sentiment Breakdown Chart */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl col-span-1 flex flex-col items-center justify-center">
            <h2 className="text-lg font-bold text-white mb-4 self-start tracking-wide">Sentiment Breakdown</h2>
            {totalMentions > 0 ? (
               <SentimentChart data={chartData} />
            ) : (
              <div className="text-sm text-slate-500 flex items-center justify-center h-full">No sentiment data available.</div>
            )}
          </div>

          {/* Recent Mentions Data Table */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl col-span-1 lg:col-span-2 overflow-hidden">
            <div className="px-6 py-5 border-b border-white/10 bg-black/20">
              <h2 className="text-lg font-bold text-white tracking-wide">Recent Mentions Feed</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs text-slate-400 uppercase bg-black/10 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wider">Date</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Subreddit</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Post Title</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Sentiment</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {processedMentions.map((mention) => (
                    <tr key={mention.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                        {mention.timestamp ? new Date(mention.timestamp).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-indigo-400 group-hover:text-indigo-300 transition-colors">
                        {mention.subreddit}
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate" title={mention.content}>
                        {mention.content}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${mention.badgeColor} backdrop-blur-sm shadow-sm`}>
                          {mention.sentiment}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a 
                          href={mention.cleanUrl}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-pink-400 hover:text-pink-300 underline underline-offset-2 transition-colors font-medium"
                        >
                          View Post
                        </a>
                      </td>
                    </tr>
                  ))}
                  {processedMentions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No recent mentions harvested yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
