import { db } from '../src/db/index.js';
import * as schema from '../src/db/schema.js';
import { desc } from 'drizzle-orm';
import SentimentChart from './components/SentimentChart';

export const dynamic = 'force-dynamic';

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
    // Extract subreddit from URL like https://old.reddit.com/r/samsung/...
    const subredditMatch = mention.postId.match(/\/r\/([^\/]+)/);
    const subreddit = subredditMatch ? `r/${subredditMatch[1]}` : 'r/unknown';

    // Derive sentiment based on engine.ts logic (REJECTED = Negative, else Positive/Neutral)
    let sentiment = 'Neutral';
    let badgeColor = 'bg-gray-500/10 text-gray-400 border-gray-500/20';

    if (mention.content.startsWith('REJECTED:')) {
      sentiment = 'Negative';
      badgeColor = 'bg-red-500/10 text-red-400 border-red-500/20';
      negativeCount++;
    } else if (mention.content.length > 5) { // Assuming generated comments are positive actions
      sentiment = 'Positive';
      badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      positiveCount++;
    } else {
      neutralCount++;
    }

    return { ...mention, subreddit, sentiment, badgeColor };
  });

  const totalMentions = mentions.length;
  const positivePercent = totalMentions > 0 ? Math.round((positiveCount / totalMentions) * 100) : 0;
  const negativePercent = totalMentions > 0 ? Math.round((negativeCount / totalMentions) * 100) : 0;

  const chartData = [
    { name: 'Positive', value: positiveCount, color: '#10b981' }, 
    { name: 'Neutral', value: neutralCount, color: '#6b7280' },   
    { name: 'Negative', value: negativeCount, color: '#ef4444' }  
  ].filter(d => d.value > 0);

  return (
    <main className="max-w-7xl mx-auto px-6 py-12 flex flex-col gap-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
            Agency Intelligence
          </h1>
          <p className="text-gray-400 mt-1 text-sm font-medium">Real-time Reddit Brand Mentions</p>
        </div>
      </header>

      {/* High-Level Metric Ribbon */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111827] border border-[#1f2937] p-6 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Mentions</p>
          <div className="text-4xl font-black text-gray-100">{totalMentions}</div>
        </div>
        <div className="bg-emerald-900/10 border border-emerald-500/20 p-6 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-emerald-400/80 uppercase tracking-wider mb-2">Positive Sentiment</p>
          <div className="text-4xl font-black text-emerald-400">{positivePercent}%</div>
        </div>
        <div className="bg-red-900/10 border border-red-500/20 p-6 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-red-400/80 uppercase tracking-wider mb-2">Negative Sentiment</p>
          <div className="text-4xl font-black text-red-400">{negativePercent}%</div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sentiment Breakdown Chart */}
        <div className="bg-[#111827] border border-[#1f2937] p-6 rounded-2xl shadow-sm col-span-1 flex flex-col items-center justify-center">
          <h2 className="text-lg font-bold text-gray-200 mb-4 self-start">Sentiment Breakdown</h2>
          {totalMentions > 0 ? (
             <SentimentChart data={chartData} />
          ) : (
            <div className="text-sm text-gray-500 flex items-center justify-center h-full">No sentiment data available.</div>
          )}
        </div>

        {/* Recent Mentions Data Table */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-2xl shadow-sm col-span-1 lg:col-span-2 overflow-hidden">
          <div className="px-6 py-5 border-b border-[#1f2937] bg-[#0B0F19]/50">
            <h2 className="text-lg font-bold text-gray-200">Recent Mentions Feed</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs text-gray-500 uppercase bg-[#0B0F19]/20 border-b border-[#1f2937]">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Subreddit</th>
                  <th className="px-6 py-4 font-semibold">Post Title</th>
                  <th className="px-6 py-4 font-semibold">Sentiment</th>
                  <th className="px-6 py-4 font-semibold">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]">
                {processedMentions.map((mention) => (
                  <tr key={mention.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {mention.timestamp ? new Date(mention.timestamp).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-purple-400">
                      {mention.subreddit}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate" title={mention.content}>
                      {mention.content}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${mention.badgeColor}`}>
                        {mention.sentiment}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a 
                        href={mention.postId}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline transition-colors"
                      >
                        View Post
                      </a>
                    </td>
                  </tr>
                ))}
                {processedMentions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No recent mentions harvested yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
